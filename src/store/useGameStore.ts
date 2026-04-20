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

const INITIAL_STATS: Stats = {
  STR: 0, DEX: 0, TGH: 0, INT: 0, WIL: 0, AWA: 0, INF: 0
};

const INITIAL_STATE: GameState = {
  version: '2.0',
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
        // Extract only the GameState data, not the actions
        const { setGameState, addHistory, resetGame, saveGame, loadGame, ...data } = state;
        await window.electronAPI.saveGame(`${name}.json`, data);
      },
      loadGame: async (name) => {
        const data = await window.electronAPI.loadGame(name);
        if (data) {
          set(data);
        }
      },
    }),
    {
      name: 'grim-echoes-game',
    }
  )
);
