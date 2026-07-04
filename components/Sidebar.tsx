import React, { useEffect, useMemo, useState } from 'react';
import { BoundingBox, TAG_COLORS, ProjectData } from '../types';
import { Trash2, MapPin, Search, Download, Tag, X, Clock, ArrowRightLeft, Plus, CheckSquare, Square } from 'lucide-react';
import { AnnotationSortMode, BatchEditOptions, sortBoxes } from '../utils/annotationUtils';

interface SidebarProps {
  boxes: BoundingBox[];
  filteredBoxes: BoundingBox[];
  currentPage: number;
  onDeleteBox: (id: string) => void;
  onJumpToPage: (page: number) => void;
  onFocusBox: (id: string) => void;
  onExportCsv: () => void;
  filterText: string;
  setFilterText: (text: string) => void;
  selectedColor: string | null;
  setSelectedColor: (color: string | null) => void;
  // Version Control Props
  project: ProjectData | null;
  onVersionChange: (id: string) => void;
  onRenameVersion: (id: string, name: string) => void;
  onUploadNewVersion: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenMigration: () => void;
  onBatchEdit: (options: BatchEditOptions) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  boxes,
  filteredBoxes,
  currentPage,
  onDeleteBox,
  onJumpToPage,
  onFocusBox,
  onExportCsv,
  filterText,
  setFilterText,
  selectedColor,
  setSelectedColor,
  project,
  onVersionChange,
  onRenameVersion,
  onUploadNewVersion,
  onOpenMigration,
  onBatchEdit
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchColor, setBatchColor] = useState("");
  const [batchDescription, setBatchDescription] = useState("");
  const [batchTags, setBatchTags] = useState("");
  const [sortMode, setSortMode] = useState<AnnotationSortMode>('page');
  const activeVersion = project?.versions.find(version => version.id === project.activeVersionId);
  const [versionNameDraft, setVersionNameDraft] = useState(activeVersion?.name || '');

  useEffect(() => {
    setVersionNameDraft(activeVersion?.name || '');
  }, [activeVersion?.id, activeVersion?.name]);

  const topTags = useMemo(() => {
    const counts: Record<string, number> = {};
    boxes.forEach(box => {
      box.tags?.forEach(tag => {
        const t = tag.trim();
        if (t) counts[t] = (counts[t] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [boxes]);

  const boxesByPage = useMemo(() => {
    return sortBoxes(filteredBoxes, sortMode).reduce((acc, box) => {
      if (!acc[box.page]) acc[box.page] = [];
      acc[box.page].push(box);
      return acc;
    }, {} as Record<number, BoundingBox[]>);
  }, [filteredBoxes, sortMode]);

  const handleTagClick = (tag: string) => {
    if (filterText === tag) {
      setFilterText("");
    } else {
      setFilterText(tag);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const applyBatchEdit = () => {
    onBatchEdit({
      ids: selectedIds,
      color: batchColor || undefined,
      description: batchDescription || undefined,
      tagsToAdd: batchTags.split(','),
    });
    setSelectedIds([]);
    setBatchColor("");
    setBatchDescription("");
    setBatchTags("");
  };

  const commitVersionName = () => {
    if (!activeVersion) return;
    const trimmedName = versionNameDraft.trim();
    if (!trimmedName) {
      setVersionNameDraft(activeVersion.name);
      return;
    }
    if (trimmedName !== activeVersion.name) {
      onRenameVersion(activeVersion.id, trimmedName);
    }
  };

  return (
    <div className="w-80 bg-surface-container-high border-r border-outline-variant flex flex-col h-full z-10 transition-colors duration-200">
      <div className="p-4 border-b border-outline-variant bg-surface-container-high space-y-4 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-on-surface flex items-center gap-2 text-lg">
            <MapPin className="w-5 h-5 text-primary" />
            Regions ({filteredBoxes.length})
          </h2>
          <button
            onClick={onExportCsv}
            aria-label="Export CSV"
            className="text-on-surface-variant hover:text-primary p-2 rounded-full hover:bg-surface-container-highest transition-colors"
            title="Export to CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Filter tags..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-sm bg-surface-container-highest text-on-surface rounded-full focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-on-surface-variant/70"
          />
          {filterText && (
            <button
              onClick={() => setFilterText("")}
              className="absolute right-3 top-2.5 text-on-surface-variant hover:text-on-surface"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Sort</label>
          <select
            value={sortMode}
            onChange={e => setSortMode(e.target.value as AnnotationSortMode)}
            className="flex-1 bg-surface-container-highest border border-outline-variant text-on-surface py-2 px-3 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="page">Page</option>
            <option value="label">Label</option>
            <option value="color">Color</option>
            <option value="updated">Updated</option>
          </select>
        </div>

        {topTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {topTags.map(([tag, count]) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border ${filterText === tag
                  ? 'bg-secondary-container text-on-secondary-container border-secondary-container'
                  : 'bg-surface text-on-surface-variant border-outline-variant hover:bg-surface-container-highest'
                  }`}
                title={`Filter by ${tag}`}
              >
                <Tag className="w-3 h-3 opacity-70" />
                {tag}
                <span className="opacity-60 ml-0.5">({count})</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedColor(null)}
            className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${selectedColor === null
              ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-surface-container bg-surface'
              : 'border-outline-variant bg-surface-container'
              }`}
            title="All Colors"
          >
            {selectedColor === null && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            {selectedColor !== null && <X className="w-3.5 h-3.5 text-on-surface-variant" />}
          </button>
          {TAG_COLORS.map(color => (
            <button
              key={color}
              onClick={() => setSelectedColor(color === selectedColor ? null : color)}
              className={`w-6 h-6 rounded-full transition-all flex-shrink-0 ${selectedColor === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-container scale-110' : 'hover:scale-110 opacity-80 hover:opacity-100 border border-transparent hover:border-outline-variant'
                }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        {selectedIds.length > 0 && (
          <div className="rounded-xl border border-outline-variant bg-surface p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">{selectedIds.length} selected</span>
              <button onClick={() => setSelectedIds([])} className="text-xs text-on-surface-variant hover:text-on-surface">Clear</button>
            </div>
            <input
              value={batchDescription}
              onChange={e => setBatchDescription(e.target.value)}
              placeholder="Set description"
              className="w-full bg-surface-container-highest border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              value={batchTags}
              onChange={e => setBatchTags(e.target.value)}
              placeholder="Add tags"
              className="w-full bg-surface-container-highest border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex items-center gap-2">
              <select
                value={batchColor}
                onChange={e => setBatchColor(e.target.value)}
                className="flex-1 bg-surface-container-highest border border-outline-variant rounded-lg px-2 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Keep color</option>
                {TAG_COLORS.map(color => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
              <button
                onClick={applyBatchEdit}
                className="px-3 py-2 rounded-full bg-primary text-on-primary text-xs font-bold hover:bg-primary/90"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {filteredBoxes.length === 0 ? (
          <div className="text-center text-on-surface-variant mt-10">
            <Search className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="text-base font-medium">{(filterText || selectedColor) ? "No matches found." : "No tags yet."}</p>
            {(!filterText && !selectedColor) && <p className="text-sm mt-1 opacity-70">Draw a box on the PDF to start.</p>}
          </div>
        ) : (
          Object.keys(boxesByPage).map((pageStr) => {
            const pageNum = parseInt(pageStr);
            const pageBoxes = boxesByPage[pageNum];

            return (
              <div key={pageNum} className="space-y-2">
                <div
                  className="text-xs font-bold text-primary uppercase tracking-wider cursor-pointer hover:underline transition-colors sticky top-0 bg-surface-container-high z-10 py-2"
                  onClick={() => onJumpToPage(pageNum)}
                >
                  Page {pageNum}
                </div>
                <div className="space-y-3">
                  {pageBoxes.map((box) => (
                    <div
                      key={box.id}
                      className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer ${currentPage === pageNum
                        ? 'bg-secondary-container border-transparent shadow-sm'
                        : 'bg-surface border-transparent hover:bg-surface-container-highest'
                        }`}
                      onClick={() => {
                        if (currentPage !== pageNum) onJumpToPage(pageNum);
                        onFocusBox(box.id);
                      }}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelected(box.id);
                          }}
                          className="text-on-surface-variant hover:text-primary transition-colors mt-1"
                          title={selectedIds.includes(box.id) ? "Deselect for batch edit" : "Select for batch edit"}
                        >
                          {selectedIds.includes(box.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                        {/* Color Indicator */}
                        <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: box.color || TAG_COLORS[2] }} />

                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-base truncate ${currentPage === pageNum ? 'text-on-secondary-container' : 'text-on-surface'}`} title={box.label}>{box.label || "Untitled"}</div>
                          {box.description && (
                            <div className={`text-sm mt-1 line-clamp-2 flex items-start gap-1.5 ${currentPage === pageNum ? 'text-on-secondary-container/80' : 'text-on-surface-variant'}`}>
                              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" title="Has comment" />
                              <span>{box.description}</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteBox(box.id);
                          }}
                          className="text-on-surface-variant hover:bg-red-500/10 hover:text-red-400 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete Tag"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {box.tags && box.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5 pl-4">
                          {box.tags.map((tag, i) => (
                            <span key={i} className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md ${currentPage === pageNum
                              ? 'bg-on-secondary-container/10 text-on-secondary-container'
                              : 'bg-surface-container-highest text-on-surface-variant'
                              }`}>
                              <Tag className="w-2.5 h-2.5 mr-1 opacity-50" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Version Control Section */}
      {
        project && (
          <div className="p-4 border-t border-outline-variant bg-surface-container-high mt-auto space-y-3">
            <h3 className="font-bold text-on-surface-variant text-xs uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Version Control
            </h3>

            <div className="relative">
              <select
                aria-label="Project version"
                value={project.activeVersionId}
                onChange={(e) => onVersionChange(e.target.value)}
                className="w-full appearance-none bg-surface-container-highest border border-outline-variant text-on-surface py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium hover:bg-surface-container cursor-pointer transition-colors"
              >
                {project.versions.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({new Date(v.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
              <ArrowRightLeft className="w-4 h-4 text-on-surface-variant absolute right-3 top-3 pointer-events-none" />
            </div>

            {activeVersion && (
              <input
                aria-label="Version name"
                value={versionNameDraft}
                onChange={event => setVersionNameDraft(event.target.value)}
                onBlur={commitVersionName}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.currentTarget.blur();
                  }
                  if (event.key === 'Escape') {
                    setVersionNameDraft(activeVersion.name);
                    event.currentTarget.blur();
                  }
                }}
                className="w-full bg-surface-container-highest border border-outline-variant text-on-surface py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            )}

            <div className="flex gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-on-primary py-2.5 rounded-full text-sm font-bold cursor-pointer transition-all shadow-sm">
                <Plus className="w-4 h-4" />
                New Version
                <input type="file" accept="application/pdf" aria-label="New version PDF" className="hidden" onChange={onUploadNewVersion} />
              </label>
              <button
                onClick={onOpenMigration}
                className="p-2.5 bg-secondary-container hover:bg-secondary-container/80 text-on-secondary-container rounded-full transition-colors"
                title="Compare & Sync Versions"
              >
                <ArrowRightLeft className="w-5 h-5" />
              </button>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Sidebar;
