import React from 'react';
import { X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  ['Ctrl/Cmd + Z', 'Undo'],
  ['Ctrl/Cmd + Shift + Z', 'Redo'],
  ['Ctrl/Cmd + Y', 'Redo'],
  ['Ctrl/Cmd + C', 'Copy selected region'],
  ['Ctrl/Cmd + V', 'Paste copied region'],
  ['PageUp / Alt + Left', 'Previous page'],
  ['PageDown / Alt + Right', 'Next page'],
  ['Delete / Backspace', 'Delete selected region'],
  ['Mouse wheel + Ctrl/Cmd', 'Zoom PDF'],
  ['Middle mouse / Hand tool', 'Pan PDF'],
];

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const [appVersion, setAppVersion] = React.useState<string | null>(null);
  const [isCheckingUpdates, setIsCheckingUpdates] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    if (!window.electronAPI?.getAppVersion) {
      setAppVersion(null);
      return;
    }

    let isMounted = true;
    window.electronAPI.getAppVersion()
      .then(version => {
        if (isMounted) setAppVersion(version);
      })
      .catch(() => {
        if (isMounted) setAppVersion(null);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI?.checkForUpdates) return;
    setIsCheckingUpdates(true);
    try {
      await window.electronAPI.checkForUpdates();
    } finally {
      setIsCheckingUpdates(false);
    }
  };

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

        <div className="mt-5 pt-4 border-t border-outline-variant/70 text-sm text-on-surface-variant space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="font-bold text-on-surface">Smart PDF Tagger</span>
            {appVersion && <span className="text-xs font-medium">v{appVersion}</span>}
          </div>
          <p>
            A focused desktop tool for tagging PDF regions, managing project versions, and exporting annotated PDF, CSV, and project data.
          </p>
          {window.electronAPI?.checkForUpdates && (
            <button
              type="button"
              onClick={handleCheckForUpdates}
              disabled={isCheckingUpdates}
              className="mt-2 px-3 py-1.5 rounded-full bg-surface-container-highest border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container-high disabled:opacity-60 disabled:cursor-wait"
            >
              {isCheckingUpdates ? 'Checking...' : 'Check for Updates'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
