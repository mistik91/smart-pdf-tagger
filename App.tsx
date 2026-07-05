import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Upload, Plus, Layers, ArrowRightLeft, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import emptyAnnotationImage from './assets/empty-annotation.png';
import PdfViewer from './components/PdfViewer';
import Sidebar from './components/Sidebar';
import TagMigrationModal from './components/TagMigrationModal';
import CloudModal from './components/CloudModal';
import ExportOptionsModal from './components/ExportOptionsModal';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import TemplateSettings from './components/TemplateSettings';
import { Toolbar } from './components/Toolbar';
import { DuplicateRule, ToolState } from './types';
import { getCloudProvider } from './services/cloudService';
import { exportAnnotatedPdf } from './services/pdfExportService';
import { useAnnotations } from './hooks/useAnnotations';
import { useClipboard } from './hooks/useClipboard';
import { useProjectModel } from './hooks/useProjectModel';
import { parseProjectJson } from './utils/projectValidation';
import { loadTemplateFields, saveTemplateFields, TagTemplateField } from './utils/tagTemplates';
import { buildAnnotationCsv, CsvField, PdfExportOptions } from './utils/exportOptions';

// Helper to detect if running in an iframe (where File System API is often blocked)
const isRunningInIframe = () => {
  try {
    return window.self !== window.top || (window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0);
  } catch (e) {
    return true;
  }
};

const getProjectDownloadName = (name: string) => `${name}_project.json`;

const cleanJsonFileName = (fileName: string) => {
  const cleanName = fileName.trim().replace(/[\\/:*?"<>|]+/g, "_");
  if (!cleanName) return null;
  return cleanName.toLowerCase().endsWith('.json') ? cleanName : `${cleanName}.json`;
};

const App: React.FC = () => {
  // 1. Hooks - State Management
  const {
    project, setProject, pdfFile, currentPage, setCurrentPage,
    initializeProjectFromPdf, loadProject, switchVersion, createNewVersion, saveProject,
    autoSaveInterval, setAutoSaveInterval, lastAutoSave, setLastAutoSave,
    autoSaveError, setAutoSaveError, buildSyncedProject, updateProjectMetadata, renameVersion
  } = useProjectModel();

  const {
    boxes, activeBoxId, setActiveBoxId,
    addToHistory, addBox, updateBox, deleteBox, undo, redo,
    getFilteredBoxes, setBoxes, batchEdit
  } = useAnnotations();

  const { clipboard, copy, paste } = useClipboard(boxes, activeBoxId, currentPage, addToHistory, setActiveBoxId);

  // 2. View State (Local UI)
  const [scale, setScale] = useState(1.0);
  const [tool, setTool] = useState<ToolState>(ToolState.DRAW);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [duplicateRule, setDuplicateRule] = useState<DuplicateRule>(DuplicateRule.GLOBAL_BLOCK);
  const [tagTemplates, setTagTemplates] = useState<TagTemplateField[]>(() => loadTemplateFields());

  // 3. Modals
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isExportOptionsOpen, setIsExportOptionsOpen] = useState(false);
  const [electronProjectPath, setElectronProjectPath] = useState<string | null>(null);

  // 4. Cloud Provider
  const [activeCloudProviderType, setActiveCloudProviderType] = useState<string>('browser');
  const cloudProvider = useMemo(() => getCloudProvider(activeCloudProviderType), [activeCloudProviderType]);

  // -- Connect Hooks --

  // Dark Mode Effect
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    saveTemplateFields(tagTemplates);
  }, [tagTemplates]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copy();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        paste();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeBoxId) {
          e.preventDefault();
          deleteBox(activeBoxId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, copy, paste, deleteBox, activeBoxId]);

  // Auto-Save Orchestration (App Layer)
  // We need to pass the *current* boxes to the saver
  const boxesRef = useRef(boxes);
  useEffect(() => { boxesRef.current = boxes; }, [boxes]);

  useEffect(() => {
    if (autoSaveInterval === 0) return;
    const timer = setInterval(async () => {
      // We use the buildSyncedProject helper from the hook, forcing a "silent" save to localStorage
      if (project) {
        const synced = buildSyncedProject(project, boxesRef.current);
        try {
          const backupKey = `smart_tagger_autosave_backup_${synced.id}`;
          localStorage.setItem(backupKey, JSON.stringify(synced));
          setLastAutoSave(new Date());
          setAutoSaveError(null);
        } catch (e) {
          console.warn("Auto-save failed", e);
          setAutoSaveError("Local storage full");
        }
      }
    }, autoSaveInterval);
    return () => clearInterval(timer);
  }, [autoSaveInterval, project, buildSyncedProject]);

  // -- Handlers --

  const handleVersionChange = async (vid: string) => {
    const newBoxes = await switchVersion(vid, boxes);
    if (newBoxes) setBoxes(newBoxes);
  };

  const handleUploadNewVersionWrapped = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    if (!project) {
      await initializeProjectFromPdf(file);
      setBoxes([]); // Clear boxes for new project
      setElectronProjectPath(null);
      e.target.value = '';
      return;
    }

    // Prompt migration
    let shouldCopy = false;
    if (boxes.length > 0) {
      const currentName = project.versions.find(v => v.id === project.activeVersionId)?.name || "Current";
      shouldCopy = window.confirm(`Copy ${boxes.length} tags from "${currentName}"?`);
    }

    const newBoxes = await createNewVersion(file, boxes, shouldCopy);
    if (newBoxes) setBoxes(newBoxes);
    e.target.value = '';
  };

  const handleOpenProjectWrapped = async () => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.openProject();
        if (result.canceled || !result.text) return;

        const data = parseProjectJson(result.text);
        const loadedBoxes = await loadProject(data, null);
        setBoxes(loadedBoxes);
        setElectronProjectPath(result.filePath || null);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Could not open project file.");
      }
      return;
    }

    const triggerInputFallback = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.setAttribute('aria-label', 'Open project JSON');
      input.style.display = 'none';
      document.body.appendChild(input);
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (re) => {
            const res = re.target?.result;
            if (typeof res === 'string') {
              try {
                const data = parseProjectJson(res);
                const loadedBoxes = await loadProject(data, null);
                setBoxes(loadedBoxes);
                setElectronProjectPath(null);
              } catch (error) {
                alert(error instanceof Error ? error.message : "Could not open project file.");
              }
            }
          };
          reader.readAsText(file);
        }
        document.body.removeChild(input);
      };
      input.click();
    };

    // @ts-ignore
    if (window.showOpenFilePicker && !isRunningInIframe()) {
      try {
        // @ts-ignore
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: 'SmartTagger Project', accept: { 'application/json': ['.json'] } }],
          multiple: false,
        });
        const file = await handle.getFile();
        const text = await file.text();
        const data = parseProjectJson(text);
        const loadedBoxes = await loadProject(data, handle);
        setBoxes(loadedBoxes);
        setElectronProjectPath(null);
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') {
          alert(e.message);
        }
      }
    } else {
      triggerInputFallback();
    }
  };

  const handleExportPdfWrapped = async (options: PdfExportOptions) => {
    if (!project) return;
    try {
      await exportAnnotatedPdf({ project, boxes, options });
      setIsExportOptionsOpen(false);
    } catch (e) {
      alert("Export failed.");
    }
  };

  const handleExportCsvWrapped = (fields: CsvField[]) => {
    if (!project) return;
    const csv = buildAnnotationCsv(boxes, { fields });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name || 'tags'}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExportOptionsOpen(false);
  };

  const handleSaveAsProject = async () => {
    if (!project) return;
    const syncedProject = buildSyncedProject(project, boxes);
    const suggestedName = getProjectDownloadName(syncedProject.name);

    if (window.electronAPI) {
      const result = await window.electronAPI.saveProjectAs({
        text: JSON.stringify(syncedProject, null, 2),
        suggestedName,
      });
      if (!result.canceled && result.filePath) {
        setProject(syncedProject);
        setElectronProjectPath(result.filePath);
      }
      return;
    }

    const requestedName = window.prompt("Save project as", suggestedName);
    if (!requestedName) return;

    const cleanName = cleanJsonFileName(requestedName);
    if (!cleanName) return;

    await saveProject(boxes, {
      saveAs: true,
      fileName: cleanName,
    });
  };

  const handleSaveProject = async () => {
    if (!project) return;

    if (window.electronAPI) {
      const syncedProject = buildSyncedProject(project, boxes);
      const result = await window.electronAPI.saveProject({
        filePath: electronProjectPath || undefined,
        text: JSON.stringify(syncedProject, null, 2),
        suggestedName: getProjectDownloadName(syncedProject.name),
      });

      if (!result.canceled) {
        setProject(syncedProject);
        if (result.filePath) setElectronProjectPath(result.filePath);
      }
      return;
    }

    await saveProject(boxes);
  };

  // -- Render --

  // Initial Empty State
  if (!pdfFile || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface text-on-surface transition-colors">
        <div className="text-center space-y-6 max-w-md px-6">
          <div className="relative w-32 h-36 mx-auto mb-4">
            <img
              src={emptyAnnotationImage}
              alt=""
              className="absolute inset-0 w-full h-full object-contain drop-shadow-xl"
              aria-hidden="true"
            />
            <div className="absolute -bottom-2 -right-2 w-11 h-11 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg">
              <Upload className="w-5 h-5" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-on-surface">Smart PDF Tagger</h1>
          <p className="text-on-surface-variant">
            Upload a PDF to start annotating, or open an existing project.
          </p>

          <div className="flex flex-col gap-3 w-full">
            <label className="flex items-center justify-center gap-2 bg-primary hover:bg-opacity-90 text-on-primary px-6 py-4 rounded-full cursor-pointer transition-all shadow-md hover:shadow-lg w-full font-medium">
              <Plus className="w-5 h-5" />
              <span>New Project from PDF</span>
              <input type="file" accept="application/pdf" aria-label="New project PDF" className="hidden" onChange={handleUploadNewVersionWrapped} />
            </label>

            <button
              onClick={handleOpenProjectWrapped}
              className="flex items-center justify-center gap-2 bg-surface-container-high border border-outline-variant text-on-surface-variant px-6 py-4 rounded-full hover:bg-surface-container-highest transition-all w-full font-medium"
            >
              <Layers className="w-5 h-5" />
              <span>Open Project File</span>
            </button>

            <button
              onClick={() => setIsCloudModalOpen(true)}
              className="flex items-center justify-center gap-2 text-primary hover:underline mt-2 text-sm"
            >
              <span>Open from Cloud...</span>
            </button>
          </div>
        </div>

        {/* Cloud Modal for Initial Load */}
        <CloudModal
          isOpen={isCloudModalOpen}
          onClose={() => setIsCloudModalOpen(false)}
          provider={cloudProvider}
          onLoadProject={async (data) => {
            const loadedBoxes = await loadProject(data, null);
            setBoxes(loadedBoxes);
            setIsCloudModalOpen(false);
          }}
          activeProviderType={activeCloudProviderType}
          onProviderChange={setActiveCloudProviderType}
          currentProject={null}
          onSaveCurrent={async () => {}}
        />
      </div>
    );
  }

  const filteredBoxes = getFilteredBoxes(filterText, selectedColor);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface text-on-surface font-sans transition-colors duration-200">
      <Toolbar
        scale={scale} onZoom={(s) => setScale(Math.min(3, Math.max(0.5, s)))}
        tool={tool} setTool={setTool}
        isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}
        onSave={handleSaveProject}
        onOpen={handleOpenProjectWrapped}
        onExportPdf={() => setIsExportOptionsOpen(true)}
        onExportJson={handleSaveAsProject}
        onCloud={() => setIsCloudModalOpen(true)}
        onSettings={() => setIsSettingsOpen(true)}
        onHelp={() => setIsHelpOpen(true)}
        onUndo={undo} onRedo={redo}
        onCopy={copy} onPaste={paste}
        hasClipboard={!!clipboard}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          boxes={boxes}
          filteredBoxes={filteredBoxes}
          currentPage={currentPage}
          onDeleteBox={deleteBox}
          onJumpToPage={setCurrentPage}
          onFocusBox={setActiveBoxId}
          onExportCsv={() => setIsExportOptionsOpen(true)}
          filterText={filterText}
          setFilterText={setFilterText}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          project={project}
          onVersionChange={handleVersionChange}
          onRenameVersion={renameVersion}
          onUploadNewVersion={handleUploadNewVersionWrapped}
          onOpenMigration={() => setIsMigrationModalOpen(true)}
          onBatchEdit={batchEdit}
        />

        <div className="flex-1 relative bg-surface-container">
          <PdfViewer
            pdfUrl={pdfFile}
            currentPage={currentPage}
            scale={scale}
            onZoom={setScale}
            onPageChange={setCurrentPage}
            boxes={boxes}
            visibleBoxes={filteredBoxes}
            activeBoxId={activeBoxId}
            onSetActiveBox={setActiveBoxId} // ID only
            onAddBox={addBox}
            onUpdateBox={updateBox}
            onDeleteBox={deleteBox}
            tool={tool}
            duplicateRule={duplicateRule}
            tagTemplates={tagTemplates}
          />

          {/* Auto Save Indicator */}
          {autoSaveInterval > 0 && (
            <div className="absolute bottom-4 right-4 bg-surface-container/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium shadow-sm flex items-center gap-2 border border-outline-variant">
              {autoSaveError ? (
                <span className="text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {autoSaveError}
                </span>
              ) : (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Saved {lastAutoSave ? lastAutoSave.toLocaleTimeString() : 'Just now'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CloudModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        provider={cloudProvider}
        onLoadProject={async (data) => {
          const loadedBoxes = await loadProject(data, null);
          setBoxes(loadedBoxes);
          setIsCloudModalOpen(false);
        }}
        activeProviderType={activeCloudProviderType}
        onProviderChange={setActiveCloudProviderType}
        currentProject={project}
        onSaveCurrent={async () => {
          if (!project) return;
          await cloudProvider.saveProject(buildSyncedProject(project, boxes));
        }}
      />

      {/* Migration Modal */}
      <TagMigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
        project={project}
        onUpdateProject={(p) => setProject(p)}
      />

      <KeyboardShortcutsModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      <ExportOptionsModal
        isOpen={isExportOptionsOpen}
        onClose={() => setIsExportOptionsOpen(false)}
        onExportPdf={handleExportPdfWrapped}
        onExportCsv={handleExportCsvWrapped}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center animate-in fade-in duration-200" onClick={() => setIsSettingsOpen(false)}>
          <div className="bg-surface-container p-8 rounded-3xl shadow-xl max-w-2xl w-full border border-outline-variant max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-2xl mb-6 text-on-surface flex items-center gap-2">
              Settings
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-on-surface-variant">Auto-Save Interval</label>
                <div className="relative">
                  <select
                    aria-label="Auto-save interval"
                    value={autoSaveInterval}
                    onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                    className="w-full appearance-none bg-surface-container-highest border border-outline-variant text-on-surface p-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  >
                    <option value={0}>Disabled</option>
                    <option value={30000}>Every 30 Seconds</option>
                    <option value={60000}>Every Minute</option>
                    <option value={300000}>Every 5 Minutes</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-on-surface-variant">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-on-surface-variant">Duplicate Label Rule</label>
                <div className="relative">
                  <select
                    aria-label="Duplicate label rule"
                    value={duplicateRule}
                    onChange={(e) => setDuplicateRule(e.target.value as DuplicateRule)}
                    className="w-full appearance-none bg-surface-container-highest border border-outline-variant text-on-surface p-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  >
                    <option value={DuplicateRule.GLOBAL_BLOCK}>Block duplicates in project</option>
                    <option value={DuplicateRule.PAGE_BLOCK}>Block duplicates on same page</option>
                    <option value={DuplicateRule.WARN_ONLY}>Warn before saving duplicates</option>
                    <option value={DuplicateRule.ALLOW}>Allow duplicates</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-on-surface-variant">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                  </div>
                </div>
              </div>
              {project && (
                <div className="rounded-xl border border-outline-variant bg-surface-container-high p-4 space-y-3">
                  <h4 className="font-bold text-on-surface text-sm">Project Metadata</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      aria-label="Client"
                      value={project.metadata?.client || ''}
                      onChange={e => updateProjectMetadata({ client: e.target.value })}
                      placeholder="Client"
                      className="bg-surface-container-highest border border-outline-variant text-on-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      aria-label="Document type"
                      value={project.metadata?.documentType || ''}
                      onChange={e => updateProjectMetadata({ documentType: e.target.value })}
                      placeholder="Document type"
                      className="bg-surface-container-highest border border-outline-variant text-on-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <select
                      aria-label="Project status"
                      value={project.metadata?.status || ''}
                      onChange={e => updateProjectMetadata({ status: e.target.value })}
                      className="bg-surface-container-highest border border-outline-variant text-on-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">No status</option>
                      <option value="Draft">Draft</option>
                      <option value="Review">Review</option>
                      <option value="Approved">Approved</option>
                      <option value="Archived">Archived</option>
                    </select>
                    <input
                      aria-label="Reviewer"
                      value={project.metadata?.reviewer || ''}
                      onChange={e => updateProjectMetadata({ reviewer: e.target.value })}
                      placeholder="Reviewer"
                      className="bg-surface-container-highest border border-outline-variant text-on-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              )}
              <div className="p-4 rounded-xl bg-secondary-container/30 text-xs text-on-surface-variant border border-outline-variant/30 flex items-start gap-2">
                <div className="mt-0.5"><AlertCircle className="w-3.5 h-3.5" /></div>
                Storage: Local Browser Storage (IndexedDB/LocalStorage)
              </div>
              <TemplateSettings
                templates={tagTemplates}
                onChange={setTagTemplates}
              />
            </div>
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-6 py-2.5 bg-primary text-on-primary font-medium rounded-full hover:bg-opacity-90 transition-opacity shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
