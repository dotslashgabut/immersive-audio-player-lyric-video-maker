import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VisualSlide, LyricLine } from '../types';
import { Plus, X, ImageIcon, GripHorizontal, ZoomIn, ZoomOut, Trash2, Volume2, VolumeX, Undo2, Redo2, Copy, Clipboard, Scissors, Film } from './Icons';
import { formatTime } from '../utils/parsers';

interface VisualEditorProps {
  slides: VisualSlide[];
  setSlides: React.Dispatch<React.SetStateAction<VisualSlide[]>>;
  currentTime: number;
  duration: number;
  lyrics: LyricLine[];
  onSeek: (time: number) => void;
}

// Dynamic ruler interval based on zoom level
const getRulerInterval = (pxPerSec: number): number => {
  // Higher zoom = smaller intervals for more detail
  if (pxPerSec >= 150) return 0.5;   // Very high zoom: 0.5s intervals
  if (pxPerSec >= 100) return 1;     // High zoom: 1s intervals
  if (pxPerSec >= 60) return 2;      // Medium-high zoom: 2s intervals
  if (pxPerSec >= 40) return 5;      // Medium zoom: 5s intervals
  if (pxPerSec >= 25) return 10;     // Low zoom: 10s intervals
  return 15;                          // Very low zoom: 15s intervals
};

// Format time for ruler with precision based on interval
const formatRulerTime = (seconds: number, interval: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  // Show decimal for sub-second intervals
  if (interval < 1) {
    return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
  }

  return `${mins}:${Math.floor(secs).toString().padStart(2, '0')}`;
};
const SNAP_THRESHOLD_PX = 10; // Pixels to snap
const MAX_HISTORY_SIZE = 50; // Maximum number of undo steps

const getMediaDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const element = document.createElement(file.type.startsWith('audio/') ? 'audio' : 'video');
    element.preload = 'metadata';
    element.onloadedmetadata = () => {
      resolve(element.duration);
      URL.revokeObjectURL(objectUrl);
    };
    element.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(0);
    };
    element.src = objectUrl;
  });
};

const VisualEditor: React.FC<VisualEditorProps> = ({ slides, setSlides, currentTime, duration, lyrics, onSeek }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [pxPerSec, setPxPerSec] = useState(40); // Default zoom level

  // --- Undo/Redo History ---
  const [history, setHistory] = useState<VisualSlide[][]>([slides]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const isUndoRedoAction = useRef<boolean>(false);

  // Sync history when slides change externally (e.g., initial load)
  useEffect(() => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }
    // Only push if different from current history position
    const currentHistoryState = history[historyIndex];
    if (JSON.stringify(currentHistoryState) !== JSON.stringify(slides)) {
      // Trim future history if we're not at the end
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(slides);
      // Limit history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
        setHistory(newHistory);
        // historyIndex stays the same since we shifted
      } else {
        setHistory(newHistory);
        setHistoryIndex(historyIndex + 1);
      }
    }
  }, [slides, history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      isUndoRedoAction.current = true;
      setSlides(history[newIndex]);
    }
  }, [setSlides, history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      isUndoRedoAction.current = true;
      setSlides(history[newIndex]);
    }
  }, [setSlides, history, historyIndex]);

  // Calculate max extent of slides to expand timeline if needed
  const maxSlideEnd = Math.max(0, ...slides.map(s => s.endTime));

  // Horizontal timeline: Width based on duration, but at least 60s or enough to fit all slides
  const timelineDuration = Math.max(duration, 60, maxSlideEnd);
  const totalWidth = timelineDuration * pxPerSec;

  // Interaction State
  const [selectedSlideIds, setSelectedSlideIds] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null); // Anchor for shift-select

  // --- Clipboard for Copy/Paste ---
  const [clipboard, setClipboard] = useState<VisualSlide[]>([]);

  // --- Copy/Cut/Paste Handlers ---
  const handleCopy = useCallback(() => {
    if (selectedSlideIds.length === 0) return;
    const selectedSlides = slides.filter(s => selectedSlideIds.includes(s.id));
    setClipboard(selectedSlides);
  }, [selectedSlideIds, slides]);

  const handleCut = useCallback(() => {
    if (selectedSlideIds.length === 0) return;
    const selectedSlides = slides.filter(s => selectedSlideIds.includes(s.id));
    setClipboard(selectedSlides);
    setSlides(prev => prev.filter(s => !selectedSlideIds.includes(s.id)));
    setSelectedSlideIds([]);
  }, [selectedSlideIds, slides, setSlides]);

  // Ref to access current slides in event listeners
  const slidesRef = useRef(slides);
  const pxPerSecRef = useRef(pxPerSec);

  useEffect(() => {
    slidesRef.current = slides;
    pxPerSecRef.current = pxPerSec;
  }, [slides, pxPerSec]);

  const handlePaste = useCallback(() => {
    if (clipboard.length === 0) return;

    // Calculate offset: paste at current playback time
    // Find the earliest start time in clipboard to use as reference
    const minStartTime = Math.min(...clipboard.map(s => s.startTime));
    const offset = currentTime - minStartTime;

    const newSlides: VisualSlide[] = clipboard.map(s => ({
      ...s,
      id: Math.random().toString(36).substr(2, 9), // New unique ID
      startTime: s.startTime + offset,
      endTime: s.endTime + offset
    }));

    setSlides(prev => [...prev, ...newSlides].sort((a, b) => a.startTime - b.startTime));

    // Select the newly pasted slides
    setSelectedSlideIds(newSlides.map(s => s.id));
  }, [clipboard, currentTime, setSlides]);

  const [activeDrag, setActiveDrag] = useState<{
    id: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    initialStart: number;
    initialEnd: number;
  } | null>(null);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = Array.from(e.target.files);
      const isAllImages = files.every(f => f.type.startsWith('image/'));

      const newSlides: VisualSlide[] = [];

      if (isAllImages) {
        const fileCount = files.length;
        // Calculate start time based on current playback position
        const startTime = currentTime;
        // Calculate remaining duration
        const remainingDuration = Math.max(0, duration - startTime);

        // Determine duration per image
        // Fill the remaining duration, but ensure at least 3s per image.
        const calculatedDuration = remainingDuration / fileCount;
        const durationPerImage = Math.max(3, calculatedDuration);

        files.forEach((file, index) => {
          const url = URL.createObjectURL(file);
          const start = startTime + (index * durationPerImage);
          const end = start + durationPerImage;

          newSlides.push({
            id: Math.random().toString(36).substr(2, 9),
            url,
            type: 'image',
            startTime: start,
            endTime: end,
            name: file.name
          });
        });
      } else {
        // Mixed or Video/Audio Content: Use Real Duration
        let currentStart = currentTime;

        for (const file of files) {
          const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'audio';
          let itemDuration = 5; // Default for image in mixed mode

          if (type !== 'image') {
            const d = await getMediaDuration(file);
            if (d > 0) itemDuration = d;
          }

          const url = URL.createObjectURL(file);
          newSlides.push({
            id: Math.random().toString(36).substr(2, 9),
            url,
            type,
            startTime: currentStart,
            endTime: currentStart + itemDuration,
            name: file.name,
            isMuted: type === 'video', // Default muted for video
            volume: (type === 'video' || type === 'audio') ? 1 : undefined
          });

          currentStart += itemDuration;
        }
      }

      // Append slides instead of replace
      setSlides(prev => [...prev, ...newSlides].sort((a, b) => a.startTime - b.startTime));
      e.target.value = '';
    }
  };

  const removeSlide = (id: string) => {
    setSlides(prev => prev.filter(s => s.id !== id));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (slides.length === 0) return;
    if (window.confirm("Are you sure you want to remove all visual slides?")) {
      setSlides([]);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, id: string, type: 'move' | 'resize-start' | 'resize-end') => {
    e.stopPropagation();
    e.preventDefault(); // Prevent default drag behavior
    editorRef.current?.focus();

    // Handle Selection Logic
    if (e.shiftKey && lastSelectedId) {
      // Shift+Click: Range selection from anchor to clicked item
      const anchorIndex = slides.findIndex(s => s.id === lastSelectedId);
      const clickedIndex = slides.findIndex(s => s.id === id);

      if (anchorIndex !== -1 && clickedIndex !== -1) {
        const startIdx = Math.min(anchorIndex, clickedIndex);
        const endIdx = Math.max(anchorIndex, clickedIndex);
        const rangeIds = slides.slice(startIdx, endIdx + 1).map(s => s.id);

        // Merge with existing selection (add range to current selection)
        setSelectedSlideIds(prev => {
          const combined = new Set([...prev, ...rangeIds]);
          return Array.from(combined);
        });
      }
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd+Click: Toggle individual selection
      setSelectedSlideIds(prev => {
        if (prev.includes(id)) return prev.filter(sid => sid !== id);
        return [...prev, id];
      });
      setLastSelectedId(id); // Update anchor
    } else {
      // Regular click: Select only this item
      setSelectedSlideIds([id]);
      setLastSelectedId(id); // Set as new anchor
    }

    const slide = slides.find(s => s.id === id);
    if (!slide) return;

    setActiveDrag({
      id,
      type,
      startX: e.clientX,
      initialStart: slide.startTime,
      initialEnd: slide.endTime
    });

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Timeline Scrubbing Handlers (Ruler Only)
  const handleRulerMouseDown = (e: React.MouseEvent) => {
    // Only trigger if left click
    if (e.button !== 0) return;

    e.stopPropagation();
    editorRef.current?.focus();

    setSelectedSlideIds([]);
    setIsScrubbing(true);
    updateScrubPosition(e.clientX);

    window.addEventListener('mousemove', handleScrubMouseMove);
    window.addEventListener('mouseup', handleScrubMouseUp);
  };

  // Track Background Handler (Click to Scrub, Drag to Select)
  const handleTrackMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    // If clicking a specific item, propagation is stopped there.
    // So this fires on empty space.
    editorRef.current?.focus();

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const trackRect = trackRef.current?.getBoundingClientRect();

    if (!trackRect) return;

    // Relative start position for box calculation (pixels from time 0)
    const startX = startClientX - trackRect.left;
    const startY = startClientY - trackRect.top;

    let isDragSelect = false;

    const handleTrackMouseMove = (ev: MouseEvent) => {
      const dist = Math.sqrt(Math.pow(ev.clientX - startClientX, 2) + Math.pow(ev.clientY - startClientY, 2));

      if (!isDragSelect && dist > 5) {
        isDragSelect = true;
      }

      if (isDragSelect && trackRef.current) {
        const currentRect = trackRef.current.getBoundingClientRect();
        const currentX = ev.clientX - currentRect.left;
        const currentY = ev.clientY - currentRect.top;

        const boxX = Math.min(startX, currentX);
        const boxY = Math.min(startY, currentY);
        const boxW = Math.abs(currentX - startX);
        const boxH = Math.abs(currentY - startY);

        setSelectionBox({ x: boxX, y: boxY, w: boxW, h: boxH });

        // Intersection Logic
        const newSelectedIds: string[] = [];
        const currentSlides = slidesRef.current;
        const currentPxPerSec = pxPerSecRef.current;

        // Box Boundaries
        const boxRight = boxX + boxW;
        const boxBottom = boxY + boxH;

        currentSlides.forEach(slide => {
          const slideLeft = slide.startTime * currentPxPerSec;
          const slideRight = slide.endTime * currentPxPerSec;
          let slideTop = 0;
          let slideBottom = 0;

          // Determine Y range based on type
          if (slide.type === 'audio') {
            slideTop = 160; // top-40 (40 * 4px = 160px)
            slideBottom = 160 + 32; // h-8 (8 * 4px = 32px)
          } else {
            // Image/Video
            slideTop = 32; // top-8
            slideBottom = 32 + 64; // h-16
          }

          // Check overlap
          const overlapsX = (boxX < slideRight) && (boxRight > slideLeft);
          const overlapsY = (boxY < slideBottom) && (boxBottom > slideTop);

          if (overlapsX && overlapsY) {
            newSelectedIds.push(slide.id);
          }
        });

        setSelectedSlideIds(newSelectedIds);
      }
    };

    const handleTrackMouseUp = (ev: MouseEvent) => {
      if (!isDragSelect) {
        // It was a simple click -> Scrub behavior
        setSelectedSlideIds([]);
        updateScrubPosition(ev.clientX);
      }

      setSelectionBox(null);
      window.removeEventListener('mousemove', handleTrackMouseMove);
      window.removeEventListener('mouseup', handleTrackMouseUp);
    };

    window.addEventListener('mousemove', handleTrackMouseMove);
    window.addEventListener('mouseup', handleTrackMouseUp);
  };

  const updateScrubPosition = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    let time = Math.max(0, Math.min(offsetX / pxPerSec, timelineDuration));

    // Apply Snapping to lyrics/images
    time = getSnapTime(time);

    onSeek(time);
  };

  const handleScrubMouseMove = (e: MouseEvent) => {
    updateScrubPosition(e.clientX);
  };

  const handleScrubMouseUp = () => {
    setIsScrubbing(false);
    window.removeEventListener('mousemove', handleScrubMouseMove);
    window.removeEventListener('mouseup', handleScrubMouseUp);
  };

  // Keyboard Shortcuts (Delete & Move)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    // Undo: Ctrl+Z
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }

    // Redo: Ctrl+Y or Ctrl+Shift+Z
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      handleRedo();
      return;
    }

    // Copy: Ctrl+C
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault();
      handleCopy();
      return;
    }

    // Cut: Ctrl+X
    if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
      e.preventDefault();
      handleCut();
      return;
    }

    // Paste: Ctrl+V
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      handlePaste();
      return;
    }

    // 1. Delete
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSlideIds.length > 0) {
      e.preventDefault();
      setSlides(prev => prev.filter(s => !selectedSlideIds.includes(s.id)));
      setSelectedSlideIds([]);
    }

    // 2. Move (Left/Right Arrow) - 0.01s Step
    if (selectedSlideIds.length > 0 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      e.stopPropagation(); // Stop bubbling to prevent audio seek
      const delta = e.key === 'ArrowRight' ? 0.01 : -0.01;

      // Sync slider to the first selected item's new start time
      const firstSelected = slides.find(s => s.id === selectedSlideIds[0]);
      if (firstSelected) {
        const newStart = Math.max(0, firstSelected.startTime + delta);
        onSeek(newStart);
      }

      setSlides(prev => {
        const updated = prev.map(s => {
          if (selectedSlideIds.includes(s.id)) {
            const durationLen = s.endTime - s.startTime;
            let newStart = s.startTime + delta;
            newStart = Math.max(0, newStart);
            return { ...s, startTime: newStart, endTime: newStart + durationLen };
          }
          return s;
        });
        return updated.sort((a, b) => a.startTime - b.startTime);
      });
    }
  };


  // Snapping Utility
  const getSnapTime = (proposedTime: number, ignoreId?: string): number => {
    const snapThresholdSec = SNAP_THRESHOLD_PX / pxPerSec;

    // Snap points: 0, duration, and Start/End of ALL other slides
    const snapPoints = [0, duration, currentTime];

    // Add closest grid line
    const rulerInterval = getRulerInterval(pxPerSec);
    const closestGrid = Math.round(proposedTime / rulerInterval) * rulerInterval;
    snapPoints.push(closestGrid);

    // Add slide boundaries
    slides.forEach(s => {
      if (s.id !== ignoreId) {
        snapPoints.push(s.startTime);
        snapPoints.push(s.endTime);
      }
    });

    // Add lyric timestamps
    lyrics.forEach(line => {
      snapPoints.push(line.time);
    });

    let closest = proposedTime;
    let minDiff = snapThresholdSec;

    for (const point of snapPoints) {
      const diff = Math.abs(point - proposedTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = point;
      }
    }
    return closest;
  };

  const handleMouseMove = (e: MouseEvent) => {
    setActiveDrag(prev => {
      if (!prev) return null;

      // Calculate deltaX
      const deltaPx = e.clientX - prev.startX;
      const deltaSec = deltaPx / pxPerSec;

      setSlides(currentSlides => currentSlides.map(s => {
        if (s.id !== prev.id) return s;

        if (prev.type === 'move') {
          const durationLen = prev.initialEnd - prev.initialStart;
          let newStart = prev.initialStart + deltaSec;
          let newEnd = newStart + durationLen;

          // Check snap for Start
          const snappedStart = getSnapTime(newStart, prev.id);
          const startDiff = Math.abs(snappedStart - newStart);

          // Check snap for End
          const snappedEnd = getSnapTime(newEnd, prev.id);
          const endDiff = Math.abs(snappedEnd - newEnd);

          const isStartSnapped = startDiff > 0.000001;
          const isEndSnapped = endDiff > 0.000001;

          if (isEndSnapped && (!isStartSnapped || endDiff < startDiff)) {
            newStart = snappedEnd - durationLen;
          } else {
            newStart = snappedStart;
          }

          // Clamp
          // Allow dragging past duration but clamp 0
          newStart = Math.max(0, newStart);

          return {
            ...s,
            startTime: newStart,
            endTime: newStart + durationLen
          };
        } else if (prev.type === 'resize-start') {
          // Resize Start
          let newStart = prev.initialStart + deltaSec;

          // Snap
          newStart = getSnapTime(newStart, prev.id);

          // Clamp
          // Must not exceed end time (minus min duration) and not below 0
          const minDuration = 0.5;
          const currentEnd = prev.initialEnd;
          newStart = Math.max(0, Math.min(newStart, currentEnd - minDuration));

          return {
            ...s,
            startTime: newStart
          };
        } else {
          // Resize End
          let newEnd = prev.initialEnd + deltaSec;

          // Snap
          newEnd = getSnapTime(newEnd, prev.id);

          // Clamp
          // Must not be before start time (plus min duration)
          const minDuration = 0.5;
          const currentStart = prev.initialStart;
          newEnd = Math.max(currentStart + minDuration, newEnd);

          return {
            ...s,
            endTime: newEnd
          };
        }
      }));

      return prev;
    });
  };

  const handleMouseUp = () => {
    setActiveDrag(null);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    setSlides(prev => [...prev].sort((a, b) => a.startTime - b.startTime));
  };

  const handleZoomIn = () => setPxPerSec(prev => Math.min(200, prev + 10));
  const handleZoomOut = () => setPxPerSec(prev => Math.max(10, prev - 10));

  return (
    <div
      ref={editorRef}
      className="w-full max-w-[100vw] h-64 flex flex-col bg-zinc-900/95 backdrop-blur-md border-t border-white/10 z-20 shadow-xl overflow-hidden outline-none"
      tabIndex={0}
      onMouseDown={(e) => e.currentTarget.focus()}
      onKeyDown={handleKeyDown}
    >

      {/* Header / Tools */}
      <div className="p-2 border-b border-white/10 flex items-center justify-between bg-zinc-900 z-30 shrink-0 h-12">
        <div className="flex items-center gap-4 shrink-0">
          <h2 className="text-sm font-bold flex items-center gap-2 text-zinc-300 whitespace-nowrap">
            <Film size={16} className="text-purple-400" />

            Timeline
          </h2>
          <div className="w-px h-4 bg-zinc-700"></div>
          <div className="flex items-center gap-1">
            <button onClick={handleZoomOut} className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white" title="Zoom Out">
              <ZoomOut size={14} />
            </button>
            <div className="text-[10px] text-zinc-500 font-mono min-w-[50px] text-center">{pxPerSec}px/s</div>
            <button onClick={handleZoomIn} className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white" title="Zoom In">
              <ZoomIn size={14} />
            </button>
          </div>
          <div className="w-px h-4 bg-zinc-700"></div>

          {/* Undo/Redo Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={14} />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={14} />
            </button>
          </div>
          <div className="w-px h-4 bg-zinc-700"></div>

          {/* Copy/Cut/Paste Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              disabled={selectedSlideIds.length === 0}
              className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Copy (Ctrl+C)"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={handleCut}
              disabled={selectedSlideIds.length === 0}
              className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Cut (Ctrl+X)"
            >
              <Scissors size={14} />
            </button>
            <button
              onClick={handlePaste}
              disabled={clipboard.length === 0}
              className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Paste (Ctrl+V)"
            >
              <Clipboard size={14} />
            </button>
          </div>
          <div className="w-px h-4 bg-zinc-700"></div>

          {/* Selection Utilities */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (slides.length > 0 && selectedSlideIds.length === slides.length) {
                  setSelectedSlideIds([]);
                } else {
                  setSelectedSlideIds(slides.map(s => s.id));
                }
              }}
              className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-zinc-300 transition-colors"
            >
              Select All
            </button>

            {/* Duration Input (Single Selection Only) */}
            {selectedSlideIds.length === 1 && (
              <div className="flex items-center gap-1 bg-zinc-800 rounded px-1 border border-zinc-700">
                <span className="text-[10px] text-zinc-500 px-1">Dur:</span>
                <input
                  key={selectedSlideIds[0]}
                  type="text"
                  className="w-12 bg-transparent text-[10px] text-white font-mono focus:outline-none py-0.5 text-center"
                  placeholder="MM:SS"
                  defaultValue={(() => {
                    const s = slides.find(si => si.id === selectedSlideIds[0]);
                    return s ? formatTime(s.endTime - s.startTime) : "00:00";
                  })()}
                  onBlur={(e) => {
                    const val = e.target.value;
                    const parts = val.split(':');
                    if (parts.length === 2) {
                      const m = parseInt(parts[0]) || 0;
                      const s = parseInt(parts[1]) || 0;
                      const totalSec = (m * 60) + s;
                      if (totalSec > 0) {
                        setSlides(prev => prev.map(slide => {
                          if (slide.id === selectedSlideIds[0]) {
                            return { ...slide, endTime: slide.startTime + totalSec };
                          }
                          return slide;
                        }));
                      }
                    }
                    // Force re-render to formatted value if invalid or updated
                    const s = slides.find(si => si.id === selectedSlideIds[0]);
                    if (s) e.target.value = formatTime(s.endTime - s.startTime);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                />
              </div>
            )}

            {/* Volume Input (Single Video Selection Only) */}
            {selectedSlideIds.length === 1 && (() => {
              const s = slides.find(si => si.id === selectedSlideIds[0]);
              if (s && (s.type === 'video' || s.type === 'audio')) {
                return (
                  <div className="flex items-center gap-2 bg-zinc-800 rounded px-2 border border-zinc-700 h-[22px]">
                    <span className="text-[10px] text-zinc-500">Vol:</span>
                    <div className="flex items-center gap-1 w-20">
                      <button
                        onClick={() => {
                          setSlides(prev => prev.map(slide => {
                            if (slide.id === s.id) return { ...slide, isMuted: !slide.isMuted };
                            return slide;
                          }));
                        }}
                        className="p-0.5 hover:bg-zinc-700 rounded cursor-pointer text-zinc-400 hover:text-white"
                        title={s.isMuted !== false ? "Unmute" : "Mute"}
                      >
                        {s.isMuted !== false ? <VolumeX size={10} /> : <Volume2 size={10} />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer"
                        value={s.volume !== undefined ? s.volume : 1}
                        onChange={(e) => {
                          const newVol = parseFloat(e.target.value);
                          setSlides(prev => prev.map(slide => {
                            if (slide.id === s.id) return { ...slide, volume: newVol, isMuted: newVol === 0 };
                            return slide;
                          }));
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-zinc-400 w-6 text-right">
                      {Math.round((s.volume || 1) * 100)}%
                    </span>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <label className="flex items-center gap-2 px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs font-medium cursor-pointer transition-colors text-white whitespace-nowrap">
            <Plus size={14} /> Import Media
            <input type="file" className="hidden" accept="image/*,video/*,audio/*" multiple onChange={handleFileUpload} />
          </label>
          <button
            onClick={handleClearAll}
            className="p-1 hover:bg-red-900/50 text-zinc-500 hover:text-red-200 rounded transition-colors"
            title="Clear All Slides"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Timeline Container */}
      <div
        ref={containerRef}
        onWheel={(e) => {
          if (containerRef.current) {
            containerRef.current.scrollLeft += e.deltaY;
          }
        }}
        className="flex-1 overflow-x-auto overflow-y-hidden relative bg-zinc-950 scroll-smooth custom-scrollbar cursor-default"
      >
        <div
          ref={trackRef}
          className="relative h-full"
          style={{ width: `${totalWidth}px`, minWidth: '100%' }}
          onMouseDown={handleTrackMouseDown}
        >

          {/* Selection Box */}
          {selectionBox && (
            <div
              className="absolute border border-purple-500 bg-purple-500/20 z-50 pointer-events-none"
              style={{
                left: selectionBox.x,
                top: selectionBox.y,
                width: selectionBox.w,
                height: selectionBox.h,
              }}
            />
          )}

          {/* 1. Ruler (Top Strip) */}
          <div
            className="absolute top-0 left-0 right-0 h-6 border-b border-white/10 bg-zinc-900/50 select-none cursor-pointer z-40"
            onMouseDown={handleRulerMouseDown}
          >
            {(() => {
              const rulerInterval = getRulerInterval(pxPerSec);
              return Array.from({ length: Math.ceil(totalWidth / (pxPerSec * rulerInterval)) }).map((_, i) => {
                const seconds = i * rulerInterval;
                if (seconds > timelineDuration) return null;
                return (
                  <div
                    key={i}
                    className="absolute bottom-0 border-l border-white/20 text-[9px] text-zinc-500 font-mono pl-1 pb-0.5 pointer-events-none"
                    style={{ left: seconds * pxPerSec, width: rulerInterval * pxPerSec }}
                  >
                    {formatRulerTime(seconds, rulerInterval)}
                  </div>
                );
              });
            })()}
          </div>

          {/* 2. Grid Lines (Vertical) */}
          <div className="absolute top-6 bottom-0 left-0 right-0 pointer-events-none">
            {(() => {
              const rulerInterval = getRulerInterval(pxPerSec);
              return Array.from({ length: Math.ceil(totalWidth / (pxPerSec * rulerInterval)) }).map((_, i) => (
                <div
                  key={i}
                  className="absolute h-full border-l border-white/5"
                  style={{ left: i * rulerInterval * pxPerSec }}
                ></div>
              ));
            })()}
            {/* End of Audio Line */}
            {duration > 0 && (
              <div
                className="absolute top-0 bottom-0 border-l-2 border-red-900/50 flex flex-col justify-end z-0"
                style={{ left: duration * pxPerSec }}
              >
                <span className="text-[9px] text-red-900/50 bg-black/50 px-1 whitespace-nowrap">End</span>
              </div>
            )}
          </div>

          {/* 3. Playhead (Vertical Cursor) */}
          <div
            className="absolute top-0 bottom-0 border-l-2 border-red-500 z-50 cursor-ew-resize transition-transform duration-100 ease-linear group"
            style={{
              left: 0,
              transform: `translateX(${currentTime * pxPerSec}px)`
            }}
            onMouseDown={handleRulerMouseDown}
          >
            <div className="absolute top-6 -ml-2.5 bg-red-500 text-white text-[9px] px-1 rounded font-mono shadow-md z-30 group-hover:scale-110 transition-transform">
              {formatTime(currentTime)}
            </div>
          </div>

          {/* 4. Slides Track (Images) */}
          <div className="absolute top-8 h-16 left-0 right-0 border-b border-white/5 bg-zinc-900/20">
            {slides.filter(s => s.type !== 'audio').map(slide => (
              <div
                key={slide.id}
                style={{
                  left: slide.startTime * pxPerSec,
                  width: Math.max(10, (slide.endTime - slide.startTime) * pxPerSec)
                }}
                className={`absolute top-1 bottom-1 rounded-md overflow-hidden group bg-zinc-800 border shadow-sm select-none cursor-move
                     ${(activeDrag?.id === slide.id || selectedSlideIds.includes(slide.id)) ? 'border-purple-400 z-30 shadow-xl opacity-90' : 'border-zinc-600 hover:border-zinc-400 z-10 hover:z-20'}
                     ${selectedSlideIds.includes(slide.id) ? 'ring-2 ring-blue-500/70 ring-offset-1 ring-offset-zinc-950' : ''}
                   `}
                onMouseDown={(e) => handleMouseDown(e, slide.id, 'move')}
              >
                {/* Background Media Preview */}
                {slide.type === 'video' ? (
                  <video src={slide.url} className="w-full h-full object-cover opacity-60 pointer-events-none" muted />
                ) : (
                  <img src={slide.url} className="w-full h-full object-cover opacity-60 pointer-events-none" draggable={false} alt={slide.name} />
                )}

                {/* Info Overlay */}
                <div className="absolute inset-0 p-1 pointer-events-none flex flex-col justify-end">
                  <span className="text-[10px] font-bold drop-shadow-md truncate text-zinc-200 bg-black/30 px-1 rounded w-max max-w-full">{slide.name}</span>
                </div>

                {/* Mute/Unmute Button (Videos Only) */}
                {slide.type === 'video' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSlides(prev => prev.map(s => {
                        if (s.id === slide.id) return { ...s, isMuted: !s.isMuted };
                        return s;
                      }));
                    }}
                    className="absolute top-1 right-10 p-0.5 bg-black/60 hover:bg-zinc-600 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-40"
                    title={slide.isMuted !== false ? "Unmute" : "Mute"}
                  >
                    {slide.isMuted !== false ? <VolumeX size={10} /> : <Volume2 size={10} />}
                  </button>
                )}

                {/* Delete Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}
                  className="absolute top-1 right-4 p-0.5 bg-black/60 hover:bg-red-500 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-30"
                >
                  <X size={10} />
                </button>

                {/* Resize Handle (Left Edge) */}
                <div
                  className="absolute top-0 bottom-0 left-0 w-3 cursor-w-resize flex items-center justify-center bg-black/20 hover:bg-purple-500/80 transition-colors z-20"
                  onMouseDown={(e) => handleMouseDown(e, slide.id, 'resize-start')}
                >
                  <GripHorizontal size={10} className="text-white/70 rotate-90" />
                </div>

                {/* Resize Handle (Right Edge) */}
                <div
                  className="absolute top-0 bottom-0 right-0 w-3 cursor-e-resize flex items-center justify-center bg-black/20 hover:bg-purple-500/80 transition-colors z-20"
                  onMouseDown={(e) => handleMouseDown(e, slide.id, 'resize-end')}
                >
                  <GripHorizontal size={10} className="text-white/70 rotate-90" />
                </div>
              </div>
            ))}
          </div>

          {/* 5. Lyrics Track */}
          <div className="absolute top-28 h-10 left-0 right-0 overflow-hidden">
            {lyrics.map((line, idx) => (
              <div
                key={idx}
                className="absolute top-1 bottom-1 text-[10px] text-zinc-400 truncate hover:text-white transition-colors hover:bg-zinc-800/50 rounded px-2 cursor-pointer border-l border-zinc-700 flex items-center whitespace-nowrap"
                style={{ left: line.time * pxPerSec }}
                title={`${formatTime(line.time)} - ${line.text}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(line.time);
                }}
              >
                <span className="mr-1 text-zinc-600 font-mono text-[9px]">{formatTime(line.time)}</span>
                {line.text}
              </div>
            ))}
          </div>

          {/* 6. Audio Track */}
          <div className="absolute top-40 h-8 left-0 right-0 border-t border-white/5 bg-zinc-900/40">
            {slides.filter(s => s.type === 'audio').map(slide => (
              <div
                key={slide.id}
                style={{
                  left: slide.startTime * pxPerSec,
                  width: Math.max(10, (slide.endTime - slide.startTime) * pxPerSec)
                }}
                className={`absolute top-1 bottom-1 rounded-md overflow-hidden group bg-emerald-900/50 border shadow-sm select-none cursor-move
                     ${(activeDrag?.id === slide.id || selectedSlideIds.includes(slide.id)) ? 'border-emerald-400 z-30 shadow-xl opacity-90' : 'border-emerald-700/50 hover:border-emerald-500 z-10 hover:z-20'}
                     ${selectedSlideIds.includes(slide.id) ? 'ring-2 ring-blue-500/70 ring-offset-1 ring-offset-zinc-950' : ''}
                   `}
                onMouseDown={(e) => handleMouseDown(e, slide.id, 'move')}
              >
                {/* Visual Representation (Waveform fake) */}
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                  <Volume2 size={16} className="text-emerald-200" />
                </div>

                {/* Info Overlay */}
                <div className="absolute inset-0 p-1 pointer-events-none flex flex-col justify-center">
                  <span className="text-[9px] font-bold drop-shadow-md truncate text-emerald-100 px-1">{slide.name}</span>
                </div>

                {/* Mute/Unmute Button (Audio Only) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSlides(prev => prev.map(s => {
                      if (s.id === slide.id) return { ...s, isMuted: !s.isMuted };
                      return s;
                    }));
                  }}
                  className="absolute top-1 right-10 p-0.5 bg-black/60 hover:bg-emerald-600 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-40"
                  title={slide.isMuted === true ? "Unmute" : "Mute"}
                >
                  {slide.isMuted === true ? <VolumeX size={10} /> : <Volume2 size={10} />}
                </button>

                {/* Delete Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}
                  className="absolute top-1 right-3 p-0.5 bg-black/60 hover:bg-red-500 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-40"
                >
                  <X size={10} />
                </button>

                {/* Resize Handle (Left) */}
                <div
                  className="absolute top-0 bottom-0 left-0 w-2 cursor-w-resize flex items-center justify-center hover:bg-emerald-500/50 transition-colors z-20"
                  onMouseDown={(e) => handleMouseDown(e, slide.id, 'resize-start')}
                >
                </div>

                {/* Resize Handle (Right) */}
                <div
                  className="absolute top-0 bottom-0 right-0 w-2 cursor-e-resize flex items-center justify-center hover:bg-emerald-500/50 transition-colors z-20"
                  onMouseDown={(e) => handleMouseDown(e, slide.id, 'resize-end')}
                >
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default VisualEditor;