import { BoundingBox } from '../types';

export type BatchEditOptions = {
  ids: string[];
  color?: string;
  description?: string;
  tagsToAdd?: string[];
};

export type AnnotationSortMode = 'page' | 'label' | 'color' | 'updated';

export const addToHistory = (
  history: BoundingBox[][],
  historyStep: number,
  newBoxes: BoundingBox[],
) => history.slice(0, historyStep + 1).concat([newBoxes]);

export const filterBoxes = (
  boxes: BoundingBox[],
  filterText: string,
  selectedColor: string | null,
) => {
  if (!filterText && !selectedColor) return boxes;

  return boxes.filter(box => {
    const matchesColor = selectedColor ? box.color === selectedColor : true;
    if (!matchesColor) return false;

    if (filterText.trim()) {
      const lower = filterText.toLowerCase();
      const matchLabel = box.label?.toLowerCase().includes(lower);
      const matchDesc = box.description?.toLowerCase().includes(lower);
      const matchTags = box.tags?.some(t => t.toLowerCase().includes(lower));
      return matchLabel || matchDesc || matchTags;
    }

    return true;
  });
};

export const batchEditBoxes = (
  boxes: BoundingBox[],
  { ids, color, description, tagsToAdd = [] }: BatchEditOptions,
) => {
  const selectedIds = new Set(ids);
  const cleanTags = tagsToAdd.map(tag => tag.trim()).filter(Boolean);

  return boxes.map(box => {
    if (!selectedIds.has(box.id)) return box;

    const tags = Array.from(new Set([...(box.tags || []), ...cleanTags]));
    return {
      ...box,
      ...(color ? { color } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(cleanTags.length > 0 ? { tags } : {}),
    };
  });
};

export const sortBoxes = (boxes: BoundingBox[], sortMode: AnnotationSortMode) => {
  return [...boxes].sort((a, b) => {
    if (sortMode === 'label') {
      return (a.label || '').localeCompare(b.label || '') || a.page - b.page;
    }
    if (sortMode === 'color') {
      return (a.color || '').localeCompare(b.color || '') || a.page - b.page;
    }
    if (sortMode === 'updated') {
      return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
    }
    return a.page - b.page || (a.label || '').localeCompare(b.label || '');
  });
};
