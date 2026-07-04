import { describe, expect, it } from 'vitest';
import { buildAnnotationCsv } from '../exportOptions';
import { BoundingBox } from '../../types';

const boxes: BoundingBox[] = [{
  id: 'a',
  page: 1,
  x: 1,
  y: 2,
  width: 3,
  height: 4,
  label: 'Total',
  description: 'Amount "due"',
  tags: ['money', 'review'],
  color: '#10b981',
}];

describe('buildAnnotationCsv', () => {
  it('exports selected fields and escapes values', () => {
    expect(buildAnnotationCsv(boxes, { fields: ['label', 'description', 'tags'] }))
      .toBe('"Label","Description","Tags"\n"Total","Amount ""due""","money;review"');
  });

  it('falls back to default fields when no fields are selected', () => {
    const csv = buildAnnotationCsv(boxes, { fields: [] });

    expect(csv).toContain('"Label","Description","Tags","Page","X","Y","Width","Height"');
    expect(csv).toContain('"Total"');
  });
});
