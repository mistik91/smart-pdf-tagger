import { describe, expect, it } from 'vitest';
import { parseProjectJson } from '../projectValidation';

const pdfData = 'data:application/pdf;base64,JVBERi0xLjQ=';

describe('parseProjectJson', () => {
  it('accepts a valid project', () => {
    const project = parseProjectJson(JSON.stringify({
      id: 'project-1',
      name: 'Invoice',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activeVersionId: 'v1',
      versions: [{
        id: 'v1',
        name: 'Initial',
        createdAt: new Date().toISOString(),
        fileName: 'invoice.pdf',
        pdfData,
        boxes: [],
      }],
    }));

    expect(project.name).toBe('Invoice');
  });

  it('rejects invalid JSON with a friendly error', () => {
    expect(() => parseProjectJson('{')).toThrow('Project file is not valid JSON.');
  });

  it('rejects projects without embedded PDF data', () => {
    expect(() => parseProjectJson(JSON.stringify({
      id: 'project-1',
      name: 'Invoice',
      activeVersionId: 'v1',
      versions: [{ id: 'v1', name: 'Initial', pdfData: '', boxes: [] }],
    }))).toThrow('Version 1 does not contain embedded PDF data.');
  });

  it('rejects invalid metadata', () => {
    expect(() => parseProjectJson(JSON.stringify({
      id: 'project-1',
      name: 'Invoice',
      activeVersionId: 'v1',
      metadata: 'bad',
      versions: [{ id: 'v1', name: 'Initial', pdfData, boxes: [] }],
    }))).toThrow('Project metadata must be an object.');
  });
});
