import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

const isDev = process.env.ELECTRON_DEV_SERVER_URL !== undefined;

const createWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: 'Smart PDF Tagger',
    backgroundColor: '#0f1518',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    await mainWindow.loadURL(process.env.ELECTRON_DEV_SERVER_URL!);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(path.join(appRoot, 'dist', 'index.html'));
  }
};

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('project:open', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Open Smart PDF Tagger Project',
    properties: ['openFile'],
    filters: [
      { name: 'Smart PDF Tagger Project', extensions: ['json'] },
      { name: 'JSON', extensions: ['json'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  const text = await readFile(filePath, 'utf8');
  return { canceled: false, filePath, text };
});

ipcMain.handle('project:save', async (_event, payload: { filePath?: string; text: string; suggestedName: string }) => {
  let targetPath = payload.filePath;

  if (!targetPath) {
    const result = await dialog.showSaveDialog({
      title: 'Save Smart PDF Tagger Project',
      defaultPath: payload.suggestedName,
      filters: [
        { name: 'Smart PDF Tagger Project', extensions: ['json'] },
        { name: 'JSON', extensions: ['json'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    targetPath = result.filePath;
  }

  await writeFile(targetPath, payload.text, 'utf8');
  return { canceled: false, filePath: targetPath };
});

ipcMain.handle('project:saveAs', async (_event, payload: { text: string; suggestedName: string }) => {
  const result = await dialog.showSaveDialog({
    title: 'Save Smart PDF Tagger Project As',
    defaultPath: payload.suggestedName,
    filters: [
      { name: 'Smart PDF Tagger Project', extensions: ['json'] },
      { name: 'JSON', extensions: ['json'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  await writeFile(result.filePath, payload.text, 'utf8');
  return { canceled: false, filePath: result.filePath };
});
