export type Archetype = 
  | 'Guardsman Veteran' 
  | 'Exiled Psyker' 
  | 'Hive Ganger' 
  | 'Rogue Trader Scion' 
  | 'Penitent Sister' 
  | 'Tech-Priest Initiate' 
  | 'Criminal Conscript' 
  | 'Civilian Survivor'
  | 'Inquisitorial Acolyte'
  | 'Death Cult Assassin'
  | 'Skitarii Vanguard'
  | 'Redemptionist Zealot';

export type Difficulty = 'Narrative' | 'Balanced' | 'Grimdark';

export interface Stats {
  STR: number;
  DEX: number;
  TGH: number;
  INT: number;
  WIL: number;
  AWA: number;
  INF: number;
}

export type StatKey = keyof Stats;

export interface Companion {
  name: string;
  description: string;
  loyalty: number;
}

// A carried weapon. maxAmmo === 0 denotes a melee weapon (no rounds).
export interface Weapon {
  name: string;
  ammo: number;
  maxAmmo: number;
}

// A skill check attached to a choice. The GM proposes it; the game engine
// rolls it client-side (lib/dice.ts) so the dice are honest.
export interface Check {
  stat: StatKey;
  skill: string | null;   // one of the operative's skills if it applies, else null
  dc: number;
}

export type RollOutcome = 'crit-success' | 'success' | 'failure' | 'crit-failure';

// A fully resolved engine roll. Kept on the history entry so the scroll can
// show the die and the campaign log can record the exact outcome.
export interface RollResult {
  die: number;
  stat: StatKey;
  statValue: number;
  skill: string | null;
  skillBonus: number;
  fatiguePenalty: number;
  total: number;
  dc: number;
  outcome: RollOutcome;
}

// One ultra-compact record per player turn, persisted for the life of the
// campaign. Used to give the AI long-term memory of past decisions. Optional
// fields are omitted when zero/empty to keep the JSON tiny.
export interface CampaignLogEntry {
  t: number;            // turn number
  ch?: string;          // chapter
  act: string;          // the player's decision (truncated)
  roll?: '✓' | '✗';     // roll outcome, if a check happened
  xp?: number;          // xp gained
  cor?: number;         // corruption gained
  hp?: number;          // hp change
  loy?: number;         // companion loyalty change
  got?: string[];       // items acquired
  mood?: 'L' | 'D';     // light / dark leaning of the choice
  fact?: string;        // one-line consequence written by the GM
}

// Long-term narrative memory. Maintained from the GM's per-turn
// chronicle_update and rendered to markdown (lib/chronicle.ts) for every
// prompt and for export.
export interface Chronicle {
  persons: { name: string; note: string; t: number }[];  // NPCs and their current standing
  threads: { text: string; t: number }[];                // unresolved plot hooks
  vows: { text: string; t: number }[];                   // promises, debts, oaths
}

export interface GameState {
  version: string;
  name: string;
  archetype: Archetype | '';
  difficulty: Difficulty | '';
  motivation: string;
  setting: string;
  stats: Stats;
  hp: { current: number; max: number };
  fatigue: number;          // 0–4 tier (exertion / sleeplessness / blood loss)
  afflictions: string[];    // active status effects (Bleeding, Concussed, Poisoned…)
  weapons: Weapon[];        // tracked arsenal with ammo
  skills: string[];
  talents: string[];
  gear: string[];
  credits: number;
  xp: { total: number; unspent: number };
  corruption: number;
  companion: Companion;
  chapter: string;
  last_scene_summary: string;
  active_threats: string[];
  campaignLog: CampaignLogEntry[];
  chronicle: Chronicle;
  history: {
    role: 'user' | 'ai'; 
    content: string; 
    narrative?: string; 
    choices?: Record<string, string>;
    checks?: Record<string, Check | null>;   // per-choice checks proposed by the GM
    roll?: RollResult;                        // engine roll behind a player choice
    dialogue?: { speaker: string; text: string } | null;
  }[];
  portrait?: string;
}

export interface Settings {
  apiKey: string;
  theme: 'light' | 'dark' | 'grimdark';
  fontSize: number;
  fontFamily: string;
  audioEnabled: boolean;
  narratorVoice: string;
  musicEnabled: boolean;
  musicVolume: number;
}
