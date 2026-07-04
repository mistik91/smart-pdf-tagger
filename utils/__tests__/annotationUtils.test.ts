import { describe, expect, it } from 'vitest';
import { batchEditBoxes, filterBoxes, sortBoxes } from '../annotationUtils';
import { BoundingBox } from '../../types';

const boxes: BoundingBox[] = [
  { id: 'a', page: 1, x: 0, y: 0, width: 10, height: 10, label: 'Total', description: 'Amount due', tags: ['money'], color: '#10b981' },
  { id: 'b', page: 1, x: 10, y: 10, width: 10, height: 10, label: 'Vendor', tags: ['contact'], color: '#3b82f6' },
];

describe('annotation utils', () => {
  it('filters by label, description, tags, and color', () => {
    expect(filterBoxes(boxes, 'amount', null)).toHaveLength(1);
    expect(filterBoxes(boxes, 'contact', null)[0].id).toBe('b');
    expect(filterBoxes(boxes, '', '#3b82f6')[0].id).toBe('b');
  });

  it('batch edits only selected boxes', () => {
    const result = batchEditBoxes(boxes, {
      ids: ['a'],
      color: '#ef4444',
      description: 'Reviewed',
      tagsToAdd: ['approved', 'money'],
    });

    expect(result[0].color).toBe('#ef4444');
    expect(result[0].description).toBe('Reviewed');
    expect(result[0].tags).toEqual(['money', 'approved']);
    expect(result[1]).toEqual(boxes[1]);
  });

  it('sorts by label, color, updated date, and page', () => {
    const sortable: BoundingBox[] = [
      { ...boxes[0], page: 2, label: 'B', color: '#bbb', updatedAt: '2026-01-01T00:00:00.000Z' },
      { ...boxes[1], page: 1, label: 'A', color: '#aaa', updatedAt: '2026-02-01T00:00:00.000Z' },
    ];

    expect(sortBoxes(sortable, 'label').map(box => box.label)).toEqual(['A', 'B']);
    expect(sortBoxes(sortable, 'color').map(box => box.color)).toEqual(['#aaa', '#bbb']);
    expect(sortBoxes(sortable, 'updated').map(box => box.id)).toEqual(['b', 'a']);
    expect(sortBoxes(sortable, 'page').map(box => box.page)).toEqual([1, 2]);
  });
});
