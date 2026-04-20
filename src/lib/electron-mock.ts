// Mock electronAPI for browser preview
if (typeof window !== 'undefined' && !window.electronAPI) {
  (window as any).electronAPI = {
    saveGame: async (name: string, data: any) => {
      console.log('Mock Save:', name, data);
      localStorage.setItem(`save_${name}`, JSON.stringify(data));
      return { success: true };
    },
    loadGame: async (name: string) => {
      console.log('Mock Load:', name);
      const data = localStorage.getItem(`save_${name}`);
      return data ? JSON.parse(data) : null;
    },
    listSaves: async () => {
      console.log('Mock List Saves');
      return Object.keys(localStorage)
        .filter(key => key.startsWith('save_'))
        .map(key => key.replace('save_', ''));
    }
  };
}
