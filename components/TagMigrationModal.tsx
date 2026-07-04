import React, { useState, useMemo, useEffect } from 'react';
import { ProjectData, BoundingBox, TAG_COLORS } from '../types';
import { X, ChevronRight, ChevronLeft, Search, ArrowRightLeft, Check, Tag } from 'lucide-react';

interface TagMigrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: ProjectData;
    onUpdateProject: (updatedProject: ProjectData) => void;
}

const TagMigrationModal: React.FC<TagMigrationModalProps> = ({
    isOpen,
    onClose,
    project,
    onUpdateProject
}) => {
    const [leftVersionId, setLeftVersionId] = useState<string>("");
    const [rightVersionId, setRightVersionId] = useState<string>("");
    const [leftSelection, setLeftSelection] = useState<Set<string>>(new Set());
    const [rightSelection, setRightSelection] = useState<Set<string>>(new Set());
    const [filterText, setFilterText] = useState("");

    // Initialize defaults when opening
    useEffect(() => {
        if (isOpen && project.versions.length >= 1) {
            // Default Left: Active Version, Right: Previous version (if exists) or same
            setLeftVersionId(project.activeVersionId);
            const other = project.versions.find(v => v.id !== project.activeVersionId);
            setRightVersionId(other ? other.id : project.activeVersionId);
            setLeftSelection(new Set());
            setRightSelection(new Set());
        }
    }, [isOpen, project.activeVersionId, project.versions.length]);

    if (!isOpen) return null;

    const leftVersion = project.versions.find(v => v.id === leftVersionId);
    const rightVersion = project.versions.find(v => v.id === rightVersionId);

    // Helper to filter boxes
    const filterBoxes = (boxes: BoundingBox[]) => {
        if (!filterText.trim()) return boxes;
        const lower = filterText.toLowerCase();
        return boxes.filter(b =>
            b.label.toLowerCase().includes(lower) ||
            b.tags?.some(t => t.toLowerCase().includes(lower))
        );
    };

    const leftBoxes = leftVersion ? filterBoxes(leftVersion.boxes) : [];
    const rightBoxes = rightVersion ? filterBoxes(rightVersion.boxes) : [];

    const toggleSelection = (id: string, side: 'left' | 'right') => {
        const set = side === 'left' ? new Set(leftSelection) : new Set(rightSelection);
        if (set.has(id)) set.delete(id);
        else set.add(id);

        if (side === 'left') setLeftSelection(set);
        else setRightSelection(set);
    };

    const toggleAll = (side: 'left' | 'right') => {
        const boxes = side === 'left' ? leftBoxes : rightBoxes;
        const currentSet = side === 'left' ? leftSelection : rightSelection;

        if (currentSet.size === boxes.length && boxes.length > 0) {
            // Deselect all
            if (side === 'left') setLeftSelection(new Set());
            else setRightSelection(new Set());
        } else {
            // Select all visible
            const newSet = new Set<string>();
            boxes.forEach(b => newSet.add(b.id));
            if (side === 'left') setLeftSelection(newSet);
            else setRightSelection(newSet);
        }
    };

    const handleTransfer = (direction: 'left-to-right' | 'right-to-left') => {
        if (!leftVersion || !rightVersion) return;
        if (leftVersionId === rightVersionId) return;

        const sourceVersion = direction === 'left-to-right' ? leftVersion : rightVersion;
        const targetVersion = direction === 'left-to-right' ? rightVersion : leftVersion;
        const selection = direction === 'left-to-right' ? leftSelection : rightSelection;

        if (selection.size === 0) return;

        // Identify boxes to copy
        const boxesToCopy = sourceVersion.boxes.filter(b => selection.has(b.id));

        // Create new copies with unique IDs
        const newBoxes = boxesToCopy.map(b => ({
            ...b,
            id: Math.random().toString(36).substr(2, 9) // Generate new ID
        }));

        // Update Target Version
        const updatedTargetVersion = {
            ...targetVersion,
            boxes: [...targetVersion.boxes, ...newBoxes]
        };

        // Update Project
        const updatedVersions = project.versions.map(v =>
            v.id === updatedTargetVersion.id ? updatedTargetVersion : v
        );

        const updatedProject = {
            ...project,
            versions: updatedVersions,
            updatedAt: new Date().toISOString()
        };

        onUpdateProject(updatedProject);

        // Clear selection after transfer
        if (direction === 'left-to-right') setLeftSelection(new Set());
        else setRightSelection(new Set());
    };

    const renderBoxList = (boxes: BoundingBox[], side: 'left' | 'right', selection: Set<string>) => (
        <div className="flex-1 overflow-y-auto border border-outline-variant rounded-xl bg-surface-container-high/30 p-2 space-y-2 scrollbar-thin">
            {boxes.length === 0 ? (
                <div className="text-center text-on-surface-variant text-sm py-10">No tags found</div>
            ) : (
                boxes.map(box => (
                    <div
                        key={box.id}
                        onClick={() => toggleSelection(box.id, side)}
                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-all ${selection.has(box.id)
                            ? 'bg-secondary-container/50 border-secondary-container'
                            : 'bg-surface border-transparent hover:bg-surface-container-highest'
                            }`}
                    >
                        <div className={`mt-1 w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${selection.has(box.id)
                            ? 'bg-primary border-primary'
                            : 'border-outline-variant'
                            }`}>
                            {selection.has(box.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: box.color || TAG_COLORS[2] }}
                                />
                                <span className="font-medium text-sm text-on-surface truncate">{box.label || "Untitled"}</span>
                            </div>
                            {box.description && (
                                <p className="text-xs text-on-surface-variant truncate mt-0.5">{box.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-on-surface-variant uppercase">Page {box.page}</span>
                                {box.tags && box.tags.length > 0 && (
                                    <div className="flex gap-1">
                                        {box.tags.slice(0, 2).map((t, i) => (
                                            <span key={i} className="text-[10px] bg-surface-container-highest px-1 rounded text-on-surface-variant">{t}</span>
                                        ))}
                                        {box.tags.length > 2 && <span className="text-[10px] text-on-surface-variant">+{box.tags.length - 2}</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-surface-container w-full max-w-5xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-outline-variant">

                {/* Header */}
                <div className="px-8 py-5 border-b border-outline-variant flex items-center justify-between bg-surface-container">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-secondary-container rounded-xl text-on-secondary-container">
                            <ArrowRightLeft className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-on-surface">Compare & Sync Versions</h2>
                            <p className="text-xs text-on-surface-variant">Transfer tags between different PDF versions</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-surface-container-highest rounded-full transition-colors">
                        <X className="w-5 h-5 text-on-surface-variant" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="px-8 py-4 bg-surface-container-high/50 border-b border-outline-variant flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-on-surface-variant" />
                        <input
                            type="text"
                            placeholder="Search tags by label..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm border border-outline-variant rounded-full bg-surface-container-highest focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-on-surface placeholder:text-on-surface-variant/50"
                        />
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-hidden p-6 grid grid-cols-[1fr_auto_1fr] gap-4">

                    {/* Left Pane */}
                    <div className="flex flex-col gap-3 min-w-0">
                        <div className="flex items-center justify-between">
                            <select
                                value={leftVersionId}
                                onChange={(e) => setLeftVersionId(e.target.value)}
                                className="flex-1 p-2.5 border border-outline-variant rounded-xl bg-surface-container-highest text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                            >
                                {project.versions.map(v => (
                                    <option key={v.id} value={v.id}>{v.name} ({v.boxes.length} tags)</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center justify-between text-xs text-on-surface-variant px-1">
                            <span>{leftBoxes.length} tags shown</span>
                            <button onClick={() => toggleAll('left')} className="hover:text-primary font-medium">
                                {leftSelection.size === leftBoxes.length && leftBoxes.length > 0 ? "Deselect All" : "Select All"}
                            </button>
                        </div>
                        {renderBoxList(leftBoxes, 'left', leftSelection)}
                    </div>

                    {/* Actions Pane */}
                    <div className="flex flex-col items-center justify-center gap-4 px-2">
                        <button
                            onClick={() => handleTransfer('left-to-right')}
                            disabled={leftSelection.size === 0 || leftVersionId === rightVersionId}
                            className="p-3.5 bg-primary hover:bg-primary/90 disabled:bg-surface-container-highest disabled:text-on-surface-variant/50 disabled:cursor-not-allowed text-on-primary rounded-full shadow-lg transition-all transform hover:scale-105"
                            title="Copy selected to Right"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>

                        <div className="h-10 w-px bg-outline-variant"></div>

                        <button
                            onClick={() => handleTransfer('right-to-left')}
                            disabled={rightSelection.size === 0 || leftVersionId === rightVersionId}
                            className="p-3.5 bg-primary hover:bg-primary/90 disabled:bg-surface-container-highest disabled:text-on-surface-variant/50 disabled:cursor-not-allowed text-on-primary rounded-full shadow-lg transition-all transform hover:scale-105"
                            title="Copy selected to Left"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Right Pane */}
                    <div className="flex flex-col gap-3 min-w-0">
                        <div className="flex items-center justify-between">
                            <select
                                value={rightVersionId}
                                onChange={(e) => setRightVersionId(e.target.value)}
                                className="flex-1 p-2 border border-outline-variant rounded-md bg-surface text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                            >
                                {project.versions.map(v => (
                                    <option key={v.id} value={v.id}>{v.name} ({v.boxes.length} tags)</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center justify-between text-xs text-on-surface-variant px-1">
                            <span>{rightBoxes.length} tags shown</span>
                            <button onClick={() => toggleAll('right')} className="hover:text-primary font-medium">
                                {rightSelection.size === rightBoxes.length && rightBoxes.length > 0 ? "Deselect All" : "Select All"}
                            </button>
                        </div>
                        {renderBoxList(rightBoxes, 'right', rightSelection)}
                    </div>

                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-outline-variant bg-surface-container-high/30 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-2.5 bg-surface-container border border-outline-variant rounded-full shadow-sm text-sm font-medium text-on-surface hover:bg-surface-container-highest transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TagMigrationModal;