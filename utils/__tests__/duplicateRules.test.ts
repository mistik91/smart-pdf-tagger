import { describe, expect, it } from 'vitest';
import { DuplicateRule, BoundingBox } from '../../types';
import { getDuplicateLabelMessage, shouldBlockDuplicate } from '../duplicateRules';

const boxes: BoundingBox[] = [
  { id: 'a', page: 1, x: 0, y: 0, width: 1, height: 1, label: 'Total Amount' },
  { id: 'b', page: 2, x: 0, y: 0, width: 1, height: 1, label: 'Total Amount' },
];

describe('duplicate rules', () => {
  it('blocks duplicate labels globally', () => {
    expect(getDuplicateLabelMessage(boxes, 'new', 'total amount', 3, DuplicateRule.GLOBAL_BLOCK))
      .toBe('Label already exists on page 1.');
    expect(shouldBlockDuplicate(DuplicateRule.GLOBAL_BLOCK)).toBe(true);
  });

  it('only detects duplicates on the same page for page scoped rules', () => {
    expect(getDuplicateLabelMessage(boxes, 'new', 'Total Amount', 3, DuplicateRule.PAGE_BLOCK)).toBeNull();
    expect(getDuplicateLabelMessage(boxes, 'new', 'Total Amount', 2, DuplicateRule.PAGE_BLOCK))
      .toBe('Label already exists on page 2.');
  });

  it('allows duplicate labels when configured', () => {
    expect(getDuplicateLabelMessage(boxes, 'new', 'Total Amount', 1, DuplicateRule.ALLOW)).toBeNull();
    expect(shouldBlockDuplicate(DuplicateRule.ALLOW)).toBe(false);
  });
});
