import { useState, useCallback } from 'react';
import { BoundingBox } from '../types';
import { generateId } from '../utils/fileUtils';

export const useClipboard = (
    boxes: BoundingBox[],
    activeBoxId: string | null,
    currentPage: number,
    onAddBox: (boxes: BoundingBox[]) => void, // Requires getting the FULL new list or just the new box? The App implementation was adding to history with full list.
    setActiveBoxId: (id: string) => void
) => {
    const [clipboard, setClipboard] = useState<BoundingBox | null>(null);

    const copy = useCallback(() => {
        if (activeBoxId) {
            const box = boxes.find(b => b.id === activeBoxId);
            if (box) {
                setClipboard(box);
            }
        }
    }, [activeBoxId, boxes]);

    const paste = useCallback(() => {
        if (!clipboard) return;

        // Calculate new position
        let newX = clipboard.x;
        let newY = clipboard.y;

        if (currentPage === clipboard.page) {
            newX = Math.min(newX + 2, 95); // Offset by 2%, max 95%
            newY = Math.min(newY + 2, 95);
        }

        const newBox: BoundingBox = {
            ...clipboard,
            id: generateId(), // New ID
            page: currentPage, // Paste to current view
            x: newX,
            y: newY,
            label: clipboard.label ? `${clipboard.label} (Copy)` : "Copy",
        };

        // The original App logic: addToHistory([...boxes, newBox]);
        // So we need to call onAddBox with the new complete state or just the box?
        // Let's standardize on passing the NEW complete array to keep it simple for the history manager,
        // OR we change the interface of `useAnnotations` to accept an action.
        // For now, let's assume the parent exposes a way to "add a box" or "set boxes".
        // Actually, looking at App.tsx, `addToHistory` takes `BoundingBox[]`.

        // We will assume the consumer of this hook handles the merge if we return the new box, 
        // BUT `App.tsx` logic was tightly coupled.
        // Let's refactor: `useClipboard` should probably just RETURN the new box to add, or call a specific `addBox` function.

        onAddBox([...boxes, newBox]);
        setActiveBoxId(newBox.id);
    }, [clipboard, currentPage, boxes, onAddBox, setActiveBoxId]);

    return { clipboard, copy, paste };
};
