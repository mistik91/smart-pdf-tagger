
export interface BoundingBox {
  id: string;
  page: number;
  x: number; // Percentage (0-100)
  y: number; // Percentage (0-100)
  width: number; // Percentage (0-100)
  height: number; // Percentage (0-100)
  label: string;
  description?: string;
  tags?: string[];
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PdfDocumentInfo {
  numPages: number;
  file: File;
  dataUrl: string;
}

export interface ProjectVersion {
  id: string;
  name: string; // e.g. "v1 - Initial", "v2 - Update"
  createdAt: string;
  boxes: BoundingBox[];
  pdfData: string; // Base64 encoded PDF content
  fileName: string;
}

export interface ProjectData {
  id: string;
  name: string; // Overall Project Name
  createdAt: string;
  updatedAt: string;
  metadata?: ProjectMetadata;
  versions: ProjectVersion[];
  activeVersionId: string;
}

export interface ProjectMetadata {
  client?: string;
  documentType?: string;
  status?: string;
  reviewer?: string;
}

export enum ToolState {
  SELECT = 'SELECT',
  DRAW = 'DRAW',
  HAND = 'HAND'
}

export enum DuplicateRule {
  GLOBAL_BLOCK = 'GLOBAL_BLOCK',
  PAGE_BLOCK = 'PAGE_BLOCK',
  WARN_ONLY = 'WARN_ONLY',
  ALLOW = 'ALLOW'
}

export const TAG_COLORS = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#10b981", // Emerald (Default)
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#8b5cf6", // Violet
  "#d946ef", // Fuchsia
  "#64748b", // Slate
];

// --- Cloud Storage Types ---

export interface CloudProjectMetadata {
  id: string;
  name: string;
  updatedAt: string;
  size?: number;
}

export interface CloudUser {
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface ICloudProvider {
  name: string;
  isAuthenticated: () => boolean;
  getUser: () => CloudUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  listProjects: () => Promise<CloudProjectMetadata[]>;
  saveProject: (project: ProjectData) => Promise<void>;
  loadProject: (projectId: string) => Promise<ProjectData>;
  deleteProject: (projectId: string) => Promise<void>;
  getRedirectUri?: () => string; // Optional for debugging auth flows
}
