import React from 'react';
import { X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  ['Ctrl/⌘ + Z', 'Undo'],
  ['Ctrl/⌘ + Shift + Z', 'Redo'],
  ['Ctrl/⌘ + Y', 'Redo'],
  ['Ctrl/⌘ + C', 'Copy selected region'],
  ['Ctrl/⌘ + V', 'Paste copied region'],
  ['Delete / Backspace', 'Delete selected region'],
  ['Mouse wheel + Ctrl/⌘', 'Zoom PDF'],
  ['Middle mouse / Hand tool', 'Pan PDF'],
];

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center" onClick={onClose}>
      <div className="bg-surface-container border border-outline-variant rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-xl text-on-surface">Keyboard Shortcuts</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container-highest text-on-surface-variant" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map(([keys, label]) => (
            <div key={keys} className="flex items-center justify-between gap-4 py-2 border-b border-outline-variant/50 last:border-0">
              <span className="text-sm text-on-surface-variant">{label}</span>
              <kbd className="text-xs font-bold bg-surface-container-highest border border-outline-variant rounded-md px-2 py-1 text-on-surface whitespace-nowrap">
                {keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
