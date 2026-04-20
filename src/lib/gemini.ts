import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GameState } from "../types/game";

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
2. Tone: Oppressive, dramatic, witty, grimdark.
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

export async function processGameTurn(apiKey: string, action: string, currentState: GameState) {
  const ai = new GoogleGenAI({ apiKey });
  
  // Construct context
  const context = `
Current Operative: ${currentState.archetype}
Difficulty: ${currentState.difficulty}
Motivation: ${currentState.motivation}
Stats: ${JSON.stringify(currentState.stats)}
HP: ${currentState.hp.current}/${currentState.hp.max}
Skills: ${currentState.skills.join(', ')}
Talents: ${currentState.talents.join(', ')}
Inventory: ${currentState.gear.join(', ')}
Companion: ${currentState.companion.name} (Loyalty: ${currentState.companion.loyalty})
Chapter: ${currentState.chapter}
Last Scene Summary: ${currentState.last_scene_summary}

Player Action: ${action}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [{ role: 'user', parts: [{ text: context }] }],
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

export async function generateSpeech(apiKey: string, text: string, voice: string = 'Kore') {
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

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
}
