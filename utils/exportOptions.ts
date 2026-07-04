import { BoundingBox } from '../types';

export interface PdfExportOptions {
  includeLabels: boolean;
  includeComments: boolean;
  includeColors: boolean;
}

export type CsvField =
  | 'label'
  | 'description'
  | 'tags'
  | 'page'
  | 'x'
  | 'y'
  | 'width'
  | 'height'
  | 'color'
  | 'createdAt'
  | 'updatedAt';

export interface CsvExportOptions {
  fields: CsvField[];
}

export const DEFAULT_PDF_EXPORT_OPTIONS: PdfExportOptions = {
  includeLabels: true,
  includeComments: true,
  includeColors: true,
};

export const CSV_FIELD_LABELS: Record<CsvField, string> = {
  label: 'Label',
  description: 'Description',
  tags: 'Tags',
  page: 'Page',
  x: 'X',
  y: 'Y',
  width: 'Width',
  height: 'Height',
  color: 'Color',
  createdAt: 'Created At',
  updatedAt: 'Updated At',
};

export const DEFAULT_CSV_FIELDS: CsvField[] = [
  'label',
  'description',
  'tags',
  'page',
  'x',
  'y',
  'width',
  'height',
];

const escapeCsv = (value: string | number | undefined) => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

const getCsvValue = (box: BoundingBox, field: CsvField) => {
  switch (field) {
    case 'label': return box.label;
    case 'description': return box.description;
    case 'tags': return (box.tags || []).join(';');
    case 'page': return box.page;
    case 'x': return box.x.toFixed(2);
    case 'y': return box.y.toFixed(2);
    case 'width': return box.width.toFixed(2);
    case 'height': return box.height.toFixed(2);
    case 'color': return box.color;
    case 'createdAt': return box.createdAt;
    case 'updatedAt': return box.updatedAt;
  }
};

export const buildAnnotationCsv = (boxes: BoundingBox[], options: CsvExportOptions) => {
  const fields = options.fields.length > 0 ? options.fields : DEFAULT_CSV_FIELDS;
  const header = fields.map(field => escapeCsv(CSV_FIELD_LABELS[field])).join(',');
  const rows = boxes.map(box => fields.map(field => escapeCsv(getCsvValue(box, field))).join(','));
  return [header, ...rows].join('\n');
};
