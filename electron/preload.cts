import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  openProject: () => ipcRenderer.invoke('project:open') as Promise<{ canceled: boolean; filePath?: string; text?: string }>,
  openProjectPath: (filePath: string) =>
    ipcRenderer.invoke('project:openPath', filePath) as Promise<{ canceled: boolean; filePath?: string; text?: string }>,
  saveProject: (payload: { filePath?: string; text: string; suggestedName: string }) =>
    ipcRenderer.invoke('project:save', payload) as Promise<{ canceled: boolean; filePath?: string }>,
  saveProjectAs: (payload: { text: string; suggestedName: string }) =>
    ipcRenderer.invoke('project:saveAs', payload) as Promise<{ canceled: boolean; filePath?: string }>,
  getAppVersion: () => ipcRenderer.invoke('app:getVersion') as Promise<string>,
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates') as Promise<{ status: string; currentVersion?: string; latestVersion?: string }>,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
