import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Settings } from "../types/game";

interface SettingsState extends Settings {
  setApiKey: (key: string) => void;
  setTheme: (theme: Settings["theme"]) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setNarratorVoice: (voice: string) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setMusicVolume: (volume: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey:
        typeof process !== "undefined" &&
        process.env &&
        process.env.GEMINI_API_KEY
          ? process.env.GEMINI_API_KEY
          : "",
      theme: "grimdark",
      fontSize: 16,
      fontFamily: "Inter",
      audioEnabled: false,
      narratorVoice: "Kore",
      musicEnabled: false,
      musicVolume: 0.4,
      setApiKey: (apiKey) => set({ apiKey }),
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
      setNarratorVoice: (narratorVoice) => set({ narratorVoice }),
      setMusicEnabled: (musicEnabled) => set({ musicEnabled }),
      setMusicVolume: (musicVolume) => set({ musicVolume }),
    }),
    {
      name: "grim-echoes-settings",
    },
  ),
);
