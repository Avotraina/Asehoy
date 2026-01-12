import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// ESM __dirname / __filename shim
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let projectionWindow: BrowserWindow | null = null;
const dataRoot = path.join(app.getAppPath(), 'data', 'baiboly');

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173/index.html');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createProjectionWindow(): void {
  projectionWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    projectionWindow.loadURL('http://localhost:5173/projection.html');
  } else {
    projectionWindow.loadFile(path.join(__dirname, 'renderer/projection.html'));
  }

  projectionWindow.on('closed', () => {
    projectionWindow = null;
  });
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle IPC communication for verse updates
ipcMain.on('verse-update', (_event, data: { verse: string; version: string; reference?: string }) => {
  // Send verse update to projection window
  if (projectionWindow && !projectionWindow.isDestroyed()) {
    projectionWindow.webContents.send('verse-update', data);
  }
});

// Forward projection commands from main renderer to projection window and wait for response
ipcMain.handle('projection-command', async (_event, cmd: string) => {
  if (!projectionWindow || projectionWindow.isDestroyed()) return false;

  // send command to projection
  projectionWindow.webContents.send('projection-command', cmd);

  // wait for a single reply from projection renderer (with timeout)
  return await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => resolve(false), 500);
    ipcMain.once('projection-reply', (_e, data: { cmd: string; handled: boolean }) => {
      if (data && data.cmd === cmd) {
        clearTimeout(timeout);
        resolve(Boolean(data.handled));
      }
    });
  });
});

ipcMain.handle('open-projection', async (_event, data: { verse: string; version: string; reference?: string }) => {
  if (!projectionWindow || projectionWindow.isDestroyed()) {
    createProjectionWindow();
  }

  if (!projectionWindow) return;

  if (projectionWindow.webContents.isLoading()) {
    projectionWindow.webContents.once('did-finish-load', () => {
      projectionWindow?.webContents.send('verse-update', data);
    });
  } else {
    projectionWindow.webContents.send('verse-update', data);
  }
});

ipcMain.handle('list-books', async () => {
  const buildEntries = (dirName: 'Testameta taloha' | 'Testameta vaovao', testament: 'taloha' | 'vaovao') => {
    const fullDir = path.join(dataRoot, dirName);
    if (!fs.existsSync(fullDir)) return [];
    return fs
      .readdirSync(fullDir)
      .filter((f) => f.endsWith('.json'))
      .map((file) => {
        const name = file.replace('.json', '').replace(/-/g, ' ');
        const label = name
          .split(' ')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
        return {
          id: `${dirName}/${file}`, // full relative path
          label,
          testament,
        };
      });
  };

  return [
    ...buildEntries('Testameta taloha', 'taloha'),
    ...buildEntries('Testameta vaovao', 'vaovao'),
  ];
});

ipcMain.handle('read-book', async (_event, bookId: string) => {
  const filePath = path.join(dataRoot, bookId);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
});

ipcMain.handle('close-projection', () => {
  if (projectionWindow && !projectionWindow.isDestroyed()) {
    projectionWindow.close();
  }
});

