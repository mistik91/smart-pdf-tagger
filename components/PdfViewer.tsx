
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { BoundingBox, DuplicateRule, ToolState, TAG_COLORS, ViewMode } from '../types';
import { Loader2, Wand2, Check, Trash2, X, AlertCircle, Plus, Move, MessageSquare } from 'lucide-react';
import { analyzeImageRegion } from '../services/geminiService';
import { getDuplicateLabelMessage, shouldBlockDuplicate } from '../utils/duplicateRules';
import { TagTemplateField } from '../utils/tagTemplates';

interface PdfViewerProps {
  pdfUrl: string;
  currentPage: number;
  scale: number;
  viewMode: ViewMode;
  onZoom: (scale: number) => void;
  onPageChange: (page: number) => void;
  onVisiblePageChange: (page: number) => void;
  onPageCountChange: (pageCount: number) => void;
  boxes: BoundingBox[]; // All boxes for validation/logic
  visibleBoxes?: BoundingBox[]; // Filtered boxes for rendering
  activeBoxId: string | null;
  onSetActiveBox: (id: string | null) => void;
  onAddBox: (box: BoundingBox) => void;
  onUpdateBox: (box: BoundingBox) => void;
  onDeleteBox: (id: string) => void;
  tool: ToolState;
  duplicateRule: DuplicateRule;
  tagTemplates: TagTemplateField[];
}

// Helper to generate UUID
const generateId = () => Math.random().toString(36).substr(2, 9);
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfUrl,
  currentPage,
  scale,
  viewMode,
  onZoom,
  onPageChange,
  onVisiblePageChange,
  onPageCountChange,
  boxes,
  visibleBoxes,
  activeBoxId,
  onSetActiveBox,
  onAddBox,
  onUpdateBox,
  onDeleteBox,
  tool,
  duplicateRule,
  tagTemplates
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const pageCanvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null); // Track active render task
  const continuousRenderTasksRef = useRef<Record<number, any>>({});
  const skipNextPageScrollRef = useRef(false);
  const suppressScrollSyncUntilRef = useRef(0);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [viewportDimensions, setViewportDimensions] = useState<{ w: number; h: number } | null>(null);
  const [pageDimensions, setPageDimensions] = useState<Record<number, { w: number; h: number }>>({});

  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ page: number; x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ page: number; x: number; y: number; w: number; h: number } | null>(null);

  // Dragging (Move) State
  const [dragState, setDragState] = useState<{
    boxId: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number, y: number } | null>(null);
  const [resizeState, setResizeState] = useState<{
    boxId: string;
    handle: ResizeHandle;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
  } | null>(null);
  const [resizeCurrent, setResizeCurrent] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Panning State
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);

  // Edit/AI Popup State
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Expanded Edit Form State
  const [editForm, setEditForm] = useState({
    label: "",
    description: "",
    tags: "", // Comma separated string
    color: TAG_COLORS[2] // Default Emerald
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  // Calculate available unique tags from all boxes for suggestions
  const suggestedTags = useMemo(() => {
    const uniqueTags = new Set<string>();
    boxes.forEach(box => {
      box.tags?.forEach(tag => {
        if (tag.trim()) uniqueTags.add(tag.trim());
      });
    });
    return Array.from(uniqueTags).sort();
  }, [boxes]);

  // Determine which boxes to render
  const boxesToRender = visibleBoxes || boxes;
  const pageNumbers = useMemo(
    () => Array.from({ length: pdfDoc?.numPages || 0 }, (_, index) => index + 1),
    [pdfDoc?.numPages]
  );
  const templateGroups = useMemo(() => {
    return tagTemplates.reduce((groups, field) => {
      if (!groups[field.templateName]) groups[field.templateName] = [];
      groups[field.templateName].push(field);
      return groups;
    }, {} as Record<string, TagTemplateField[]>);
  }, [tagTemplates]);
  const templateGroupEntries = useMemo(
    () => Object.entries(templateGroups) as Array<[string, TagTemplateField[]]>,
    [templateGroups]
  );


  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setRenderError(null);
        setPdfDoc(null); // Clear previous doc immediately
        setPageDimensions({});
        setViewportDimensions(null);

        // Cancel any existing render task if we are loading a new doc
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {
            // ignore
          }
        }
        Object.values(continuousRenderTasksRef.current).forEach((task: any) => {
          try {
            task.cancel();
          } catch (e) {
            // ignore
          }
        });
        continuousRenderTasksRef.current = {};

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const doc = await loadingTask.promise;

        if (!isCancelled) {
          setPdfDoc(doc);
          onPageCountChange(doc.numPages);
          setIsLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Error loading PDF:", err);
          setRenderError("Failed to load PDF.");
          setIsLoading(false);
        }
      }
    };

    if (pdfUrl) {
      loadPdf();
    }

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl, onPageCountChange]);

  useEffect(() => {
    if (!pdfDoc) return;
    if (currentPage > pdfDoc.numPages) onPageChange(pdfDoc.numPages);
    if (currentPage < 1) onPageChange(1);
  }, [currentPage, pdfDoc, onPageChange]);

  // Render Page
  const renderPage = useCallback(async () => {
    if (viewMode !== ViewMode.SINGLE) return;
    if (!pdfDoc || !canvasRef.current) return;
    if (currentPage < 1 || currentPage > pdfDoc.numPages) return;

    // 1. Cancel previous render task if it exists
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (error) {
        // Ignoring cancellation error as it's expected
      }
    }

    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      setViewportDimensions({ w: viewport.width, h: viewport.height });

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      // 2. Start new render task and store reference
      const renderTask = page.render(renderContext as any);
      renderTaskRef.current = renderTask;

      await renderTask.promise;

      // Clear ref if this task finished successfully without being replaced
      if (renderTaskRef.current === renderTask) {
        renderTaskRef.current = null;
      }
    } catch (error: any) {
      if (error?.name === 'RenderingCancelledException') {
        // Expected error when task is cancelled, do nothing
        return;
      }
      console.error("Page render error:", error);
    }
  }, [pdfDoc, currentPage, scale, viewMode]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  const renderContinuousPages = useCallback(async () => {
    if (!pdfDoc || viewMode !== ViewMode.CONTINUOUS) return;

    Object.values(continuousRenderTasksRef.current).forEach((task: any) => {
      try {
        task.cancel();
      } catch (error) {
        // ignore expected cancellation
      }
    });
    continuousRenderTasksRef.current = {};

    const nextDimensions: Record<number, { w: number; h: number }> = {};

    await Promise.all(pageNumbers.map(async (pageNumber) => {
      const canvas = pageCanvasRefs.current[pageNumber];
      if (!canvas) return;

      try {
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        nextDimensions[pageNumber] = { w: viewport.width, h: viewport.height };

        const renderTask = page.render({
          canvasContext: context,
          viewport,
        } as any);
        continuousRenderTasksRef.current[pageNumber] = renderTask;
        await renderTask.promise;

        if (continuousRenderTasksRef.current[pageNumber] === renderTask) {
          delete continuousRenderTasksRef.current[pageNumber];
        }
      } catch (error: any) {
        if (error?.name === 'RenderingCancelledException') return;
        console.error(`Page ${pageNumber} render error:`, error);
      }
    }));

    setPageDimensions(nextDimensions);
  }, [pdfDoc, pageNumbers, scale, viewMode]);

  useEffect(() => {
    renderContinuousPages();
  }, [renderContinuousPages]);

  useEffect(() => {
    if (viewMode !== ViewMode.CONTINUOUS) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateCurrentPageFromScroll = () => {
      if (Date.now() < suppressScrollSyncUntilRef.current) return;

      const containerRect = container.getBoundingClientRect();
      const viewportCenter = containerRect.top + containerRect.height * 0.35;
      let nearestPage = currentPage;
      let nearestDistance = Number.POSITIVE_INFINITY;

      pageNumbers.forEach(pageNumber => {
        const pageEl = pageContainerRefs.current[pageNumber];
        if (!pageEl) return;
        const rect = pageEl.getBoundingClientRect();
        const pageCenter = rect.top + rect.height / 2;
        const distance = Math.abs(pageCenter - viewportCenter);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPage = pageNumber;
        }
      });

      if (nearestPage !== currentPage) {
        skipNextPageScrollRef.current = true;
        onVisiblePageChange(nearestPage);
      }
    };

    container.addEventListener('scroll', updateCurrentPageFromScroll, { passive: true });
    return () => container.removeEventListener('scroll', updateCurrentPageFromScroll);
  }, [currentPage, onVisiblePageChange, pageNumbers, viewMode]);

  useEffect(() => {
    if (viewMode !== ViewMode.CONTINUOUS) return;
    const pageEl = pageContainerRefs.current[currentPage];
    const container = scrollContainerRef.current;
    if (!pageEl || !container) return;
    if (skipNextPageScrollRef.current) {
      skipNextPageScrollRef.current = false;
      return;
    }

    const pageRect = pageEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const isMostlyVisible = pageRect.top >= containerRect.top + 24 && pageRect.top <= containerRect.bottom - 96;
    if (!isMostlyVisible) {
      suppressScrollSyncUntilRef.current = Date.now() + 300;
      pageEl.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  }, [currentPage, viewMode]);

  // Initialize form when active box changes
  useEffect(() => {
    if (activeBoxId) {
      const box = boxes.find(b => b.id === activeBoxId);
      if (box) {
        setEditForm({
          label: box.label || "",
          description: box.description || "",
          tags: box.tags ? box.tags.join(", ") : "",
          color: box.color || TAG_COLORS[2]
        });
        setValidationError(null);
      }
    }
  }, [activeBoxId, boxes]);

  // --- Scroll Wheel Zoom Handler ---
  const scaleRef = useRef(scale);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const ZOOM_SENSITIVITY = 0.002;
        const delta = -e.deltaY * ZOOM_SENSITIVITY;
        const newScale = scaleRef.current + delta;
        onZoom(newScale);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [onZoom]);


  // --- Pointer (Mouse/Touch) Event Handlers ---

  const getPageElement = (page: number) => (
    viewMode === ViewMode.CONTINUOUS ? pageContainerRefs.current[page] : containerRef.current
  );

  const getPageDimensions = (page: number) => (
    viewMode === ViewMode.CONTINUOUS ? pageDimensions[page] : viewportDimensions
  );

  const getRelativeMousePos = (e: React.PointerEvent, page: number) => {
    const pageElement = getPageElement(page);
    if (!pageElement) return { x: 0, y: 0 };
    const rect = pageElement.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const isPointerInsidePage = (e: React.PointerEvent, page: number) => {
    const pageElement = getPageElement(page);
    if (!pageElement) return false;
    const rect = pageElement.getBoundingClientRect();
    return e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  };

  const getPageFromPointer = (e: React.PointerEvent) => {
    if (viewMode === ViewMode.SINGLE) {
      return isPointerInsidePage(e, currentPage) ? currentPage : null;
    }

    return pageNumbers.find(pageNumber => isPointerInsidePage(e, pageNumber)) || null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // If clicking on controls (popup), let it bubble/handle normally
    if ((e.target as HTMLElement).closest('.box-controls')) return;

    // Capture pointer
    (e.currentTarget as Element).setPointerCapture(e.pointerId);

    // MIDDLE MOUSE BUTTON (1) or HAND TOOL (0)
    const isMiddleClick = e.button === 1;
    const isLeftClick = e.button === 0;
    const isHandTool = tool === ToolState.HAND;

    if (isMiddleClick || (isHandTool && isLeftClick)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: scrollContainerRef.current?.scrollLeft || 0,
        scrollTop: scrollContainerRef.current?.scrollTop || 0
      });
      return;
    }

    // DRAW TOOL LOGIC (Only Left Click)
    const targetPage = getPageFromPointer(e);
    if (!isHandTool && isLeftClick && targetPage) {
      onSetActiveBox(null); // Deselect any active box
      onPageChange(targetPage);
      setIsDrawing(true);
      const pos = getRelativeMousePos(e, targetPage);
      setStartPos({ page: targetPage, ...pos });
      setCurrentRect({ page: targetPage, x: pos.x, y: pos.y, w: 0, h: 0 });
    }
  };

  const handleBoxPointerDown = (e: React.PointerEvent, box: BoundingBox) => {
    e.stopPropagation(); // Prevent drawing/panning start from container
    if (tool === ToolState.HAND || isPanning) return;

    // Capture pointer on the box element to track movement
    (e.currentTarget as Element).setPointerCapture(e.pointerId);

    setDragState({
      boxId: box.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: box.x,
      initialY: box.y
    });
    setDragCurrent({ x: box.x, y: box.y });
    onSetActiveBox(box.id);
  };

  const handleResizePointerDown = (e: React.PointerEvent, box: BoundingBox, handle: ResizeHandle) => {
    e.stopPropagation();
    if (tool === ToolState.HAND || isPanning) return;

    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setResizeState({
      boxId: box.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialX: box.x,
      initialY: box.y,
      initialWidth: box.width,
      initialHeight: box.height
    });
    setResizeCurrent({ x: box.x, y: box.y, width: box.width, height: box.height });
    onSetActiveBox(box.id);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // PANNING
    if (isPanning && panStart && scrollContainerRef.current) {
      e.preventDefault();
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      scrollContainerRef.current.scrollLeft = panStart.scrollLeft - dx;
      scrollContainerRef.current.scrollTop = panStart.scrollTop - dy;
      return;
    }

    // DRAGGING (Box)
    const resizeDimensions = resizeState ? getPageDimensions(boxes.find(b => b.id === resizeState.boxId)?.page || currentPage) : null;
    if (resizeState && resizeDimensions) {
      e.preventDefault();
      const dxPct = ((e.clientX - resizeState.startX) / resizeDimensions.w) * 100;
      const dyPct = ((e.clientY - resizeState.startY) / resizeDimensions.h) * 100;

      let x = resizeState.initialX;
      let y = resizeState.initialY;
      let width = resizeState.initialWidth;
      let height = resizeState.initialHeight;

      if (resizeState.handle.includes('e')) width = resizeState.initialWidth + dxPct;
      if (resizeState.handle.includes('s')) height = resizeState.initialHeight + dyPct;
      if (resizeState.handle.includes('w')) {
        x = resizeState.initialX + dxPct;
        width = resizeState.initialWidth - dxPct;
      }
      if (resizeState.handle.includes('n')) {
        y = resizeState.initialY + dyPct;
        height = resizeState.initialHeight - dyPct;
      }

      const minSize = 1;
      if (width < minSize) {
        if (resizeState.handle.includes('w')) x = resizeState.initialX + resizeState.initialWidth - minSize;
        width = minSize;
      }
      if (height < minSize) {
        if (resizeState.handle.includes('n')) y = resizeState.initialY + resizeState.initialHeight - minSize;
        height = minSize;
      }

      if (x < 0) {
        width += x;
        x = 0;
      }
      if (y < 0) {
        height += y;
        y = 0;
      }
      if (x + width > 100) width = 100 - x;
      if (y + height > 100) height = 100 - y;

      setResizeCurrent({ x, y, width, height });
      return;
    }

    const dragDimensions = dragState ? getPageDimensions(boxes.find(b => b.id === dragState.boxId)?.page || currentPage) : null;
    if (dragState && dragDimensions) {
      e.preventDefault();
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;

      const dxPct = (dx / dragDimensions.w) * 100;
      const dyPct = (dy / dragDimensions.h) * 100;

      setDragCurrent({
        x: dragState.initialX + dxPct,
        y: dragState.initialY + dyPct
      });
      return;
    }

    // DRAWING
    if (tool === ToolState.DRAW && isDrawing && startPos) {
      e.preventDefault();
      const pos = getRelativeMousePos(e, startPos.page);
      const width = pos.x - startPos.x;
      const height = pos.y - startPos.y;

      setCurrentRect({
        page: startPos.page,
        x: width > 0 ? startPos.x : pos.x,
        y: height > 0 ? startPos.y : pos.y,
        w: Math.abs(width),
        h: Math.abs(height)
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    // Release capture
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    }

    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (dragState && dragCurrent) {
      const original = boxes.find(b => b.id === dragState.boxId);
      if (original) {
        // Only update if moved
        if (original.x !== dragCurrent.x || original.y !== dragCurrent.y) {
          onUpdateBox({
            ...original,
            x: dragCurrent.x,
            y: dragCurrent.y
          });
        }
      }
      setDragState(null);
      setDragCurrent(null);
      return;
    }

    if (resizeState && resizeCurrent) {
      const original = boxes.find(b => b.id === resizeState.boxId);
      if (original) {
        onUpdateBox({
          ...original,
          x: resizeCurrent.x,
          y: resizeCurrent.y,
          width: resizeCurrent.width,
          height: resizeCurrent.height
        });
      }
      setResizeState(null);
      setResizeCurrent(null);
      return;
    }

    const drawingDimensions = startPos ? getPageDimensions(startPos.page) : null;
    if (isDrawing && currentRect && startPos && drawingDimensions) {
      // Minimum size check
      if (currentRect.w > 10 && currentRect.h > 10) {
        const newBox: BoundingBox = {
          id: generateId(),
          page: startPos.page,
          x: (currentRect.x / drawingDimensions.w) * 100,
          y: (currentRect.y / drawingDimensions.h) * 100,
          width: (currentRect.w / drawingDimensions.w) * 100,
          height: (currentRect.h / drawingDimensions.h) * 100,
          label: '',
          description: '',
          tags: [],
          color: TAG_COLORS[2] // Default to Emerald
        };
        onAddBox(newBox);
        onSetActiveBox(newBox.id);
        // Reset form for new box
        setEditForm({ label: "", description: "", tags: "", color: TAG_COLORS[2] });
      }
    }

    setIsDrawing(false);
    setStartPos(null);
    setCurrentRect(null);
  };

  // --- Gemini AI Integration ---

  const handleAnalyzeBox = async (box: BoundingBox) => {
    const sourceCanvas = viewMode === ViewMode.CONTINUOUS ? pageCanvasRefs.current[box.page] : canvasRef.current;
    const dimensions = getPageDimensions(box.page);
    if (!sourceCanvas || !dimensions) return;

    setIsAnalyzing(true);
    try {
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');

      if (!ctx) return;

      const x = (box.x / 100) * dimensions.w;
      const y = (box.y / 100) * dimensions.h;
      const w = (box.width / 100) * dimensions.w;
      const h = (box.height / 100) * dimensions.h;

      tempCanvas.width = w;
      tempCanvas.height = h;

      ctx.drawImage(sourceCanvas, x, y, w, h, 0, 0, w, h);
      const base64Image = tempCanvas.toDataURL('image/png');
      const suggestedLabel = await analyzeImageRegion(base64Image);

      setEditForm(prev => ({ ...prev, label: suggestedLabel }));
      // We don't auto-save immediately to allow user to check uniqueness

    } catch (error) {
      console.error("AI Analysis failed", error);
      alert("Failed to analyze image. Check console.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddTag = (tag: string) => {
    setEditForm(prev => {
      const currentTags = prev.tags.split(',').map(t => t.trim()).filter(Boolean);
      if (!currentTags.includes(tag)) {
        const newTags = [...currentTags, tag].join(', ');
        return { ...prev, tags: newTags };
      }
      return prev;
    });
  };

  const handleApplyTemplate = (templateId: string) => {
    const template = tagTemplates.find(field => field.id === templateId);
    if (!template) return;

    setEditForm({
      label: template.label,
      description: template.description,
      tags: template.tags.join(', '),
      color: template.color,
    });
    setValidationError(null);
  };

  const handleSave = (e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();

    if (!activeBoxId) return;

    // 1. Validation: Check Unique Name
    const trimmedLabel = editForm.label.trim();
    if (!trimmedLabel) {
      setValidationError("Label cannot be empty.");
      return;
    }

    const box = boxes.find(b => b.id === activeBoxId);
    if (!box) return;

    const duplicateMessage = getDuplicateLabelMessage(boxes, activeBoxId, trimmedLabel, box.page, duplicateRule);
    if (duplicateMessage && shouldBlockDuplicate(duplicateRule)) {
      setValidationError(duplicateMessage);
      return;
    }
    if (duplicateMessage && duplicateRule === DuplicateRule.WARN_ONLY) {
      const shouldContinue = window.confirm(`${duplicateMessage} Save anyway?`);
      if (!shouldContinue) return;
    }

    // 2. Parse Tags
    const parsedTags = editForm.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    // 3. Update Box
    onUpdateBox({
      ...box,
      label: trimmedLabel,
      description: editForm.description,
      tags: parsedTags,
      color: editForm.color
    });

    onSetActiveBox(null);
    setValidationError(null);
  };

  const getCursorClass = () => {
    if (tool === ToolState.HAND || isPanning) {
      return isPanning ? 'cursor-grabbing' : 'cursor-grab';
    }
    return 'cursor-crosshair';
  };

  const renderPageOverlay = (pageNumber: number, dimensions: { w: number; h: number } | null) => {
    const pageElement = getPageElement(pageNumber);

    return (
      <>
        <div className="absolute inset-0 z-0" data-testid="pdf-hit-layer" data-page={pageNumber} aria-hidden="true" />

        {isLoading && viewMode === ViewMode.SINGLE && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/80 z-50">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        )}

        {isDrawing && currentRect && currentRect.page === pageNumber && (
          <div
            className="absolute border-2 border-dashed border-primary bg-primary/10 pointer-events-none"
            style={{
              left: currentRect.x,
              top: currentRect.y,
              width: currentRect.w,
              height: currentRect.h,
            }}
          />
        )}

        {boxesToRender.filter(b => b.page === pageNumber).map(box => {
          const isActive = activeBoxId === box.id;
          const isDraggingThis = dragState?.boxId === box.id;
          const isResizingThis = resizeState?.boxId === box.id;
          const boxColor = box.color || TAG_COLORS[2];

          const currentX = isResizingThis && resizeCurrent ? resizeCurrent.x : isDraggingThis && dragCurrent ? dragCurrent.x : box.x;
          const currentY = isResizingThis && resizeCurrent ? resizeCurrent.y : isDraggingThis && dragCurrent ? dragCurrent.y : box.y;
          const currentWidth = isResizingThis && resizeCurrent ? resizeCurrent.width : box.width;
          const currentHeight = isResizingThis && resizeCurrent ? resizeCurrent.height : box.height;

          const boxTopPx = (currentY / 100) * (dimensions?.h || 0);
          const boxBottomPx = boxTopPx + (currentHeight / 100) * (dimensions?.h || 0);
          const containerOffsetTop = pageElement?.offsetTop || 0;
          const visibleTop = (scrollContainerRef.current?.scrollTop || 0) - containerOffsetTop;
          const visibleBottom = visibleTop + (scrollContainerRef.current?.clientHeight || window.innerHeight);
          const spaceAbove = Math.max(0, boxTopPx - visibleTop);
          const spaceBelow = Math.max(0, visibleBottom - boxBottomPx);
          const preferredPopupHeight = 345;
          const showControlsBelow = spaceBelow >= preferredPopupHeight || spaceBelow >= spaceAbove;
          const availablePopupSpace = Math.max(220, (showControlsBelow ? spaceBelow : spaceAbove) - 16);
          const popupScale = Math.max(0.82, Math.min(1, availablePopupSpace / preferredPopupHeight));
          const alignRight = currentX > 60;
          const resizeHandles: Array<{
            id: ResizeHandle;
            style: React.CSSProperties;
            cursor: string;
          }> = [
              { id: 'nw', style: { left: -8, top: -8 }, cursor: 'nwse-resize' },
              { id: 'ne', style: { right: -8, top: -8 }, cursor: 'nesw-resize' },
              { id: 'sw', style: { left: -8, bottom: -8 }, cursor: 'nesw-resize' },
              { id: 'se', style: { right: -8, bottom: -8 }, cursor: 'nwse-resize' },
            ];

          return (
            <div
              key={box.id}
              className={`absolute group transition-all duration-75 
                        ${(tool === ToolState.HAND || isPanning) ? 'pointer-events-none' : ''} 
                        ${isActive && !isDraggingThis ? 'cursor-move' : ''}
                    `}
              style={{
                left: `${currentX}%`,
                top: `${currentY}%`,
                width: `${currentWidth}%`,
                height: `${currentHeight}%`,
                borderColor: boxColor,
                borderWidth: isActive ? '3px' : '2px',
                borderStyle: 'solid',
                backgroundColor: isActive ? `${boxColor}22` : 'transparent',
                boxShadow: isActive ? '0 0 0 2px rgba(255,255,255,0.5), 0 0 10px rgba(0,0,0,0.2)' : 'none',
                zIndex: isActive || isDraggingThis ? 50 : 10,
                cursor: tool === ToolState.DRAW && !isPanning ? 'move' : undefined
              }}
              onPointerDown={(e) => handleBoxPointerDown(e, box)}
              data-testid="region-box"
              data-region-page={box.page}
              data-region-label={box.label}
            >
              {box.label && !isActive && (
                <div
                  className="absolute -top-6 left-0 text-white text-xs font-bold px-2 py-0.5 rounded shadow-sm truncate max-w-full flex items-center gap-1"
                  style={{ backgroundColor: boxColor }}
                >
                  {box.description && <MessageSquare className="w-3 h-3 flex-shrink-0" />}
                  {box.label}
                </div>
              )}

              {box.description && (
                <div
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-surface border-2 flex items-center justify-center shadow-md z-40"
                  style={{ borderColor: boxColor, color: boxColor }}
                  title={box.description}
                >
                  <MessageSquare className="w-3 h-3" />
                </div>
              )}

              {!isActive && !isDraggingThis && tool === ToolState.DRAW && (
                <div className="absolute inset-0 bg-transparent opacity-0 group-hover:opacity-10 transition-opacity flex items-center justify-center">
                  <Move className="w-6 h-6 text-on-surface" />
                </div>
              )}

              {isActive && tool !== ToolState.HAND && !isPanning && !dragState && (
                <>
                  {resizeHandles.map(handle => (
                    <button
                      key={handle.id}
                      type="button"
                      onPointerDown={(e) => handleResizePointerDown(e, box, handle.id)}
                      className="absolute w-4 h-4 rounded-full bg-white border-[3px] shadow-md z-[80] hover:scale-125 transition-transform"
                      style={{
                        ...handle.style,
                        borderColor: boxColor,
                        cursor: handle.cursor,
                        boxShadow: `0 0 0 2px ${boxColor}33, 0 2px 6px rgba(0,0,0,0.35)`,
                      }}
                      title="Resize region"
                    />
                  ))}
                </>
              )}

              {isActive && tool !== ToolState.HAND && !isPanning && !dragState && (
                <div
                  className={`box-controls absolute bg-surface-container rounded-2xl shadow-xl border border-outline-variant p-3 w-[290px] animate-in fade-in zoom-in duration-200 z-50 flex flex-col gap-2
                              ${showControlsBelow ? 'top-full mt-3' : 'bottom-full mb-3'}
                              ${alignRight ? 'right-0' : 'left-0'}
                              cursor-default
                          `}
                  style={{
                    transform: `scale(${popupScale})`,
                    transformOrigin: `${alignRight ? 'right' : 'left'} ${showControlsBelow ? 'top' : 'bottom'}`
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 font-bold text-[11px] text-primary uppercase tracking-wider">Edit Tag</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyzeBox(box);
                      }}
                      disabled={isAnalyzing}
                      className={`px-2 py-1 rounded-full text-[11px] text-on-primary flex items-center gap-1 transition-colors ${isAnalyzing ? 'bg-primary-container' : 'bg-primary hover:bg-primary/90'}`}
                      title="Auto-detect with Gemini AI"
                    >
                      {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                      <span>Auto-Label</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-on-surface-variant mb-1 ml-1">Label</label>
                    <input
                      type="text"
                      value={editForm.label}
                      onChange={(e) => setEditForm(prev => ({ ...prev, label: e.target.value }))}
                      className={`w-full border rounded-xl px-3 py-1.5 text-sm text-on-surface bg-surface-container-highest focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${validationError ? 'border-red-500 focus:ring-red-500' : 'border-outline-variant'}`}
                      placeholder="e.g. Invoice Total"
                      autoFocus
                    />
                    {validationError && (
                      <div className="flex items-center gap-1 text-red-500 text-xs mt-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{validationError}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-on-surface-variant mb-1 ml-1">Color</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {TAG_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setEditForm(prev => ({ ...prev, color: c }))}
                          className={`w-5 h-5 rounded-full border transition-all ${editForm.color === c ? 'ring-2 ring-offset-2 ring-primary scale-110 border-transparent' : 'border-outline-variant hover:scale-110'
                            }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-on-surface-variant mb-1 ml-1">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full border border-outline-variant rounded-xl px-3 py-1.5 text-sm text-on-surface bg-surface-container-highest focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent h-[46px] resize-none"
                      placeholder="Optional details..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-on-surface-variant mb-1 ml-1">Tags</label>
                    <input
                      type="text"
                      value={editForm.tags}
                      onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                      className="w-full border border-outline-variant rounded-xl px-3 py-1.5 text-sm text-on-surface bg-surface-container-highest focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      placeholder="finance, urgent, review"
                    />
                    {suggestedTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {suggestedTags.slice(0, 8).map(tag => {
                          const currentTags = editForm.tags.split(',').map(t => t.trim().toLowerCase());
                          if (currentTags.includes(tag.toLowerCase())) return null;

                          return (
                            <button
                              key={tag}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddTag(tag);
                              }}
                              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant hover:bg-secondary-container hover:text-on-secondary-container border border-outline-variant transition-colors"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="pt-1.5 border-t border-outline-variant/70">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 ml-1">Apply Template</label>
                    <select
                      aria-label="Apply template"
                      defaultValue=""
                      onChange={(e) => handleApplyTemplate(e.target.value)}
                      className="w-full border border-outline-variant rounded-lg px-2 py-1 text-xs text-on-surface-variant bg-surface-container-highest focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    >
                      <option value="">No template</option>
                      {templateGroupEntries.map(([groupName, fields]) => (
                        <optgroup key={groupName} label={groupName}>
                          {fields.map(field => (
                            <option key={field.id} value={field.id}>
                              {field.label}{field.repeatable ? ' (repeatable)' : ''}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBox(box.id);
                      }}
                      className="text-error hover:bg-error/10 hover:text-error-container p-2 rounded-full transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-error" />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetActiveBox(null);
                        }}
                        className="text-on-surface-variant hover:text-on-surface px-3 py-1.5 text-xs font-medium hover:bg-surface-container-highest rounded-full transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        className="bg-primary hover:bg-primary/90 text-on-primary px-3 py-1.5 text-xs font-bold rounded-full flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div
      ref={scrollContainerRef}
      className={`absolute inset-0 bg-surface overflow-auto select-none touch-none ${getCursorClass()} transition-colors duration-200`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {viewMode === ViewMode.SINGLE ? (
        <div className="min-w-full min-h-full w-max flex p-8">
          <div
            className="relative shadow-2xl border border-outline-variant bg-surface-container m-auto flex-none transition-colors duration-200"
            ref={containerRef}
            data-testid="pdf-page"
            data-page={currentPage}
            style={{
              width: viewportDimensions ? viewportDimensions.w : 'auto',
              height: viewportDimensions ? viewportDimensions.h : 'auto'
            }}
          >
            <canvas ref={canvasRef} className="block pointer-events-none" />
            {renderPageOverlay(currentPage, viewportDimensions)}
          </div>
        </div>
      ) : (
        <div className="min-w-full min-h-full w-max flex flex-col items-center gap-8 p-8">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/80 z-50">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          )}
          {pageNumbers.map(pageNumber => {
            const dimensions = pageDimensions[pageNumber] || null;
            const fallbackWidth = 595 * scale;
            const fallbackHeight = 842 * scale;

            return (
              <div key={pageNumber} className="flex flex-col items-center gap-2">
                <div className="text-xs font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container-high border border-outline-variant rounded-full px-3 py-1 shadow-sm">
                  Page {pageNumber}
                </div>
                <div
                  ref={node => { pageContainerRefs.current[pageNumber] = node; }}
                  className="relative shadow-2xl border border-outline-variant bg-surface-container flex-none transition-colors duration-200"
                  data-testid="pdf-page"
                  data-page={pageNumber}
                  style={{
                    width: dimensions?.w || fallbackWidth,
                    height: dimensions?.h || fallbackHeight,
                  }}
                >
                  <canvas
                    ref={node => { pageCanvasRefs.current[pageNumber] = node; }}
                    className="block pointer-events-none"
                    data-testid="pdf-page-canvas"
                    data-page={pageNumber}
                  />
                  {renderPageOverlay(pageNumber, dimensions)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PdfViewer;
