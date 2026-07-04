import { BoundingBox, DuplicateRule } from '../types';

export const getDuplicateLabelMessage = (
  boxes: BoundingBox[],
  activeBoxId: string,
  label: string,
  page: number,
  rule: DuplicateRule,
) => {
  if (rule === DuplicateRule.ALLOW) return null;

  const normalizedLabel = label.trim().toLowerCase();
  if (!normalizedLabel) return null;

  const duplicate = boxes.find(box => {
    if (box.id === activeBoxId) return false;
    if (box.label.trim().toLowerCase() !== normalizedLabel) return false;
    return rule === DuplicateRule.PAGE_BLOCK ? box.page === page : true;
  });

  if (!duplicate) return null;

  if (rule === DuplicateRule.PAGE_BLOCK) {
    return `Label already exists on page ${page}.`;
  }

  if (rule === DuplicateRule.WARN_ONLY) {
    return `Label already exists on page ${duplicate.page}.`;
  }

  return `Label already exists on page ${duplicate.page}.`;
};

export const shouldBlockDuplicate = (rule: DuplicateRule) =>
  rule === DuplicateRule.GLOBAL_BLOCK || rule === DuplicateRule.PAGE_BLOCK;
