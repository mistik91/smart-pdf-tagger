import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

const isDev = process.env.ELECTRON_DEV_SERVER_URL !== undefined;

const checkForUpdatesOnStartup = async () => {
  if (isDev || !app.isPackaged) return;

  const { autoUpdater } = await import('electron-updater');
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', error => {
    console.warn('Update check failed:', error);
  });

  autoUpdater.on('update-available', async updateInfo => {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `Smart PDF Tagger ${updateInfo.version} is available.`,
      detail: 'Download the update now? You can keep working while it downloads.',
      buttons: ['Download Update', 'Not Now'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      autoUpdater.downloadUpdate().catch(error => {
        console.warn('Update download failed:', error);
      });
    }
  });

  autoUpdater.on('update-downloaded', async () => {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'A new Smart PDF Tagger update has been downloaded.',
      detail: 'Restart the app to install it now, or keep working and the update will install when you close the app.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(error => {
      console.warn('Update check failed:', error);
    });
  }, 3000);
};

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

app.whenReady().then(async () => {
  await createWindow();
  await checkForUpdatesOnStartup();
});

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

ipcMain.handle('project:openPath', async (_event, filePath: string) => {
  if (path.extname(filePath).toLowerCase() !== '.json') {
    throw new Error('Recent project must be a JSON file.');
  }
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
