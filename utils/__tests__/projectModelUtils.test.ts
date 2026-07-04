import { describe, expect, it } from 'vitest';
import { buildSyncedProject, renameProjectVersion, updateProjectMetadata } from '../projectModelUtils';
import { ProjectData } from '../../types';

describe('buildSyncedProject', () => {
  it('updates only the active version boxes', () => {
    const project: ProjectData = {
      id: 'p1',
      name: 'Project',
      createdAt: '',
      updatedAt: '',
      activeVersionId: 'v2',
      versions: [
        { id: 'v1', name: 'One', createdAt: '', fileName: 'one.pdf', pdfData: 'data:application/pdf;base64,a', boxes: [{ id: 'old', page: 1, x: 0, y: 0, width: 1, height: 1, label: 'old' }] },
        { id: 'v2', name: 'Two', createdAt: '', fileName: 'two.pdf', pdfData: 'data:application/pdf;base64,b', boxes: [] },
      ],
    };

    const synced = buildSyncedProject(project, [{ id: 'new', page: 1, x: 1, y: 1, width: 2, height: 2, label: 'new' }]);

    expect(synced.versions[0].boxes[0].id).toBe('old');
    expect(synced.versions[1].boxes[0].id).toBe('new');
    expect(synced.updatedAt).not.toBe('');
  });
});

describe('updateProjectMetadata', () => {
  it('merges metadata and updates the project timestamp', () => {
    const project: ProjectData = {
      id: 'p1',
      name: 'Project',
      createdAt: '',
      updatedAt: '',
      activeVersionId: 'v1',
      metadata: { client: 'Old' },
      versions: [
        { id: 'v1', name: 'One', createdAt: '', fileName: 'one.pdf', pdfData: 'data:application/pdf;base64,a', boxes: [] },
      ],
    };

    const updated = updateProjectMetadata(project, { client: 'New', status: 'Review' });

    expect(updated.metadata).toEqual({ client: 'New', status: 'Review' });
    expect(updated.updatedAt).not.toBe('');
  });
});

describe('renameProjectVersion', () => {
  const project: ProjectData = {
    id: 'p1',
    name: 'Project',
    createdAt: '',
    updatedAt: '',
    activeVersionId: 'v1',
    versions: [
      { id: 'v1', name: 'Old', createdAt: '', fileName: 'one.pdf', pdfData: 'data:application/pdf;base64,a', boxes: [] },
    ],
  };

  it('renames a project version', () => {
    const updated = renameProjectVersion(project, 'v1', '  Reviewed version  ');

    expect(updated.versions[0].name).toBe('Reviewed version');
    expect(updated.updatedAt).not.toBe('');
  });

  it('rejects empty version names', () => {
    expect(() => renameProjectVersion(project, 'v1', ' ')).toThrow('Version name cannot be empty.');
  });
});
