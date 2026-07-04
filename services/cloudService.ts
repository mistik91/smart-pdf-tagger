import { ICloudProvider, CloudProjectMetadata, ProjectData, CloudUser } from '../types';
import { PublicClientApplication } from "@azure/msal-browser";

/**
 * BROWSER STORAGE PROVIDER (Simulated Cloud)
 * Uses LocalStorage to mimic a remote server. 
 * Allows users to test the "Cloud" workflow without API keys.
 */
export class BrowserCloudProvider implements ICloudProvider {
  name = "Browser Storage";
  private STORAGE_KEY_PREFIX = "smart_tagger_cloud_";

  isAuthenticated() {
    return true; // Always logged in to local storage
  }

  getUser() {
    return { name: "Local User", email: "local@device" };
  }

  async login() {
    // No-op
    return Promise.resolve();
  }

  async logout() {
    // No-op
    return Promise.resolve();
  }

  async listProjects(): Promise<CloudProjectMetadata[]> {
    const projects: CloudProjectMetadata[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_KEY_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const data = JSON.parse(raw) as ProjectData;
            projects.push({
              id: data.id,
              name: data.name,
              updatedAt: data.updatedAt,
              size: raw.length
            });
          }
        } catch (e) {
          console.warn("Failed to parse local project", key);
        }
      }
    }
    return Promise.resolve(projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
  }

  async saveProject(project: ProjectData): Promise<void> {
    const key = `${this.STORAGE_KEY_PREFIX}${project.id}`;
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      localStorage.setItem(key, JSON.stringify(project));
    } catch (e) {
      throw new Error("Storage quota exceeded. Browser storage is limited (~5MB). For large PDFs, use real cloud storage.");
    }
  }

  async loadProject(projectId: string): Promise<ProjectData> {
    const key = `${this.STORAGE_KEY_PREFIX}${projectId}`;
    await new Promise(resolve => setTimeout(resolve, 300));
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error("Project not found");
    return JSON.parse(raw) as ProjectData;
  }

  async deleteProject(projectId: string): Promise<void> {
    const key = `${this.STORAGE_KEY_PREFIX}${projectId}`;
    localStorage.removeItem(key);
    return Promise.resolve();
  }
}

/**
 * ONEDRIVE PROVIDER (Real Implementation)
 */
export class OneDriveProvider implements ICloudProvider {
  name = "Microsoft OneDrive";
  private msalInstance: PublicClientApplication | null = null;
  private clientId = "c72dafcc-f675-4a27-9b82-0612b0d18f51"; // Provided by user
  private scopes = ["User.Read", "Files.ReadWrite"];
  private folderName = "SmartTaggerProjects";
  
  private user: CloudUser | null = null;
  private _isAuthenticated = false;
  private initPromise: Promise<void>;

  constructor() {
    // Capture the initialization promise to handle race conditions
    this.initPromise = this.initialize();
  }

  public getRedirectUri() {
      return window.location.origin;
  }

  private async initialize() {
    if (this.msalInstance) return;

    // Detect if we are in a dev/preview environment
    const redirectUri = window.location.origin;
    console.log("[OneDrive] Initializing with Redirect URI:", redirectUri);

    this.msalInstance = new PublicClientApplication({
      auth: {
        clientId: this.clientId,
        authority: "https://login.microsoftonline.com/common",
        redirectUri: redirectUri, 
      },
      cache: {
        cacheLocation: "localStorage", // Use localStorage for better persistence
        storeAuthStateInCookie: false,
      }
    });

    await this.msalInstance.initialize();

    // Check if user is already signed in (persisted session)
    const accounts = this.msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      this.msalInstance.setActiveAccount(accounts[0]);
      await this.setUserFromAccount(accounts[0]);
    }
  }

  private async setUserFromAccount(account: any) {
    this.user = {
      name: account.name || "OneDrive User",
      email: account.username || "",
    };
    this._isAuthenticated = true;
    
    // Attempt to fetch profile photo in background
    this.fetchProfilePhoto();
  }

  private async fetchProfilePhoto() {
    try {
        const token = await this.getToken();
        const response = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
            const blob = await response.blob();
            if (this.user) {
                this.user.avatarUrl = URL.createObjectURL(blob);
            }
        }
    } catch (e) {
        // Photo might not exist or permission issue, ignore
        console.debug("Could not fetch user photo", e);
    }
  }

  isAuthenticated() {
    return this._isAuthenticated;
  }

  getUser() {
    return this.user;
  }

  async login() {
    // Ensure initialization is complete before attempting login
    await this.initPromise;
    
    if (!this.msalInstance) throw new Error("MSAL initialization failed");

    try {
      const response = await this.msalInstance.loginPopup({
        scopes: this.scopes,
        prompt: "select_account"
      });
      this.msalInstance.setActiveAccount(response.account);
      await this.setUserFromAccount(response.account);
    } catch (error: any) {
      if (error.errorCode === 'user_cancelled') {
        throw new Error("Login cancelled. If you are in the AI Studio Preview, OneDrive login may not work due to domain mismatch.");
      }
      console.error("OneDrive Login Failed", error);
      throw error;
    }
  }

  async logout() {
    await this.initPromise;
    if (!this.msalInstance) return;
    
    const account = this.msalInstance.getActiveAccount();
    if (account) {
        await this.msalInstance.logoutPopup({
            account,
            mainWindowRedirectUri: window.location.origin
        });
    }
    
    this.user = null;
    this._isAuthenticated = false;
  }

  private async getToken(): Promise<string> {
    await this.initPromise;
    if (!this.msalInstance) throw new Error("MSAL not initialized");
    
    const account = this.msalInstance.getActiveAccount() || this.msalInstance.getAllAccounts()[0];
    if (!account) throw new Error("No active account. Please login.");

    try {
      const response = await this.msalInstance.acquireTokenSilent({
        account,
        scopes: this.scopes
      });
      return response.accessToken;
    } catch (error) {
       // Fallback to interaction
       const response = await this.msalInstance.acquireTokenPopup({
         scopes: this.scopes,
         account
       });
       return response.accessToken;
    }
  }

  // --- Graph API Helpers ---

  async listProjects(): Promise<CloudProjectMetadata[]> {
    const token = await this.getToken();
    
    // GET /me/drive/root:/{folderName}:/children
    const url = `https://graph.microsoft.com/v1.0/me/drive/root:/${this.folderName}:/children`;
    
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 404) {
         return [];
      }

      if (!response.ok) throw new Error("Failed to list files from OneDrive");
      
      const data = await response.json();
      const files = data.value || [];

      return files
        .filter((f: any) => f.name.endsWith('.json'))
        .map((f: any) => ({
           id: f.id,
           name: f.name.replace('.json', ''),
           updatedAt: f.lastModifiedDateTime,
           size: f.size
        }));

    } catch (error) {
      console.error("List Projects Error", error);
      throw error;
    }
  }

  async saveProject(project: ProjectData): Promise<void> {
    const token = await this.getToken();
    const fileName = `${project.name}.json`;
    
    const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${this.folderName}/${fileName}:/content`;
    const content = JSON.stringify(project);
    
    try {
       const response = await fetch(uploadUrl, {
           method: 'PUT',
           headers: {
               Authorization: `Bearer ${token}`,
               'Content-Type': 'application/json'
           },
           body: content
       });

       if (response.status === 409 || response.status === 404) {
           await this.createAppFolder(token);
           const retryResponse = await fetch(uploadUrl, {
               method: 'PUT',
               headers: {
                   Authorization: `Bearer ${token}`,
                   'Content-Type': 'application/json'
               },
               body: content
           });
           if (!retryResponse.ok) throw new Error("Failed to upload project");
       } else if (!response.ok) {
           throw new Error(`Upload failed: ${response.statusText}`);
       }
       
    } catch (error) {
        console.error("Save Project Error", error);
        throw error;
    }
  }

  private async createAppFolder(token: string) {
      const url = `https://graph.microsoft.com/v1.0/me/drive/root/children`;
      await fetch(url, {
          method: 'POST',
          headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              name: this.folderName,
              folder: {},
              "@microsoft.graph.conflictBehavior": "rename"
          })
      });
  }

  async loadProject(projectId: string): Promise<ProjectData> {
    const token = await this.getToken();
    
    // GET /me/drive/items/{item-id}/content
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${projectId}/content`;

    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error("Failed to download project file");

    const data = await response.json();
    return data as ProjectData;
  }

  async deleteProject(projectId: string): Promise<void> {
    const token = await this.getToken();
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${projectId}`;
    
    const response = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error("Failed to delete project");
  }
}

// Factory to get provider
export const getCloudProvider = (type: string): ICloudProvider => {
    switch (type) {
        case 'onedrive': return new OneDriveProvider();
        case 'browser':
        default:
            return new BrowserCloudProvider();
    }
};
