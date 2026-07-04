import React from 'react';
import { ZoomIn, ZoomOut, Hand, BoxSelect, Moon, Sun, Save, FolderOpen, Download, FileDown, Cloud, Settings, Undo, Redo, Copy, ClipboardPaste, HelpCircle } from 'lucide-react';
import { ToolState } from '../types';

interface ToolbarProps {
    scale: number;
    onZoom: (val: number) => void;
    tool: ToolState;
    setTool: (t: ToolState) => void;
    isDarkMode: boolean;
    setIsDarkMode: (v: boolean) => void;
    onSave: () => void;
    onOpen: () => void;
    onExportPdf: () => void;
    onExportJson: () => void; // Save As
    onCloud: () => void;
    onSettings: () => void;
    onHelp: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onCopy: () => void;
    onPaste: () => void;
    hasClipboard: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
    scale, onZoom, tool, setTool, isDarkMode, setIsDarkMode,
    onSave, onOpen, onExportPdf, onExportJson, onCloud, onSettings,
    onUndo, onRedo, onCopy, onPaste, hasClipboard, onHelp
}) => {
    return (
        <div className="h-16 border-b border-outline-variant bg-surface-container flex items-center px-6 justify-between transition-colors duration-200 z-50 relative shadow-sm">
            {/* Left: File Actions */}
            <div className="flex items-center gap-3">
                <button onClick={onOpen} aria-label="Open Project" className="p-3 hover:bg-surface-container-highest rounded-full text-on-surface-variant hover:text-on-surface transition-all" title="Open Project (JSON)">
                    <FolderOpen className="w-5 h-5" />
                </button>
                <button onClick={onSave} aria-label="Save Project" className="p-3 hover:bg-surface-container-highest rounded-full text-on-surface-variant hover:text-on-surface transition-all" title="Save">
                    <Save className="w-5 h-5" />
                </button>
                <button onClick={onExportJson} aria-label="Save As Project JSON" className="p-3 hover:bg-surface-container-highest rounded-full text-on-surface-variant hover:text-on-surface transition-all" title="Save As Project JSON">
                    <Download className="w-5 h-5" />
                </button>
                <button onClick={onExportPdf} aria-label="Export PDF with Annotations" className="p-3 hover:bg-surface-container-highest rounded-full text-on-surface-variant hover:text-on-surface transition-all" title="Export PDF with Annotations">
                    <FileDown className="w-5 h-5" />
                </button>
                <button onClick={onCloud} aria-label="Cloud Storage" className="p-3 hover:bg-surface-container-highest rounded-full text-on-surface-variant hover:text-on-surface transition-all" title="Cloud Storage">
                    <Cloud className="w-5 h-5" />
                </button>
            </div>

            {/* Center: Tools */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface-container-high p-1.5 rounded-full border border-outline-variant shadow-sm">
                <button
                    onClick={() => setTool(ToolState.DRAW)}
                    className={`p-2.5 rounded-full transition-all ${tool === ToolState.DRAW ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'}`}
                    aria-label="Draw Box"
                    title="Draw Box"
                >
                    <BoxSelect className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setTool(ToolState.HAND)}
                    className={`p-2.5 rounded-full transition-all ${tool === ToolState.HAND ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'}`}
                    aria-label="Pan Tool"
                    title="Pan Tool"
                >
                    <Hand className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-outline-variant mx-1" />
                <button onClick={() => onZoom(scale - 0.1)} aria-label="Zoom Out" className="p-2 hover:bg-surface-container-highest rounded-full text-on-surface-variant transition-colors">
                    <ZoomOut className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold w-14 text-center text-on-surface">{Math.round(scale * 100)}%</span>
                <button onClick={() => onZoom(scale + 0.1)} aria-label="Zoom In" className="p-2 hover:bg-surface-container-highest rounded-full text-on-surface-variant transition-colors">
                    <ZoomIn className="w-5 h-5" />
                </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 mr-2 border-r border-outline-variant pr-4">
                    <button onClick={onUndo} aria-label="Undo" className="p-2.5 hover:bg-surface-container-highest rounded-full text-on-surface-variant hover:text-on-surface transition-colors" title="Undo (Ctrl+Z)">
                        <Undo className="w-5 h-5" />
                    </button>
                    <button onClick={onRedo} aria-label="Redo" className="p-2.5 hover:bg-surface-container-highest rounded-full text-on-surface-variant hover:text-on-surface transition-colors" title="Redo">
                        <Redo className="w-5 h-5" />
                    </button>
                    <button onClick={onCopy} aria-label="Copy Region" className="p-2.5 hover:bg-surface-container-highest rounded-full text-on-surface-variant hover:text-on-surface transition-colors" title="Copy (Ctrl+C)">
                        <Copy className="w-5 h-5" />
                    </button>
                    <button onClick={onPaste} aria-label="Paste Region" disabled={!hasClipboard} className={`p-2.5 rounded-full transition-colors ${hasClipboard ? 'hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface' : 'text-outline-variant/50'}`} title="Paste (Ctrl+V)">
                        <ClipboardPaste className="w-5 h-5" />
                    </button>
                </div>

                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    aria-label="Toggle Theme"
                    className="p-3 hover:bg-surface-container-highest rounded-full text-on-surface-variant hover:text-primary transition-colors"
                >
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button onClick={onSettings} aria-label="Settings" className="p-3 hover:bg-surface-container-highest rounded-full text-on-surface-variant hover:text-on-surface transition-colors">
                    <Settings className="w-5 h-5" />
                </button>
                <button onClick={onHelp} aria-label="Keyboard Shortcuts" className="p-3 hover:bg-surface-container-highest rounded-full text-on-surface-variant hover:text-on-surface transition-colors" title="Keyboard Shortcuts">
                    <HelpCircle className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};
