import { ProjectData } from '../types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const validateProjectData = (value: unknown): ProjectData => {
  if (!isRecord(value)) {
    throw new Error('Project file must contain a JSON object.');
  }

  const versions = value.versions;
  if (typeof value.id !== 'string' || !value.id.trim()) {
    throw new Error('Project file is missing a valid project id.');
  }
  if (typeof value.name !== 'string' || !value.name.trim()) {
    throw new Error('Project file is missing a valid project name.');
  }
  if (!Array.isArray(versions) || versions.length === 0) {
    throw new Error('Project file must include at least one PDF version.');
  }
  if (typeof value.activeVersionId !== 'string' || !value.activeVersionId.trim()) {
    throw new Error('Project file is missing an active version id.');
  }
  if (value.metadata !== undefined && !isRecord(value.metadata)) {
    throw new Error('Project metadata must be an object.');
  }

  const hasActiveVersion = versions.some(version =>
    isRecord(version) && version.id === value.activeVersionId
  );
  if (!hasActiveVersion) {
    throw new Error('Project file active version does not exist.');
  }

  versions.forEach((version, index) => {
    if (!isRecord(version)) {
      throw new Error(`Version ${index + 1} is invalid.`);
    }
    if (typeof version.id !== 'string' || !version.id.trim()) {
      throw new Error(`Version ${index + 1} is missing an id.`);
    }
    if (typeof version.name !== 'string' || !version.name.trim()) {
      throw new Error(`Version ${index + 1} is missing a name.`);
    }
    if (typeof version.pdfData !== 'string' || !version.pdfData.startsWith('data:application/pdf')) {
      throw new Error(`Version ${index + 1} does not contain embedded PDF data.`);
    }
    if (!Array.isArray(version.boxes)) {
      throw new Error(`Version ${index + 1} is missing its annotation list.`);
    }
  });

  return value as unknown as ProjectData;
};

export const parseProjectJson = (text: string): ProjectData => {
  try {
    return validateProjectData(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Project file is not valid JSON.');
    }
    throw error;
  }
};
