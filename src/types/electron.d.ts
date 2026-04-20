export interface IElectronAPI {
  saveGame: (name: string, data: any) => Promise<{ success: boolean }>;
  loadGame: (name: string) => Promise<any>;
  listSaves: () => Promise<string[]>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
