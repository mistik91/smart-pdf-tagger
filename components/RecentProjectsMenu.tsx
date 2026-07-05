import React from 'react';
import { Clock, FolderOpen, Trash2, X } from 'lucide-react';
import { RecentProject } from '../utils/recentProjects';

interface RecentProjectsMenuProps {
  projects: RecentProject[];
  onOpen: (filePath: string) => void;
  onRemove: (filePath: string) => void;
  onClear: () => void;
  compact?: boolean;
}

const formatOpenedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const RecentProjectsMenu: React.FC<RecentProjectsMenuProps> = ({
  projects,
  onOpen,
  onRemove,
  onClear,
  compact = false,
}) => {
  if (projects.length === 0) {
    return (
      <div className={`${compact ? 'p-3' : 'p-4'} text-sm text-on-surface-variant text-center`}>
        No recent projects yet.
      </div>
    );
  }

  return (
    <div className={compact ? 'p-2' : 'rounded-2xl border border-outline-variant bg-surface-container-high p-3 text-left'}>
      <div className="flex items-center justify-between gap-3 px-1 pb-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          <Clock className="w-3.5 h-3.5" />
          Recent Projects
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-on-surface-variant hover:text-on-surface px-2 py-1 rounded-full hover:bg-surface-container-highest"
        >
          Clear
        </button>
      </div>

      <div className="space-y-1 max-h-72 overflow-y-auto scrollbar-thin">
        {projects.map(project => (
          <div
            key={project.filePath}
            className="group grid grid-cols-[1fr_auto] gap-2 rounded-xl hover:bg-surface-container-highest transition-colors"
          >
            <button
              type="button"
              onClick={() => onOpen(project.filePath)}
              className="min-w-0 flex items-start gap-2 px-3 py-2 text-left"
              title={project.filePath}
            >
              <FolderOpen className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-on-surface">{project.name}</span>
                <span className="block truncate text-xs text-on-surface-variant">{project.filePath}</span>
                {formatOpenedAt(project.openedAt) && (
                  <span className="block text-[11px] text-on-surface-variant/80">{formatOpenedAt(project.openedAt)}</span>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(project.filePath)}
              className="self-center mr-2 p-2 rounded-full text-on-surface-variant hover:text-error hover:bg-error/10 opacity-70 group-hover:opacity-100 transition-all"
              aria-label={`Remove ${project.name} from recent projects`}
              title="Remove from recent projects"
            >
              {compact ? <X className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentProjectsMenu;
