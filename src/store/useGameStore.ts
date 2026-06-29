import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameState, Stats } from '../types/game';

interface GameStore extends GameState {
  setGameState: (state: Partial<GameState>) => void;
  addHistory: (entry: GameState['history'][0]) => void;
  resetGame: () => void;
  saveGame: (name: string) => Promise<void>;
  loadGame: (name: string) => Promise<void>;
}

const SAVES_KEY = 'grim-echoes-saves-v2';

type SaveSlot = GameState & { savedAt: string };

function readSaves(): Record<string, SaveSlot> {
  try {
    return JSON.parse(localStorage.getItem(SAVES_KEY) || '{}');
  } catch {
    return {};
  }
}

export function listSaves(): Array<{ name: string; savedAt: string; archetype: string }> {
  const saves = readSaves();
  return Object.entries(saves).map(([key, slot]) => ({
    name: slot.name || key,
    savedAt: slot.savedAt,
    archetype: slot.archetype,
  }));
}

export function deleteSave(name: string): void {
  const saves = readSaves();
  delete saves[name];
  localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
}

const INITIAL_STATS: Stats = {
  STR: 0, DEX: 0, TGH: 0, INT: 0, WIL: 0, AWA: 0, INF: 0
};

const INITIAL_STATE: GameState = {
  version: '2.0',
  name: '',
  archetype: '',
  difficulty: '',
  motivation: '',
  setting: '',
  stats: INITIAL_STATS,
  hp: { current: 10, max: 10 },
  skills: [],
  talents: [],
  gear: [],
  credits: 50,
  xp: { total: 0, unspent: 0 },
  corruption: 0,
  companion: { name: '', description: '', loyalty: 50 },
  chapter: '',
  last_scene_summary: '',
  active_threats: [],
  campaignLog: [],
  history: [],
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,
      setGameState: (state) => set((prev) => ({ ...prev, ...state })),
      addHistory: (entry) => set((prev) => ({ history: [...prev.history, entry] })),
      resetGame: () => set(INITIAL_STATE),
      saveGame: async (name) => {
        const state = get();
        const { setGameState, addHistory, resetGame, saveGame, loadGame, ...data } = state;
        const saves = readSaves();
        saves[name] = { ...data, savedAt: new Date().toISOString() };
        localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
      },
      loadGame: async (name) => {
        const saves = readSaves();
        const slot = saves[name];
        if (slot) {
          const { savedAt, ...data } = slot;
          set({ ...INITIAL_STATE, ...data });
        }
      },
    }),
    {
      name: 'grim-echoes-game',
    }
  )
);
