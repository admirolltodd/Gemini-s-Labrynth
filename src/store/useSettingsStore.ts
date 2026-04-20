import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Settings } from '../types/game';

interface SettingsState extends Settings {
  setApiKey: (key: string) => void;
  setTheme: (theme: Settings['theme']) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: '',
      theme: 'grimdark',
      fontSize: 16,
      fontFamily: 'Inter',
      setApiKey: (apiKey) => set({ apiKey }),
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
    }),
    {
      name: 'grim-echoes-settings',
    }
  )
);
