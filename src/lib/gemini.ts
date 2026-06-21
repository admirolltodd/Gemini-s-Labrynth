import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GameState, Stats } from "../types/game";

const SYSTEM_PROMPT_HEADER = `
You are the elite Game Master for "Grim Echoes: 40K Solo". 
Your role is to provide a deep, immersive, and lore-accurate Warhammer 40,000 narrative experience.

STRICT OUTPUT FORMAT:
You MUST respond ONLY with a valid JSON object. No markdown, no preamble.
JSON Schema:
{
  "narrative": "2-4 vivid sentences describing the scene and outcome of the last action. This should ONLY be descriptive narration.",
  "dialogue": "A short line of spoken dialogue from a character (often the companion or a key NPC) if appropriate for the scene. Otherwise null.",
  "dialogue_speaker": "The name of the character speaking the dialogue. Otherwise null.",
  "choices": {
    "A": "Option A text",
    "B": "Option B text",
    "C": "Option C text",
    "D": "Option D text"
  },
  "roll_log": "[ROLL] Action: '...' Check: <Stat> + <Bonus> vs DC <Target> Roll: 1d20 + <Bonus> = <Total> -> Success/Failure",
  "state_updates": {
    "hp_change": number,
    "xp_gain": number,
    "loyalty_change": number,
    "corruption_gain": number,
    "credits_change": number,
    "inventory_add": ["item name"],
    "inventory_remove": ["item name"],
    "chapter_update": "string or null",
    "active_threats_update": ["threat name"]
  }
}

RULES:
1. Follow the Warhammer 40,000 Solo RPG v2.0 rules strictly.
2. Tone: Oppressive, dramatic, and grimdark, yet punctuated by moments of epic scale. Describe environments with the grand majesty found in classic 40k art: ruined gothic spires piercing through war-smoke, golden sunlight illuminating battle-scarred Space Marines, massive celestial bodies looming over Tyranid swarms, and the sheer awe-inspiring scale of the Emperor's wars.
3. Dialogue: When the player interacts with an NPC or their companion, use the 'dialogue' and 'dialogue_speaker' fields. Do NOT put dialogue in the 'narrative' field if it is a major line.
4. Companion Choices: Loyalty and Personality MUST influence choice generation:
   - Loyalty >= 70 (Devoted/Loyal): At least one choice should be a specialized tactical recommendation or unique support action from the companion (e.g., "[Name]'s Tactical Strike").
   - Loyalty <= 30 (Disgruntled/Insubordinate): At least one choice should reflect friction, reluctance, or the need to spend resources/INF to command them.
   - Personality: A "Death Cult Assassin" companion will suggest lethal options; a "Tech-Priest" will suggest mechanical solutions.
5. Every scene must offer exactly 4 choices (A/B/C/D).
6. Perform all dice rolls yourself using the format in the roll_log.
7. Difficulty Targets (DC): Narrative (8-20), Balanced (10-22), Grimdark (12-24).
8. Criticals: Nat-20 is auto-success + bonus. Nat-1 is auto-fail + complication.
9. Complications: Use them on failures to keep the story moving.

[WARHAMMER 40,000 SOLO RPG DOCUMENT]
# WARHAMMER 40,000 SOLO RPG — LLM EDITION v2.0
◼ GM QUICK REFERENCE
Core loop: Narrate (2–4 sentences) -> Offer 4 choices -> Roll dice when needed -> STOP.
Roll format: [ROLL] Action: "" Check: <Stat> + <Bonus> vs DC <Target> Roll: 1d20 + <Bonus> = <Total> → Success / Failure
Stats: STR / DEX / TGH / INT / WIL / AWA / INF
HP: 10 + TGH | Skill bonus: +2
Difficulty Targets:
| Mode      | Easy | Standard | Hard | Lethal |
|-----------|------|----------|------|--------|
| Narrative | 8    | 12       | 16   | 20     |
| Balanced  | 10   | 14       | 18   | 22     |
| Grimdark  | 12   | 16       | 20   | 24     |

◼ COMPANION & LOYALTY
Loyalty (0–100). 80+ Devoted, 60-79 Loyal, 40-59 Neutral, 20-39 Disgruntled, <20 Insubordinate.

◼ TALENTS
Duelist's Flourish, Relentless Advance, Deadeye, Brutal Swing, Silver Tongue, Intimidating Presence, Black Market Savvy, Mechanicus Adept, Tough as Nails, Street Survivor.

◼ XP & PROGRESSION
Easy: 5 XP, Standard: 10 XP, Hard: 15 XP, Milestone: 25+ XP.
Raise Stat: New Value x 3 XP. Skill: 10 XP. Talent: 15 XP.
`;

export async function processGameTurn(
  apiKey: string,
  action: string,
  currentState: GameState,
) {
  const ai = new GoogleGenAI({ apiKey });

  // Construct context
  const context = `
Current Operative: ${currentState.archetype}
Difficulty: ${currentState.difficulty}
Motivation: ${currentState.motivation}
Stats: ${JSON.stringify(currentState.stats)}
HP: ${currentState.hp.current}/${currentState.hp.max}
Skills: ${currentState.skills.join(", ")}
Talents: ${currentState.talents.join(", ")}
Inventory: ${currentState.gear.join(", ")}
Companion: ${currentState.companion.name} (Loyalty: ${currentState.companion.loyalty})
Chapter: ${currentState.chapter}
Last Scene Summary: ${currentState.last_scene_summary}

Player Action: ${action}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [{ role: "user", parts: [{ text: context }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT_HEADER,
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("Gemini Turn Error:", error);
    throw error;
  }
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
