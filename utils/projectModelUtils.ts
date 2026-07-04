import { BoundingBox, ProjectData, ProjectMetadata } from '../types';

export const buildSyncedProject = (project: ProjectData, currentBoxes: BoundingBox[]): ProjectData => {
  const currentVersionIndex = project.versions.findIndex(v => v.id === project.activeVersionId);
  if (currentVersionIndex === -1) return project;

  const updatedVersions = [...project.versions];
  updatedVersions[currentVersionIndex] = {
    ...updatedVersions[currentVersionIndex],
    boxes: currentBoxes,
  };

  return {
    ...project,
    versions: updatedVersions,
    updatedAt: new Date().toISOString(),
  };
};

export const updateProjectMetadata = (
  project: ProjectData,
  metadata: ProjectMetadata,
): ProjectData => ({
  ...project,
  metadata: {
    ...project.metadata,
    ...metadata,
  },
  updatedAt: new Date().toISOString(),
});

export const renameProjectVersion = (
  project: ProjectData,
  versionId: string,
  name: string,
): ProjectData => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Version name cannot be empty.');
  }

  return {
    ...project,
    versions: project.versions.map(version =>
      version.id === versionId ? { ...version, name: trimmedName } : version
    ),
    updatedAt: new Date().toISOString(),
  };
};
