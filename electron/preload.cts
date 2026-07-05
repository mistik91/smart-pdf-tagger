import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  openProject: () => ipcRenderer.invoke('project:open') as Promise<{ canceled: boolean; filePath?: string; text?: string }>,
  saveProject: (payload: { filePath?: string; text: string; suggestedName: string }) =>
    ipcRenderer.invoke('project:save', payload) as Promise<{ canceled: boolean; filePath?: string }>,
  saveProjectAs: (payload: { text: string; suggestedName: string }) =>
    ipcRenderer.invoke('project:saveAs', payload) as Promise<{ canceled: boolean; filePath?: string }>,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
