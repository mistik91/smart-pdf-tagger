import { TAG_COLORS } from '../types';

export interface TagTemplateField {
  id: string;
  templateName: string;
  label: string;
  description: string;
  tags: string[];
  color: string;
  repeatable?: boolean;
}

const STORAGE_KEY = 'smart_pdf_tagger_tag_templates';

export const createTemplateId = () =>
  `template.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const normalizeTemplateFields = (value: unknown): TagTemplateField[] => {
  if (!Array.isArray(value)) {
    throw new Error('Template file must contain a list of fields.');
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`Template field ${index + 1} must be an object.`);
    }

    const templateName = typeof item.templateName === 'string' ? item.templateName.trim() : '';
    const label = typeof item.label === 'string' ? item.label.trim() : '';

    if (!templateName) throw new Error(`Template field ${index + 1} is missing a schema name.`);
    if (!label) throw new Error(`Template field ${index + 1} is missing a label.`);

    const id = typeof item.id === 'string' && item.id.trim() ? item.id : createTemplateId();
    const description = typeof item.description === 'string' ? item.description : '';
    const tags = Array.isArray(item.tags)
      ? item.tags.filter((tag): tag is string => typeof tag === 'string').map(tag => tag.trim()).filter(Boolean)
      : [];
    const color = typeof item.color === 'string' && TAG_COLORS.includes(item.color)
      ? item.color
      : TAG_COLORS[2];

    return {
      id,
      templateName,
      label,
      description,
      tags,
      color,
      repeatable: Boolean(item.repeatable),
    };
  });
};

export const parseTemplateFieldsJson = (text: string): TagTemplateField[] => {
  try {
    return normalizeTemplateFields(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Template file is not valid JSON.');
    }
    throw error;
  }
};

export const serializeTemplateFields = (templates: TagTemplateField[]) =>
  JSON.stringify(normalizeTemplateFields(templates), null, 2);

export const loadTemplateFields = (): TagTemplateField[] => {
  if (typeof localStorage === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizeTemplateFields(parsed);
  } catch {
    return [];
  }
};

export const saveTemplateFields = (templates: TagTemplateField[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
};

export const createEmptyTemplateField = (): TagTemplateField => ({
  id: createTemplateId(),
  templateName: 'Custom',
  label: 'New Field',
  description: '',
  tags: [],
  color: TAG_COLORS[2],
});
