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

export interface Companion {
  name: string;
  description: string;
  loyalty: number;
}

export interface GameState {
  version: string;
  archetype: Archetype | '';
  difficulty: Difficulty | '';
  motivation: string;
  setting: string;
  stats: Stats;
  hp: { current: number; max: number };
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
  history: { role: 'user' | 'ai'; content: string; narrative?: string; choices?: Record<string, string> }[];
  portrait?: string;
}

export interface Settings {
  apiKey: string;
  theme: 'light' | 'dark' | 'grimdark';
  fontSize: number;
  fontFamily: string;
}
