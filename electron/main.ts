import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

const isDev = process.env.ELECTRON_DEV_SERVER_URL !== undefined;
const releasesApiUrl = 'https://api.github.com/repos/mistik91/smart-pdf-tagger/releases/latest';

interface LatestRelease {
  version: string;
  url: string;
}

const normalizeVersion = (value: string) => value.trim().replace(/^v/i, '');

const compareVersions = (left: string, right: string) => {
  const leftParts = normalizeVersion(left).split('.').map(part => Number.parseInt(part, 10) || 0);
  const rightParts = normalizeVersion(right).split('.').map(part => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (diff !== 0) return diff;
  }

  return 0;
};

const getLatestRelease = async (): Promise<LatestRelease | null> => {
  const response = await fetch(releasesApiUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Smart-PDF-Tagger',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub release check failed (${response.status}).`);
  }

  const release = await response.json() as { tag_name?: string; html_url?: string; draft?: boolean; prerelease?: boolean };
  if (!release.tag_name || release.draft || release.prerelease) return null;

  return {
    version: normalizeVersion(release.tag_name),
    url: release.html_url || 'https://github.com/mistik91/smart-pdf-tagger/releases/latest',
  };
};

const downloadUpdateWithFallback = async (releaseUrl: string) => {
  try {
    const { autoUpdater } = await import('electron-updater');
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    await autoUpdater.checkForUpdates();
    await autoUpdater.downloadUpdate();
  } catch (error) {
    console.warn('Update download failed:', error);
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'Update Download Failed',
      message: 'The in-app updater could not start the download.',
      detail: 'Open the GitHub release page to download the installer manually.',
      buttons: ['Open Release Page', 'Cancel'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      await shell.openExternal(releaseUrl);
    }
  }
};

const checkForUpdates = async (mode: 'startup' | 'manual') => {
  if (isDev || !app.isPackaged) {
    if (mode === 'manual') {
      await dialog.showMessageBox({
        type: 'info',
        title: 'Update Check Unavailable',
        message: 'Update checks are only available in packaged desktop builds.',
      });
    }
    return { status: 'unavailable' };
  }

  try {
    const latestRelease = await getLatestRelease();
    const currentVersion = app.getVersion();

    if (!latestRelease || compareVersions(latestRelease.version, currentVersion) <= 0) {
      if (mode === 'manual') {
        await dialog.showMessageBox({
          type: 'info',
          title: 'No Updates Available',
          message: `Smart PDF Tagger ${currentVersion} is up to date.`,
        });
      }
      return { status: 'none', currentVersion };
    }

    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `Smart PDF Tagger ${latestRelease.version} is available.`,
      detail: `You are currently running ${currentVersion}. Download the update now?`,
      buttons: ['Download Update', 'Open Release Page', 'Not Now'],
      defaultId: 0,
      cancelId: 2,
    });

    if (result.response === 0) {
      await downloadUpdateWithFallback(latestRelease.url);
    }
    if (result.response === 1) {
      await shell.openExternal(latestRelease.url);
    }

    return { status: 'available', currentVersion, latestVersion: latestRelease.version };
  } catch (error) {
    console.warn('Update check failed:', error);
    if (mode === 'manual') {
      await dialog.showMessageBox({
        type: 'warning',
        title: 'Update Check Failed',
        message: 'Could not check GitHub Releases for updates.',
        detail: error instanceof Error ? error.message : 'Unknown update check error.',
      });
    }
    return { status: 'error' };
  }
};

const checkForUpdatesOnStartup = async () => {
  if (isDev || !app.isPackaged) return;

  const { autoUpdater } = await import('electron-updater');
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', error => {
    console.warn('Update check failed:', error);
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
    checkForUpdates('startup').catch(error => {
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
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);

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

ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('app:checkForUpdates', () => checkForUpdates('manual'));
