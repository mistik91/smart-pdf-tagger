export interface RecentProject {
  filePath: string;
  name: string;
  openedAt: string;
}

const STORAGE_KEY = 'smart-pdf-tagger-recent-projects';
const MAX_RECENT_PROJECTS = 8;

const isRecentProject = (value: unknown): value is RecentProject => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<RecentProject>;
  return typeof candidate.filePath === 'string'
    && typeof candidate.name === 'string'
    && typeof candidate.openedAt === 'string';
};

export const loadRecentProjects = (): RecentProject[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentProject).slice(0, MAX_RECENT_PROJECTS);
  } catch {
    return [];
  }
};

export const saveRecentProjects = (projects: RecentProject[]) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects.slice(0, MAX_RECENT_PROJECTS)));
};

export const addRecentProject = (projects: RecentProject[], project: Omit<RecentProject, 'openedAt'>): RecentProject[] => {
  const normalizedPath = project.filePath.trim();
  if (!normalizedPath) return projects;

  const nextProject: RecentProject = {
    ...project,
    filePath: normalizedPath,
    openedAt: new Date().toISOString(),
  };

  return [
    nextProject,
    ...projects.filter(item => item.filePath !== normalizedPath),
  ].slice(0, MAX_RECENT_PROJECTS);
};

export const removeRecentProject = (projects: RecentProject[], filePath: string): RecentProject[] => (
  projects.filter(project => project.filePath !== filePath)
);
