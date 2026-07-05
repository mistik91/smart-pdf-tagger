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

interface ElectronUpdateCheckResult {
  status: string;
  currentVersion?: string;
  latestVersion?: string;
}

interface ElectronAPI {
  openProject: () => Promise<ElectronProjectOpenResult>;
  openProjectPath: (filePath: string) => Promise<ElectronProjectOpenResult>;
  saveProject: (payload: { filePath?: string; text: string; suggestedName: string }) => Promise<ElectronProjectSaveResult>;
  saveProjectAs: (payload: { text: string; suggestedName: string }) => Promise<ElectronProjectSaveResult>;
  getAppVersion: () => Promise<string>;
  checkForUpdates: () => Promise<ElectronUpdateCheckResult>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
