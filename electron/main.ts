import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs/promises';

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: "Grim Echoes: 40K Solo",
    backgroundColor: '#121212',
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for File I/O
ipcMain.handle('save-game', async (_, filename: string, data: string) => {
  const savePath = path.join(app.getPath('userData'), 'saves');
  await fs.mkdir(savePath, { recursive: true });
  await fs.writeFile(path.join(savePath, filename), data);
  return { success: true };
});

ipcMain.handle('list-saves', async () => {
  const savePath = path.join(app.getPath('userData'), 'saves');
  try {
    await fs.mkdir(savePath, { recursive: true });
    const files = await fs.readdir(savePath);
    return files.filter(f => f.endsWith('.json'));
  } catch {
    return [];
  }
});

ipcMain.handle('load-save', async (_, filename: string) => {
  const savePath = path.join(app.getPath('userData'), 'saves');
  const data = await fs.readFile(path.join(savePath, filename), 'utf-8');
  return JSON.parse(data);
});
