/// <reference types="vite/client" />

interface ElectronProjectOpenResult {
  canceled: boolean;
  filePath?: string;
  text?: string;
}

interface ElectronProjectSaveResult {
  canceled: boolean;
  filePath?: string;
}

interface ElectronAPI {
  openProject: () => Promise<ElectronProjectOpenResult>;
  saveProject: (payload: { filePath?: string; text: string; suggestedName: string }) => Promise<ElectronProjectSaveResult>;
  saveProjectAs: (payload: { text: string; suggestedName: string }) => Promise<ElectronProjectSaveResult>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
