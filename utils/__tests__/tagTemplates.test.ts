import { beforeEach, describe, expect, it } from 'vitest';
import {
  createEmptyTemplateField,
  DEFAULT_TAG_TEMPLATE_FIELDS,
  loadTemplateFields,
  parseTemplateFieldsJson,
  saveTemplateFields,
  serializeTemplateFields,
} from '../tagTemplates';

describe('tag templates', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads default templates when no custom list is saved', () => {
    expect(loadTemplateFields()).toEqual(DEFAULT_TAG_TEMPLATE_FIELDS);
  });

  it('persists custom templates', () => {
    const templates = [{
      ...createEmptyTemplateField(),
      templateName: 'Mortgage',
      label: 'Interest Amount',
      tags: ['mortgage', 'interest'],
    }];

    saveTemplateFields(templates);

    expect(loadTemplateFields()).toEqual([{ ...templates[0], repeatable: false }]);
  });

  it('creates editable template fields with defaults', () => {
    const template = createEmptyTemplateField();

    expect(template.id).toContain('template.');
    expect(template.templateName).toBe('Custom');
    expect(template.label).toBe('New Field');
  });

  it('parses exported template JSON', () => {
    const templates = [{
      ...createEmptyTemplateField(),
      templateName: 'Tax',
      label: 'Tax Code',
      color: '#not-a-valid-color',
      tags: [' tax ', 'code'],
    }];

    const parsed = parseTemplateFieldsJson(serializeTemplateFields(templates));

    expect(parsed[0]).toMatchObject({
      templateName: 'Tax',
      label: 'Tax Code',
      tags: ['tax', 'code'],
    });
  });

  it('rejects invalid template JSON with a friendly error', () => {
    expect(() => parseTemplateFieldsJson('{')).toThrow('Template file is not valid JSON.');
    expect(() => parseTemplateFieldsJson('[{}]')).toThrow('Template field 1 is missing a schema name.');
  });
});
