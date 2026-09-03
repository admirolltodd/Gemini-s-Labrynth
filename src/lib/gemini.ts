import { GoogleGenAI, Type, Modality, ApiError, type Schema } from "@google/genai";
import { GameState, Stats, CampaignLogEntry, RollResult } from "../types/game";
import { PROMPT_TIMELINE_LIMIT, renderChronicle } from "./chronicle";
import { formatRollForModel, isSuccess } from "./dice";

// Free-tier Gemini models, tried in order. A model that is retired (404),
// rate-limited (429), or refused for this key (403) falls through to the
// next. Each model has its own free quota, so the fallback also stretches
// the daily limit. Pro models are not on the free tier; keep this to Flash.
export const TURN_MODELS = ["gemini-3-flash-preview", "gemini-2.5-flash"] as const;

// Build one ultra-compact log record from a completed turn. Pure data derived
// from the action + the engine roll + the model's own state_updates.
export function buildCampaignEntry(
  turnNumber: number,
  action: string,
  chapter: string,
  result: any,
  roll?: RollResult,
): CampaignLogEntry {
  const u = (result && result.state_updates) || {};
  const rollText: string = (result && result.roll_log) || "";
  const entry: CampaignLogEntry = {
    t: turnNumber,
    act: action.length > 72 ? action.slice(0, 69) + "…" : action,
  };
  if (chapter) entry.ch = chapter;
  if (roll) entry.roll = isSuccess(roll.outcome) ? "✓" : "✗";
  else if (/->\s*success|→\s*success|\bsuccess\b/i.test(rollText)) entry.roll = "✓";
  else if (/->\s*fail|→\s*fail|\bfail/i.test(rollText)) entry.roll = "✗";
  if (u.xp_gain) entry.xp = u.xp_gain;
  if (u.corruption_gain) entry.cor = u.corruption_gain;
  if (u.hp_change) entry.hp = u.hp_change;
  if (u.loyalty_change) entry.loy = u.loyalty_change;
  if (Array.isArray(u.inventory_add) && u.inventory_add.length) entry.got = u.inventory_add;
  if (u.corruption_gain > 0) entry.mood = "D";
  else if (u.loyalty_change > 0) entry.mood = "L";
  const fact = result?.chronicle_update?.fact;
  if (typeof fact === "string" && fact.trim()) entry.fact = fact.trim().slice(0, 160);
  return entry;
}

const SYSTEM_PROMPT_HEADER = `
You are the elite Game Master for "Grim Echoes: 40K Solo". 
Your role is to provide a deep, immersive, and lore-accurate Warhammer 40,000 narrative experience.

STRICT OUTPUT FORMAT:
Respond ONLY with a single JSON object matching the enforced schema. Field meanings:
- narrative: 2-4 vivid sentences describing the scene and the outcome of the last action. Descriptive narration ONLY.
- dialogue / dialogue_speaker: a short spoken line from a character (often the companion or a key NPC) and who says it, or null.
- choices: exactly four options, A-D.
- checks: for EACH choice, the skill check it will provoke, or null if the choice carries no risk. Attach a check to any choice whose outcome is uncertain: stat = the governing stat, skill = one of the operative's LISTED skills if it applies (else null), dc = a value from the active difficulty's tier table (Easy/Standard/Hard/Lethal). Aim for at least two risky choices per scene.
- roll_log: ONLY when you adjudicate a custom action with the RAW D20 (rule 6). Otherwise null.
- state_updates: mechanical deltas (hp_change, xp_gain, loyalty_change, corruption_gain, credits_change, fatigue_change, inventory_add/remove, chapter_update, active_threats_update, afflictions_add/remove, weapons_update).
- chronicle_update: the operative's memory (rule 10).

RULES:
1. Follow the Warhammer 40,000 Solo RPG v2.0 rules strictly.
2. Tone: COLD, UNCOMPROMISING, UNFORGIVING grimdark survival-horror. The galaxy is hostile and indifferent; the Emperor does not save fools. Be visceral and grounded — describe wounds, exhaustion, fear, the stink of promethium and blood. Hope is rare and earned. Never soften consequences; a reckless action gets the operative maimed or killed. Spend awe sparingly — when it lands (a Titan's shadow, a cathedral of bone), it should feel vast and terrible, not heroic.
3. Dialogue: When the player interacts with an NPC or their companion, use the 'dialogue' and 'dialogue_speaker' fields. Do NOT put dialogue in the 'narrative' field if it is a major line.
4. Companion Choices: Loyalty and Personality MUST influence choice generation:
   - Loyalty >= 70 (Devoted/Loyal): At least one choice should be a specialized tactical recommendation or unique support action from the companion (e.g., "[Name]'s Tactical Strike").
   - Loyalty <= 30 (Disgruntled/Insubordinate): At least one choice should reflect friction, reluctance, or the need to spend resources/INF to command them.
   - Personality: A "Death Cult Assassin" companion will suggest lethal options; a "Tech-Priest" will suggest mechanical solutions.
5. Every scene must offer exactly 4 choices (A/B/C/D), each with its 'checks' entry (a check object or null).
6. DICE: NEVER roll dice yourself. The game engine rolls.
   - When the player action carries an ENGINE-RESOLVED CHECK, narrate exactly that outcome. Success means the operative achieves what they attempted. Failure means they do not, and it costs them. Critical success grants a tangible bonus; critical failure adds a complication. Never contradict, soften, or re-roll it. Leave roll_log null.
   - When a custom action carries a RAW D20 and the action is risky, adjudicate it: pick stat/skill/DC from the tier table, add the operative's modifiers (stat value; +2 if they have the skill; -2 on STR/DEX/TGH at fatigue 3+), compare to the DC, and report it in roll_log EXACTLY as: [ROLL] Check: <STAT> + <Skill> vs DC <n> Roll: 1d20 (<die>) + <mods> = <total> → Success|Failure|Critical Success|Critical Failure. A raw 20 is a Critical Success and a raw 1 a Critical Failure regardless of total. If the action needs no check, leave roll_log null and ignore the die.
7. Complications: Use them on failures to keep the story moving.
8. Difficulty Targets (DC): Narrative (8-20), Balanced (10-22), Grimdark (12-24). See the tier table below.
9. SURVIVAL SIMULATION (use the state_updates fields):
   - AMMO: Ranged attacks expend rounds. When a tracked weapon is fired, return the FULL current 'weapons' array in 'weapons_update' with the firing weapon's 'ammo' reduced (realistically: a burst spends several rounds). Empty weapons (ammo 0) cannot fire — force a reload, melee, or scavenge. Reflect reloads and looted ammo here too. Melee weapons have maxAmmo 0 and never consume ammo.
   - FATIGUE: 'fatigue_change' (positive = more tired) tracks exertion, blood loss, and sleeplessness on a 0–4 tier. Sustained combat, running, or wounds raise it; rest lowers it (negative). At Tier 3+ the operative is exhausted — impose penalties and reflect it in the narrative.
   - AFFLICTIONS: Use 'afflictions_add' / 'afflictions_remove' for concrete, persistent status effects (e.g., "Bleeding", "Concussed", "Poisoned", "Broken Arm", "Warp-Sickness"). Apply them when wounds or hazards warrant, and let them shape later scenes until treated.
   - Keep these consistent with the narrative — never deplete ammo or inflict an affliction without describing it.
10. MEMORY: The CHRONICLE section of the context is the operative's persistent memory and it is canon. Refer to recorded persons by name with their recorded standing, let unresolved threads resurface and pay off, honour kept vows and punish broken ones, and never contradict the timeline. Fill 'chronicle_update' every turn:
   - fact: one line (max 20 words) recording what materially changed this turn (a wound, a betrayal, a discovery, a death), or null for an uneventful beat.
   - persons: NPCs introduced this turn or whose standing changed — name plus a one-line note of their current attitude and role. Reuse recorded names exactly.
   - threads_add: new unresolved hooks (a pursuer, a locked door, an unpaid debt).
   - threads_resolve: recorded threads closed this turn — copy their recorded text verbatim.
   - vows_add: promises, debts, or oaths the operative made.

[WH40K SOLO RPG v2.0 — MECHANICS REFERENCE]
Stats: STR/DEX/TGH/INT/WIL/AWA/INF. HP = 10 + TGH. Skill bonus: +2.
DC by tier (Easy/Standard/Hard/Lethal): Narrative 8/12/16/20 · Balanced 10/14/18/22 · Grimdark 12/16/20/24.
Loyalty (0-100): 80+ Devoted, 60-79 Loyal, 40-59 Neutral, 20-39 Disgruntled, <20 Insubordinate.
XP awards: Easy 5, Standard 10, Hard 15, Milestone 25+. Costs: Raise Stat = NewValue×3, Skill 10, Talent 15.
`;

// Response schema enforced by the API (constrained decoding), so a Flash model
// can't drift from the contract the way a prompt-only JSON mode can.
const STAT_KEYS = ["STR", "DEX", "TGH", "INT", "WIL", "AWA", "INF"];
const stringList: Schema = { type: Type.ARRAY, items: { type: Type.STRING } };
const checkSchema: Schema = {
  type: Type.OBJECT,
  nullable: true,
  description: "The skill check this choice provokes, or null for a safe / roleplay choice.",
  properties: {
    stat: { type: Type.STRING, enum: STAT_KEYS },
    skill: { type: Type.STRING, nullable: true, description: "One of the operative's listed skills if it applies, else null." },
    dc: { type: Type.INTEGER, description: "Difficulty from the active tier table." },
  },
  required: ["stat", "skill", "dc"],
};
const TURN_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    narrative: { type: Type.STRING },
    dialogue: { type: Type.STRING, nullable: true },
    dialogue_speaker: { type: Type.STRING, nullable: true },
    choices: {
      type: Type.OBJECT,
      properties: { A: { type: Type.STRING }, B: { type: Type.STRING }, C: { type: Type.STRING }, D: { type: Type.STRING } },
      required: ["A", "B", "C", "D"],
    },
    checks: {
      type: Type.OBJECT,
      properties: { A: checkSchema, B: checkSchema, C: checkSchema, D: checkSchema },
      required: ["A", "B", "C", "D"],
    },
    roll_log: { type: Type.STRING, nullable: true },
    state_updates: {
      type: Type.OBJECT,
      properties: {
        hp_change: { type: Type.INTEGER },
        xp_gain: { type: Type.INTEGER },
        loyalty_change: { type: Type.INTEGER },
        corruption_gain: { type: Type.INTEGER },
        credits_change: { type: Type.INTEGER },
        fatigue_change: { type: Type.INTEGER },
        inventory_add: stringList,
        inventory_remove: stringList,
        chapter_update: { type: Type.STRING, nullable: true },
        active_threats_update: stringList,
        afflictions_add: stringList,
        afflictions_remove: stringList,
        weapons_update: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { name: { type: Type.STRING }, ammo: { type: Type.INTEGER }, maxAmmo: { type: Type.INTEGER } },
            required: ["name", "ammo", "maxAmmo"],
          },
        },
      },
    },
    chronicle_update: {
      type: Type.OBJECT,
      properties: {
        fact: { type: Type.STRING, nullable: true },
        persons: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { name: { type: Type.STRING }, note: { type: Type.STRING } },
            required: ["name", "note"],
          },
        },
        threads_add: stringList,
        threads_resolve: stringList,
        vows_add: stringList,
      },
    },
  },
  required: ["narrative", "choices", "checks", "state_updates", "chronicle_update"],
  propertyOrdering: ["narrative", "dialogue", "dialogue_speaker", "choices", "checks", "roll_log", "state_updates", "chronicle_update"],
};

// How many prior history entries to send as rolling context (≈3 turns).
const HISTORY_WINDOW = 6;

// Compact one-line stat encoding: "STR:3 DEX:4 TGH:3 ..." (cheaper than JSON.stringify).
function encodeStats(stats: GameState["stats"]): string {
  return Object.entries(stats)
    .map(([k, v]) => `${k}:${v}`)
    .join(" ");
}

// Build a short transcript of recent turns so the model has continuity
// without resending the entire game. Player actions are prefixed with ">".
function buildRecentHistory(history: GameState["history"]): string {
  if (!history || history.length === 0) return "";
  const recent = history.slice(-HISTORY_WINDOW);
  const lines = recent.map((entry) => {
    if (entry.role === "user") {
      return `> ${entry.content}`;
    }
    let line = entry.content;
    if (entry.dialogue && entry.dialogue.text) {
      line += ` [${entry.dialogue.speaker || "Voice"}: "${entry.dialogue.text}"]`;
    }
    return line;
  });
  return lines.join("\n");
}

function errorStatus(e: unknown): number | undefined {
  if (e instanceof ApiError) return e.status;
  const s = (e as { status?: unknown } | null)?.status;
  return typeof s === "number" ? s : undefined;
}

// Free-tier quota exhausted (per-minute or per-day).
export function isRateLimitError(e: unknown): boolean {
  if (errorStatus(e) === 429) return true;
  return /\b429\b|RESOURCE_EXHAUSTED|quota/i.test(String((e as Error | null)?.message ?? e));
}

// Errors worth trying the next model for: retired model, quota, key not
// allowed for this model. Anything else (bad key, malformed JSON) is final.
function isFallbackError(e: unknown): boolean {
  const status = errorStatus(e);
  if (status === 404 || status === 403 || status === 429) return true;
  return isRateLimitError(e) || /\b(404|403)\b|not found|PERMISSION_DENIED/i.test(String((e as Error | null)?.message ?? e));
}

function normalizeTurn(result: any) {
  if (!result || typeof result.narrative !== "string" || !result.choices) {
    throw new Error("The Game Master returned a malformed response.");
  }
  result.state_updates ??= {};
  result.checks ??= {};
  result.chronicle_update ??= {};
  return result;
}

export interface TurnOptions {
  roll?: RollResult;   // engine-resolved check behind a tagged choice
  rawDie?: number;     // engine-rolled d20 the GM may use to adjudicate a custom action
}

export async function processGameTurn(
  apiKey: string,
  action: string,
  currentState: GameState,
  opts: TurnOptions = {},
) {
  const ai = new GoogleGenAI({ apiKey });

  const recentHistory = buildRecentHistory(currentState.history);
  // Long-term memory goes in EVERY turn. The timeline is capped; persons,
  // threads and vows are small and always complete.
  const chronicle = renderChronicle(currentState, { timelineLimit: PROMPT_TIMELINE_LIMIT });

  let actionBlock = `Player Action: ${action}`;
  if (opts.roll) {
    actionBlock += `\n${formatRollForModel(opts.roll)}`;
  } else if (opts.rawDie !== undefined) {
    actionBlock += `\nRAW D20 (engine-rolled; use it only if this action requires a check, per rule 6): ${opts.rawDie}`;
  }

  // Construct context
  const context = `
Current Operative: ${currentState.archetype}
Difficulty: ${currentState.difficulty}
Motivation: ${currentState.motivation}
Stats: ${encodeStats(currentState.stats)}
HP: ${currentState.hp.current}/${currentState.hp.max}
Fatigue: ${currentState.fatigue ?? 0}/4
Afflictions: ${(currentState.afflictions || []).join(", ") || "None"}
Arsenal: ${(currentState.weapons || []).map((w) => w.maxAmmo > 0 ? `${w.name} ${w.ammo}/${w.maxAmmo}` : `${w.name} (melee)`).join(", ") || "Unarmed"}
Skills: ${currentState.skills.join(", ")}
Talents: ${currentState.talents.join(", ")}
Inventory: ${currentState.gear.join(", ")}
Companion: ${currentState.companion.name} (Loyalty: ${currentState.companion.loyalty})
Chapter: ${currentState.chapter}

CHRONICLE (persistent memory — canon; reference it, never contradict it):
${chronicle}
${recentHistory ? `Recent Events (oldest to newest):\n${recentHistory}` : `Last Scene Summary: ${currentState.last_scene_summary}`}

${actionBlock}
  `;

  let lastError: unknown;
  for (const model of TURN_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: context }] }],
        config: {
          systemInstruction: SYSTEM_PROMPT_HEADER,
          responseMimeType: "application/json",
          responseSchema: TURN_SCHEMA,
        },
      });
      return normalizeTurn(JSON.parse(response.text || "{}"));
    } catch (error) {
      if (!isFallbackError(error)) {
        console.error("Gemini Turn Error:", error);
        throw error;
      }
      console.warn(`Gemini model ${model} unavailable, trying next:`, error);
      lastError = error;
    }
  }
  console.error("Gemini Turn Error: every model failed", lastError);
  throw lastError;
}

export async function generateSpeech(
  apiKey: string,
  text: string,
  voice: string = "Kore",
) {
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice as any },
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
}

export interface QuickStartCharacter {
  name: string;
  archetype: string;
  backstory: string;
  motivation: string;
  stats: Stats;
  skills: string[];
  talents: string[];
}

const FALLBACK_CHARACTERS: QuickStartCharacter[] = [
  {
    name: "Kaelen Voss",
    archetype: "Hive Ganger",
    backstory:
      "Born in the sumps of Necromunda, Kaelen learned early that a blade speaks louder than words. He escaped the underhive after a gang war left him the sole survivor of his crew.",
    motivation: "Survival",
    stats: { STR: 3, DEX: 4, TGH: 3, INT: 1, WIL: 2, AWA: 2, INF: 1 },
    skills: ["Stealth", "Athletics", "Intimidation"],
    talents: ["Street Survivor"],
  },
  {
    name: "Sister Ignatia",
    archetype: "Penitent Sister",
    backstory:
      "Once a proud Retributor, Ignatia's squad was wiped out due to her tactical hesitation. She now seeks redemption through holy fire and unwavering conviction.",
    motivation: "Faith",
    stats: { STR: 2, DEX: 2, TGH: 3, INT: 2, WIL: 5, AWA: 1, INF: 1 },
    skills: ["Lore", "Medicae", "Intimidation"],
    talents: ["Tough as Nails"],
  },
  {
    name: "Orellius Tyche",
    archetype: "Rogue Trader Scion",
    backstory:
      "The disgraced third son of a wealthy trading dynasty. Orellius was exiled after a bad deal with a xenos corsair cost the family a lucrative charter.",
    motivation: "Power",
    stats: { STR: 1, DEX: 2, TGH: 1, INT: 3, WIL: 3, AWA: 2, INF: 4 },
    skills: ["Charm", "Barter", "Deception"],
    talents: ["Silver Tongue"],
  },
  {
    name: "Cade Stryker",
    archetype: "Guardsman Veteran",
    backstory:
      "A hardened survivor of the Cadia's fall. Cade lost his regiment and his home, keeping only his lasgun and a burning hatred for the Ruinous Powers.",
    motivation: "Vengeance",
    stats: { STR: 3, DEX: 3, TGH: 4, INT: 2, WIL: 2, AWA: 1, INF: 1 },
    skills: ["Athletics", "Survival", "Perception"],
    talents: ["Deadeye"],
  },
  {
    name: "Xerxas-9",
    archetype: "Tech-Priest Initiate",
    backstory:
      "A relatively low-ranking Enginseer who uncovered a dangerous scrapcode fragment. His superiors ordered him executed, forcing him to flee into the fringe sectors.",
    motivation: "Curiosity",
    stats: { STR: 2, DEX: 1, TGH: 2, INT: 5, WIL: 4, AWA: 1, INF: 1 },
    skills: ["Tech-Use", "Lore", "Investigation"],
    talents: ["Mechanicus Adept"],
  },
  {
    name: "Vaelia",
    archetype: "Exiled Psyker",
    backstory:
      "Vaelia's powers manifested late, and she narrowly escaped the Black Ships. She now lives in hiding, struggling to control the whispers of the Warp.",
    motivation: "Survival",
    stats: { STR: 1, DEX: 2, TGH: 1, INT: 3, WIL: 5, AWA: 3, INF: 1 },
    skills: ["Coercion", "Scrutiny", "Stealth"],
    talents: ["Intimidating Presence"],
  },
];

function getRandomFallbacks(): QuickStartCharacter[] {
  const shuffled = [...FALLBACK_CHARACTERS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}

export async function generatePrebuiltCharacters(
  apiKey: string,
): Promise<QuickStartCharacter[]> {
  if (!apiKey) {
    console.log("No API Key, using fallback characters.");
    return getRandomFallbacks();
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Generate exactly 3 unique, diverse Warhammer 40,000 character pre-builds for a solo RPG.
    Each must have:
    - name: A lore-accurate name.
    - archetype: One of ["Guardsman Veteran", "Exiled Psyker", "Hive Ganger", "Rogue Trader Scion", "Penitent Sister", "Tech-Priest Initiate", "Criminal Conscript", "Civilian Survivor"].
    - backstory: 2-3 atmospheric sentences describing their origin.
    - motivation: One of ["Faith", "Vengeance", "Curiosity", "Survival", "Power"].
    - stats: Allocate exactly 16 points among STR, DEX, TGH, INT, WIL, AWA, INF (min 1 each).
    - skills: 3 unique skills from ["Athletics", "Intimidation", "Stealth", "Piloting", "Sleight of Hand", "Tech-Use", "Medicae", "Lore", "Coercion", "Scrutiny", "Survival", "Investigation", "Perception", "Barter", "Deception", "Charm"].
    - talents: 1 talent from ["Duelist's Flourish", "Relentless Advance", "Deadeye", "Brutal Swing", "Silver Tongue", "Intimidating Presence", "Black Market Savvy", "Mechanicus Adept", "Tough as Nails", "Street Survivor"].

    STRICT JSON OUTPUT FORMAT:
    [
      { "name": "...", "archetype": "...", "backstory": "...", "motivation": "...", "stats": { "STR": 1... }, "skills": ["...", "...", "..."], "talents": ["..."] },
      ...
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "[]";
    const cleanText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const result = JSON.parse(cleanText);

    // Safety check just in case the model returns an empty array or bad structure
    if (!Array.isArray(result) || result.length === 0 || !result[0].name) {
      throw new Error("Invalid output format from model.");
    }

    return result;
  } catch (error) {
    console.error("Gemini Pre-build Error, using fallbacks:", error);
    return getRandomFallbacks();
  }
}
