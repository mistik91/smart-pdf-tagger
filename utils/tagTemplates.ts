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

export const DEFAULT_TAG_TEMPLATE_FIELDS: TagTemplateField[] = [
  {
    id: 'invoice.vendor-name',
    templateName: 'Invoice',
    label: 'Vendor Name',
    description: 'Supplier or company issuing the invoice.',
    tags: ['invoice', 'vendor'],
    color: TAG_COLORS[4],
  },
  {
    id: 'invoice.invoice-number',
    templateName: 'Invoice',
    label: 'Invoice Number',
    description: 'Unique invoice identifier.',
    tags: ['invoice', 'identifier'],
    color: TAG_COLORS[5],
  },
  {
    id: 'invoice.invoice-date',
    templateName: 'Invoice',
    label: 'Invoice Date',
    description: 'Date the invoice was issued.',
    tags: ['invoice', 'date'],
    color: TAG_COLORS[3],
  },
  {
    id: 'invoice.total-amount',
    templateName: 'Invoice',
    label: 'Total Amount',
    description: 'Final amount due.',
    tags: ['invoice', 'currency', 'total'],
    color: TAG_COLORS[2],
  },
  {
    id: 'contract.party',
    templateName: 'Contract',
    label: 'Contract Party',
    description: 'A person or organization bound by the agreement.',
    tags: ['contract', 'party'],
    color: TAG_COLORS[6],
    repeatable: true,
  },
  {
    id: 'contract.effective-date',
    templateName: 'Contract',
    label: 'Effective Date',
    description: 'Date when the contract becomes active.',
    tags: ['contract', 'date'],
    color: TAG_COLORS[3],
  },
  {
    id: 'contract.signature',
    templateName: 'Contract',
    label: 'Signature',
    description: 'Signature block or signed approval area.',
    tags: ['contract', 'signature'],
    color: TAG_COLORS[0],
    repeatable: true,
  },
  {
    id: 'shipping.tracking-number',
    templateName: 'Shipping',
    label: 'Tracking Number',
    description: 'Shipment tracking identifier.',
    tags: ['shipping', 'identifier'],
    color: TAG_COLORS[5],
  },
  {
    id: 'shipping.recipient-address',
    templateName: 'Shipping',
    label: 'Recipient Address',
    description: 'Destination address for the shipment.',
    tags: ['shipping', 'address'],
    color: TAG_COLORS[1],
  },
];

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
  if (typeof localStorage === 'undefined') return DEFAULT_TAG_TEMPLATE_FIELDS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TAG_TEMPLATE_FIELDS;
    const parsed = JSON.parse(raw);
    return normalizeTemplateFields(parsed);
  } catch {
    return DEFAULT_TAG_TEMPLATE_FIELDS;
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
