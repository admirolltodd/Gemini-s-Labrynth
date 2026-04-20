import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  saveGame: (filename: string, data: string) => ipcRenderer.invoke('save-game', filename, data),
  listSaves: () => ipcRenderer.invoke('list-saves'),
  loadSave: (filename: string) => ipcRenderer.invoke('load-save', filename),
  isElectron: true,
});
