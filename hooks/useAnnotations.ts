import { useState, useCallback } from 'react';
import { BoundingBox } from '../types';
import { addToHistory as appendHistory, batchEditBoxes, filterBoxes, BatchEditOptions } from '../utils/annotationUtils';

export const useAnnotations = (initialBoxes: BoundingBox[] = []) => {
    const [history, setHistory] = useState<BoundingBox[][]>([initialBoxes]);
    const [historyStep, setHistoryStep] = useState(0);
    const boxes = history[historyStep]; // Derived active state

    const [activeBoxId, setActiveBoxId] = useState<string | null>(null);

    // -- Actions --

    const addToHistory = useCallback((newBoxes: BoundingBox[]) => {
        const newHistory = appendHistory(history, historyStep, newBoxes);
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
    }, [history, historyStep]);

    const undo = useCallback(() => {
        if (historyStep > 0) {
            setHistoryStep(prev => prev - 1);
        }
    }, [historyStep]);

    const redo = useCallback(() => {
        if (historyStep < history.length - 1) {
            setHistoryStep(prev => prev + 1);
        }
    }, [historyStep, history.length]);

    const addBox = useCallback((box: BoundingBox) => {
        const now = new Date().toISOString();
        addToHistory([...boxes, { ...box, createdAt: box.createdAt || now, updatedAt: box.updatedAt || now }]);
    }, [boxes, addToHistory]);

    const updateBox = useCallback((updatedBox: BoundingBox) => {
        addToHistory(boxes.map(b => b.id === updatedBox.id ? { ...updatedBox, updatedAt: new Date().toISOString() } : b));
    }, [boxes, addToHistory]);

    const deleteBox = useCallback((id: string) => {
        addToHistory(boxes.filter(b => b.id !== id));
        if (activeBoxId === id) setActiveBoxId(null);
    }, [boxes, addToHistory, activeBoxId]);

    // -- Filter Logic
    const getFilteredBoxes = useCallback((filterText: string, selectedColor: string | null) => {
        return filterBoxes(boxes, filterText, selectedColor);
    }, [boxes]);

    const batchEdit = useCallback((options: BatchEditOptions) => {
        addToHistory(batchEditBoxes(boxes, options));
    }, [boxes, addToHistory]);

    // Reset function for loading new projects
    const setBoxes = useCallback((newBoxes: BoundingBox[]) => {
        setHistory([newBoxes]);
        setHistoryStep(0);
        setActiveBoxId(null);
    }, []);

    return {
        boxes,
        history,
        historyStep,
        activeBoxId,
        setActiveBoxId,
        addToHistory, // Exposed for generic updates (like Paste)
        addBox,
        updateBox,
        deleteBox,
        undo,
        redo,
        getFilteredBoxes,
        batchEdit,
        setBoxes
    };
};
