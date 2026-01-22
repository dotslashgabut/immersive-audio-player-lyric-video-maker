import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VisualSlide, LyricLine, RenderConfig } from '../types';
import { Plus, X, ImageIcon, GripHorizontal, ZoomIn, ZoomOut, Trash2, Volume2, VolumeX, Undo2, Redo2, Copy, Clipboard, Scissors, Film, Eye, EyeOff, Split, ChevronUp, ChevronDown } from './Icons';
import { formatTime } from '../utils/parsers';
import { useUI } from '../contexts/UIContext';

interface VisualEditorProps {
  slides: VisualSlide[];
  setSlides: React.Dispatch<React.SetStateAction<VisualSlide[]>>;
  currentTime: number;
  duration: number;
  lyrics: LyricLine[];
  onSeek: (time: number) => void;
  onClose: () => void;
  renderConfig: RenderConfig;
  setRenderConfig: React.Dispatch<React.SetStateAction<RenderConfig>>;
}

const getRulerInterval = (pxPerSec: number): number => {
  // Higher zoom = smaller intervals for more detail
  if (pxPerSec >= 150) return 0.5;   // Very high zoom: 0.5s intervals
  if (pxPerSec >= 100) return 1;     // High zoom: 1s intervals
  if (pxPerSec >= 60) return 2;      // Medium-high zoom: 2s intervals
  if (pxPerSec >= 40) return 5;      // Medium zoom: 5s intervals
  if (pxPerSec >= 25) return 10;     // Low zoom: 10s intervals
  return 15;                          // Very low zoom: 15s intervals
};

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

const TRACK_LAYOUT = {
  RULER_HEIGHT: 24,
  VISUAL_L2_TOP: 32,
  VISUAL_L2_HEIGHT: 48,
  VISUAL_L1_TOP: 84,
  VISUAL_L1_HEIGHT: 48,
  LYRICS_TOP: 136,
  LYRICS_HEIGHT: 32,
  AUDIO_L1_TOP: 172,
  AUDIO_L1_HEIGHT: 32,
  AUDIO_L2_TOP: 208,
  AUDIO_L2_HEIGHT: 32,
};

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

interface SpeedInputProps {
  value: number;
  onChange: (value: number) => void;
}

const SpeedInput: React.FC<SpeedInputProps> = ({ value, onChange }) => {
  const [localValue, setLocalValue] = useState<string>(value.toString());

  useEffect(() => {
    const parsed = parseFloat(localValue);
    // If local value matches prop (numerically), don't break "1." or "0." states
    if (!isNaN(parsed) && Math.abs(parsed - value) < 0.001) {
      return;
    }
    setLocalValue(value.toString());
  }, [value]);

  const handleBlur = () => {
    const parsed = parseFloat(localValue);
    if (localValue === '' || isNaN(parsed)) {
      setLocalValue(value.toString());
    } else {
      onChange(parsed);
    }
  };

  const updateValue = (delta: number) => {
    const parsed = parseFloat(localValue);
    const validBase = isNaN(parsed) ? value : parsed;
    const next = Math.round((validBase + delta) * 100) / 100;
    // Prevent going below 0.05
    if (next < 0.05) return;
    onChange(next);
    setLocalValue(next.toString());
  };

  return (
    <div className="flex items-center bg-zinc-900 rounded border border-zinc-700 h-[18px]">
      <button
        onClick={() => updateValue(-0.05)}
        className="px-0.5 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors h-full flex items-center justify-center border-r border-zinc-700"
      >
        <ChevronDown size={10} />
      </button>
      <input
        type="text"
        className="bg-transparent text-[10px] text-zinc-300 focus:outline-none w-10 text-center"
        value={localValue}
        onChange={(e) => {
          // Allow typing only numbers and dot
          if (/^\d*\.?\d*$/.test(e.target.value)) {
            setLocalValue(e.target.value);
          }
        }}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            updateValue(0.05);
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            updateValue(-0.05);
          }
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
      />
      <button
        onClick={() => updateValue(0.05)}
        className="px-0.5 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors h-full flex items-center justify-center border-l border-zinc-700"
      >
        <ChevronUp size={10} />
      </button>
    </div>
  );
};


const VisualEditor: React.FC<VisualEditorProps> = ({ slides, setSlides, currentTime, duration, lyrics, onSeek, onClose, renderConfig, setRenderConfig }) => {
  const { confirm } = useUI();
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [pxPerSec, setPxPerSec] = useState(40); // Default zoom level


  const [history, setHistory] = useState<VisualSlide[][]>([slides]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const isUndoRedoAction = useRef<boolean>(false);


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


  const maxSlideEnd = Math.max(0, ...slides.map(s => s.endTime));


  const timelineDuration = Math.max(duration, 60, maxSlideEnd);
  const totalWidth = timelineDuration * pxPerSec;

  // Interaction State
  const [selectedSlideIds, setSelectedSlideIds] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null); // Anchor for shift-select


  const [clipboard, setClipboard] = useState<VisualSlide[]>([]);


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

  const handleSplit = useCallback(() => {

    const candidates = slides.filter(s =>
      selectedSlideIds.includes(s.id) &&
      currentTime > s.startTime &&
      currentTime < s.endTime
    );

    if (candidates.length === 0) return;

    let newSlides: VisualSlide[] = [];
    const idsToRemove: string[] = [];
    const newSelection: string[] = [];

    candidates.forEach(s => {
      const splitT = currentTime;

      // Left Part
      const left: VisualSlide = {
        ...s,
        id: Math.random().toString(36).substr(2, 9),
        endTime: splitT
      };

      // Right Part
      const addedOffset = splitT - s.startTime;
      const right: VisualSlide = {
        ...s,
        id: Math.random().toString(36).substr(2, 9),
        startTime: splitT,
        mediaStartOffset: (s.mediaStartOffset || 0) + addedOffset
      };

      idsToRemove.push(s.id);
      newSlides.push(left, right);
      newSelection.push(right.id);
    });

    setSlides(prev => {
      const kept = prev.filter(sl => !idsToRemove.includes(sl.id));
      return [...kept, ...newSlides].sort((a, b) => a.startTime - b.startTime);
    });

    setSelectedSlideIds(newSelection);
  }, [slides, selectedSlideIds, currentTime, setSlides]);

  const [activeDrag, setActiveDrag] = useState<{
    id: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    initialStart: number;
    initialEnd: number;
    initialMap: Record<string, { start: number, end: number }>;
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
            name: file.name,
            layer: 0
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
            volume: (type === 'video' || type === 'audio') ? 1 : undefined,
            layer: 0
          });

          currentStart += itemDuration;
        }
      }

      // Append slides instead of replace
      setSlides(prev => [...prev, ...newSlides].sort((a, b) => a.startTime - b.startTime));
      // Allow re-upload
      e.target.value = '';
    }
  };

  const removeSlide = (id: string) => {
    setSlides(prev => prev.filter(s => s.id !== id));
  };

  const handleClearAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (slides.length === 0) return;
    if (await confirm("Are you sure you want to remove all visual slides?", "Remove All Slides")) {
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
    } else if (selectedSlideIds.includes(id)) {
      // Clicked on already selected item: maintain selection for potential drag
      setLastSelectedId(id);
    } else {
      // Regular click on unselected: Select only this item
      setSelectedSlideIds([id]);
      setLastSelectedId(id); // Set as new anchor
    }

    const slide = slides.find(s => s.id === id);
    if (!slide) return;

    // Build map of initial positions for all selected items (or just this one if not selected)
    // If we clicked a selected item, we move all selected items.
    // If we clicked an unselected item, the logic above (lines 286-297) would have handled selection state.
    // However, we need to be careful: the state update `setSelectedSlideIds` is async.
    // We should rely on the *calculated* selection state if possible, but here we can't easily access the 'next' state.
    // BUT: The standard UI behavior is:
    // 1. Click on unselected -> Selects it (and deselects others unless modifiers).
    // 2. Click on selected -> Keeps selection (unless modifiers).
    // The code above updates `selectedSlideIds`. Since `setSelectedSlideIds` is async, we can't use the *new* value immediately.
    // However, we can re-derive what 'selectedSlideIds' WILL be, or simply:
    // If we just clicked 'id', it IS selected.
    // If modifiers were used, we handled it.
    // FOR DRAGGING: We usually drag what is selected.
    // We'll trust that if the user holds ctrl/shift, they expect standard behavior.
    // To simplify: we'll grab specific initial positions based on the `id` being dragged.
    // If `id` was already in `selectedSlideIds` (and no modifiers cleared it), we move the group.
    // If `id` was NOT in `selectedSlideIds`, we selected it alone (or added it).

    // Let's re-calculate effectively what IDs are "moving".
    // If we clicked an explicitly unselected item (without modifiers), it becomes the only selection.
    // If we click a selected item (without modifiers), we keep the group.

    // To properly support "move all selected", we need access to the current list of selected IDs.
    // But since state updates are pending, we might have a race if we rely on `selectedSlideIds`.
    // Strategy:
    // If shift/ctrl was NOT pressed, and `id` was NOT in `selectedSlideIds` before this click,
    // then the group is just `[id]`.
    // If `id` WAS in `selectedSlideIds`, and no modifiers, then the group is `selectedSlideIds` (preserved).
    // If modifiers used, `selectedSlideIds` is changing complexly.
    //
    // Given the complexity of predicting React state updates here:
    // A simpler approach for the *drag start* is to defer slightly or use a Ref for selectedIds?
    // Or simpler:
    // If the user *just* clicked to select this item (replacing selection), we only move this item.
    // If the user clicked an item *already* in the selection (and didn't deselect it), we move the whole group.

    const isAlreadySelected = selectedSlideIds.includes(id);
    const isModifier = e.ctrlKey || e.metaKey || e.shiftKey;

    let dragSet: string[] = [];

    if (!isModifier && !isAlreadySelected) {
      // We just replaced the selection with this one.
      dragSet = [id];
    } else if (isModifier) {
      // Modifiers are changing selection.
      // Dragging immediately after a modifier click is tricky.
      // Usually, if you Ctrl+Click to add, you "hold" that one.
      // If you Shift+Click, you "hold" the range.
      // For simplicity, if a modifier is used, we might just drag the clicked item effectively?
      // OR we try to respect the new selection.
      // Let's assume if you just added it, you want to drag it + others?
      // The `setSelectedSlideIds` above has fired.
      // We'll fallback to just dragging `id` to avoid glitches if state isn't ready,
      // UNLESS we are confident.
      // Actually, in many apps, Ctrl+Click *toggles* selection but doesn't immediately start a drag of the group unless you click-drag.
      // Let's assume the drag set is `selectedSlideIds` + changes.
      // Safest fallback:
      dragSet = [id];

      // Attempt to include others if we can reliable guess.
      // If Ctrl+Click added it:
      if ((e.ctrlKey || e.metaKey) && !isAlreadySelected) {
        dragSet = [...selectedSlideIds, id];
      }
      // If already selected and Ctrl+Click removed it:
      else if ((e.ctrlKey || e.metaKey) && isAlreadySelected) {
        dragSet = selectedSlideIds.filter(sid => sid !== id);
        // If we deselected it, we shouldn't be dragging it?
        // If we drag a deselected item, it's weird.
        // Let's just return to avoid dragging a deselected item?
        return;
      }
    } else {
      // No modifier, is already selected -> dragging the whole group.
      dragSet = selectedSlideIds;
    }

    // Prepare map
    const initialMap: Record<string, { start: number, end: number }> = {};
    slides.forEach(s => {
      if (dragSet.includes(s.id)) {
        initialMap[s.id] = { start: s.startTime, end: s.endTime };
      }
    });

    // Fallback: always include current if somehow missing
    if (!initialMap[id]) {
      initialMap[id] = { start: slide.startTime, end: slide.endTime };
    }

    setActiveDrag({
      id,
      type,
      startX: e.clientX,
      initialStart: slide.startTime,
      initialEnd: slide.endTime,
      initialMap
    });

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };


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
        // Initialize selection box on first drag
        setSelectionBox({ x: startX, y: startY, w: 0, h: 0 });
      }

      if (isDragSelect && trackRef.current) {
        const currentRect = trackRef.current.getBoundingClientRect();
        const currentX = ev.clientX - currentRect.left - 96; // Subtract 96px
        const currentY = ev.clientY - currentRect.top;

        setSelectionBox(prev => {
          if (!prev) return null; // Should not happen if isDragSelect is true and initialized above
          const width = currentX - startX; // Use startX from handleTrackMouseDown scope
          const height = currentY - startY; // Use startY from handleTrackMouseDown scope

          return {
            x: width > 0 ? startX : currentX,
            y: height > 0 ? startY : currentY,
            w: Math.abs(width),
            h: Math.abs(height)
          };
        });

        // Intersection Logic - This part remains the same, but it should use the *current* selectionBox state
        // The state update is async, so we need to re-calculate based on current mouse position
        const newSelectedIds: string[] = [];
        const currentSlides = slidesRef.current;
        const currentPxPerSec = pxPerSecRef.current;

        // Calculate box boundaries based on current mouse position and start position
        const boxX = Math.min(startX, currentX);
        const boxY = Math.min(startY, currentY);
        const boxW = Math.abs(currentX - startX);
        const boxH = Math.abs(currentY - startY);

        // Box Boundaries
        const boxRight = boxX + boxW;
        const boxBottom = boxY + boxH;

        currentSlides.forEach(slide => {
          const slideLeft = slide.startTime * currentPxPerSec;
          const slideRight = slide.endTime * currentPxPerSec;
          let slideTop = 0;
          let slideBottom = 0;

          // Determine Y range based on type & layer
          const layer = slide.layer || 0;

          if (slide.type === 'audio') {
            if (layer === 0) {
              slideTop = TRACK_LAYOUT.AUDIO_L1_TOP;
              slideBottom = TRACK_LAYOUT.AUDIO_L1_TOP + TRACK_LAYOUT.AUDIO_L1_HEIGHT;
            } else {
              slideTop = TRACK_LAYOUT.AUDIO_L2_TOP;
              slideBottom = TRACK_LAYOUT.AUDIO_L2_TOP + TRACK_LAYOUT.AUDIO_L2_HEIGHT;
            }
          } else {
            // Image/Video
            if (layer === 0) {
              slideTop = TRACK_LAYOUT.VISUAL_L1_TOP;
              slideBottom = TRACK_LAYOUT.VISUAL_L1_TOP + TRACK_LAYOUT.VISUAL_L1_HEIGHT;
            } else {
              slideTop = TRACK_LAYOUT.VISUAL_L2_TOP;
              slideBottom = TRACK_LAYOUT.VISUAL_L2_TOP + TRACK_LAYOUT.VISUAL_L2_HEIGHT;
            }
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
    const offsetX = clientX - rect.left - 96; // Subtract 96px header width
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

    // Split: X or Ctrl+K
    if ((e.key.toLowerCase() === 'x' && !e.ctrlKey && !e.metaKey) || ((e.ctrlKey || e.metaKey) && e.key === 'k')) {
      e.preventDefault();
      e.stopPropagation();
      handleSplit();
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



  const getSnapTime = (proposedTime: number, ignoreIds: string[] = []): number => {
    const snapThresholdSec = SNAP_THRESHOLD_PX / pxPerSec;

    // Snap points: 0, duration, and Start/End of ALL other slides
    const snapPoints = [0, duration, currentTime];

    // Add closest grid line
    const rulerInterval = getRulerInterval(pxPerSec);
    const closestGrid = Math.round(proposedTime / rulerInterval) * rulerInterval;
    snapPoints.push(closestGrid);

    // Add slide boundaries
    slides.forEach(s => {
      if (!ignoreIds.includes(s.id)) {
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

      setSlides(currentSlides => {
        if (prev.type === 'move') {
          // --- Group Move Logic ---
          const movingIds = Object.keys(prev.initialMap);
          const allInits = Object.values(prev.initialMap) as { start: number, end: number }[];

          // Identify Group Bounds (Initial)
          const groupInitStart = Math.min(...allInits.map(i => i.start));
          const groupInitEnd = Math.max(...allInits.map(i => i.end));

          // Dragged Item (Initial)
          const draggedInit = prev.initialMap[prev.id];

          // Determine Candidates for Snapping:
          // 1. Dragged Item Start
          // 2. Dragged Item End
          // 3. Group Start
          // 4. Group End

          // NOTE: deltaSec is the raw mouse movement applied to everyone.
          // We test if (candidate_initial + deltaSec) is close to a snap point.

          const candidates = [
            { type: 'drag-start', initVal: draggedInit.start },
            { type: 'drag-end', initVal: draggedInit.end },
            { type: 'group-start', initVal: groupInitStart },
            { type: 'group-end', initVal: groupInitEnd }
          ];

          const snapThresholdSec = SNAP_THRESHOLD_PX / pxPerSec;

          // Recreate snap points (Static Objects)
          const snapPoints: number[] = [0, duration, currentTime];
          const rulerInterval = getRulerInterval(pxPerSec);

          slides.forEach(s => {
            if (!movingIds.includes(s.id)) {
              snapPoints.push(s.startTime);
              snapPoints.push(s.endTime);
            }
          });
          lyrics.forEach(line => {
            snapPoints.push(line.time);
          });

          let bestDelta = deltaSec; // Default to raw movement
          let minSnapDist = snapThresholdSec; // Only snap if within threshold
          let foundSnap = false;

          candidates.forEach(cand => {
            const proposedVal = cand.initVal + deltaSec;

            // 1. Check against Static Points
            for (const point of snapPoints) {
              const dist = Math.abs(point - proposedVal);
              if (dist < minSnapDist) {
                minSnapDist = dist;
                bestDelta = point - cand.initVal;
                foundSnap = true;
              }
            }

            // 2. Check against Grid (Infinite Grid)
            const closestGrid = Math.round(proposedVal / rulerInterval) * rulerInterval;
            const gridDist = Math.abs(closestGrid - proposedVal);
            if (gridDist < minSnapDist) {
              minSnapDist = gridDist;
              bestDelta = closestGrid - cand.initVal;
              foundSnap = true;
            }
          });

          let effectiveDelta = foundSnap ? bestDelta : deltaSec;

          // 4. Global Clamp: Ensure NO item in the group is pushed before 0
          if (groupInitStart + effectiveDelta < 0) {
            effectiveDelta = -groupInitStart;
          }

          // 5. Apply effective delta to all allowed items
          return currentSlides.map(s => {
            const init = prev.initialMap[s.id];
            if (init) {
              const duration = init.end - init.start;

              // Handle Layer Switching (Vertical Drag)
              let newLayer = s.layer || 0;

              // Helper to check if mouseY is within a track rect
              const checkLayer = (y: number, top: number, height: number): boolean => {
                return y >= top && y <= top + height;
              };

              // Use trackRef logic similar to mouse move
              // We need offsetY relative to track.
              // We can approximate by checking if 'e.clientY' changed significantly?
              // Better: We need e.clientY relative to track.
              // Since we don't have track rect easily here without ref query every move (expensive?),
              // we can rely on storing track offset in 'activeDrag'.
              // But 'activeDrag' was set on MouseDown.
              // Let's grab track rect if possible or assume relative position if we had startY?
              // The 'handleMouseMove' has 'e.clientY'.
              // We need the track offset.

              // Let's try to get rect safely
              const trackRect = trackRef.current?.getBoundingClientRect();
              if (trackRect) {
                const offsetY = e.clientY - trackRect.top;

                // Logic to switch layer based on type
                if (s.type === 'audio') {
                  if (checkLayer(offsetY, TRACK_LAYOUT.AUDIO_L1_TOP, TRACK_LAYOUT.AUDIO_L1_HEIGHT)) newLayer = 0;
                  if (checkLayer(offsetY, TRACK_LAYOUT.AUDIO_L2_TOP, TRACK_LAYOUT.AUDIO_L2_HEIGHT)) newLayer = 1;
                } else {
                  if (checkLayer(offsetY, TRACK_LAYOUT.VISUAL_L1_TOP, TRACK_LAYOUT.VISUAL_L1_HEIGHT)) newLayer = 0;
                  if (checkLayer(offsetY, TRACK_LAYOUT.VISUAL_L2_TOP, TRACK_LAYOUT.VISUAL_L2_HEIGHT)) newLayer = 1;
                }
              }

              return {
                ...s,
                startTime: init.start + effectiveDelta,
                endTime: init.start + effectiveDelta + duration,
                layer: newLayer
              };
            }
            return s;
          });

        } else if (prev.type === 'resize-start') {
          // Resize Start (Single Item)
          let newStart = prev.initialStart + deltaSec;

          // Snap (ignore itself)
          newStart = getSnapTime(newStart, [prev.id]);

          // Clamp
          const minDuration = 0.5;
          const currentEnd = prev.initialEnd;
          newStart = Math.max(0, Math.min(newStart, currentEnd - minDuration));

          return currentSlides.map(s => {
            if (s.id !== prev.id) return s;
            return { ...s, startTime: newStart };
          });

        } else {
          // Resize End (Single Item)
          let newEnd = prev.initialEnd + deltaSec;

          // Snap (ignore itself)
          newEnd = getSnapTime(newEnd, [prev.id]);

          // Clamp
          const minDuration = 0.5;
          const currentStart = prev.initialStart;
          newEnd = Math.max(currentStart + minDuration, newEnd);

          return currentSlides.map(s => {
            if (s.id !== prev.id) return s;
            return { ...s, endTime: newEnd };
          });
        }
      });
      return prev;
    });
  };

  const handleMouseUp = (e: MouseEvent) => {
    // If it was a click on a selected item (no drag), update selection to just that item
    if (activeDrag && activeDrag.type === 'move') {
      const dist = Math.abs(e.clientX - activeDrag.startX);
      if (dist < 5) {
        // Check if this was a non-modifier click (implied by execution flow reaching here for group clicks)
        // Actually, to be safe, we only force single selection if the intent wasn't a modifier action.
        // Since modifier actions in mouseDown manipulate selection immediately, verification isn't strictly needed if we assume standard flow.
        // But we should check if the key is currently held? e.ctrlKey?
        // If I Ctrl+Click (Toggle), distance is 0.
        // If I toggle off, activeDrag might not even be set?
        // If I toggle off, 'selectedSlideIds' changes.
        // This block handles the case where we *preserved* multiple selection in anticipation of a drag.
        // That only happened in the `else if (selectedSlideIds.includes(id))` branch of MouseDown, which implies NO modifiers.
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
          setSelectedSlideIds([activeDrag.id]);
        }
      }
    }

    setActiveDrag(null);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    setSlides(prev => [...prev].sort((a, b) => a.startTime - b.startTime));
  };

  const handleZoomIn = () => setPxPerSec(prev => Math.min(200, prev + 10));
  const handleZoomOut = () => setPxPerSec(prev => Math.max(10, prev - 10));

  const toggleLayerVisibility = (type: 'visual' | 'audio', layer: number) => {
    setRenderConfig(prev => {
      const targetMap = prev.layerVisibility?.[type] || {};
      const newVisibility = { ...targetMap, [layer]: targetMap[layer] === false ? true : false };

      return {
        ...prev,
        layerVisibility: {
          ...prev.layerVisibility,
          [type]: newVisibility,
          // Ensure other type exists so we don't wipe it if undefined initially
          ...(type === 'visual' ? { audio: prev.layerVisibility?.audio || {} } : { visual: prev.layerVisibility?.visual || {} })
        } as { visual: Record<number, boolean>; audio: Record<number, boolean> }
      };
    });
  };

  const isLayerVisible = (type: 'visual' | 'audio', layer: number) => {
    return renderConfig.layerVisibility?.[type]?.[layer] !== false;
  };

  return (
    <div
      ref={editorRef}
      className="w-full max-w-[100vw] h-64 flex flex-col bg-zinc-900/95 backdrop-blur-md border-t border-white/10 z-20 shadow-xl outline-none overflow-hidden"
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
          <label className="flex items-center gap-2 px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs font-medium cursor-pointer transition-colors text-white whitespace-nowrap">
            <Plus size={14} /> Import Media
            <input type="file" className="hidden" accept="image/*,video/*,audio/*" multiple onChange={handleFileUpload} />
          </label>
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

          {/* Split Button */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleSplit}
              disabled={selectedSlideIds.length === 0}
              className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Split Content (X)"
            >
              <Split size={14} />
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
                  <>
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
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-zinc-500">Spd:</span>
                      <SpeedInput
                        value={s.playbackRate || 1}
                        onChange={(newRate) => {
                          setSlides(prev => prev.map(slide => {
                            if (slide.id === s.id) return { ...slide, playbackRate: newRate };
                            return slide;
                          }));
                        }}
                      />
                    </div>
                  </>
                );
              }
              return null;
            })()}
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleClearAll}
            className="p-1 hover:bg-red-900/50 text-zinc-500 hover:text-red-200 rounded transition-colors"
            title="Clear All Slides"
          >
            <Trash2 size={14} />
          </button>

          <div className="w-px h-4 bg-zinc-700 mx-1 self-center"></div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded transition-colors"
            title="Close Timeline"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Timeline Container */}
      <div
        ref={containerRef}
        onWheel={(e) => {
          if (containerRef.current) {
            // Shift+Wheel -> Horizontal Scroll
            // Wheel -> Vertical Scroll
            if (e.shiftKey) {
              e.preventDefault();
              containerRef.current.scrollLeft += e.deltaY;
            }
            // Default behavior handles vertical scroll
          }
        }}
        className="flex-1 overflow-x-auto overflow-y-auto relative bg-zinc-950 scroll-smooth custom-scrollbar cursor-default"
      >
        <div
          ref={trackRef}
          className="relative"
          style={{ width: `${totalWidth + 96}px`, minWidth: '100%', height: 'max(100%, 280px)' }}
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

          {/* Grid Lines */}
          <div className="absolute top-0 bottom-0 left-[96px] right-0 pointer-events-none z-0">
            {(() => {
              const rulerInterval = getRulerInterval(pxPerSec);
              return Array.from({ length: Math.ceil(totalWidth / (pxPerSec * rulerInterval)) }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-white/5"
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

          {/* 1. Ruler (Top Strip) - Sticky */}
          <div
            className="sticky top-0 left-0 right-0 h-6 border-b border-white/10 bg-zinc-900/90 backdrop-blur-sm select-none cursor-pointer z-[60] flex"
            onMouseDown={handleRulerMouseDown}
          >
            {/* Corner Box */}
            <div className="w-[96px] shrink-0 border-r border-white/10 flex items-center justify-center text-[10px] text-zinc-500 bg-zinc-900/90">
              Time
            </div>
            {/* Ruler Ticks Container */}
            <div className="relative flex-1">
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
          </div>
          {/* 2. Playhead & Current Time Line */}
          {/* 2. Playhead & Current Time Line */}
          <div
            className="absolute top-6 bottom-0 w-px bg-red-500 z-50 pointer-events-none"
            style={{
              left: '96px',
              transform: `translateX(${currentTime * pxPerSec}px)`,
              willChange: 'transform'
            }}
          >
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-red-500 rotate-45 transform origin-center shadow-sm" />
          </div>

          {/* 4. Slides Track (Images/Video) - Layer 0 */}
          <div className="absolute left-0 right-0 border-b border-white/5 bg-zinc-900/20"
            style={{ top: TRACK_LAYOUT.VISUAL_L1_TOP, height: TRACK_LAYOUT.VISUAL_L1_HEIGHT }}>

            {/* Sticky Header */}
            <div className="sticky left-0 w-[96px] h-full bg-zinc-900/90 border-r border-white/10 z-30 flex items-center justify-between px-2 text-[10px] text-zinc-400 backdrop-blur-sm">
              <span>Visual 1</span>
              <button
                onClick={(e) => { e.stopPropagation(); toggleLayerVisibility('visual', 0); }}
                className="p-1 hover:text-white hover:bg-zinc-700 rounded transition-colors"
              >
                {isLayerVisible('visual', 0) ? <Eye size={12} /> : <EyeOff size={12} className="text-zinc-600" />}
              </button>
            </div>

            <div className={`absolute top-0 bottom-0 left-[96px] right-0 ${!isLayerVisible('visual', 0) ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
              {slides.filter(s => s.type !== 'audio' && (s.layer === 0 || s.layer === undefined)).map(slide => (
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
          </div>

          {/* 4b. Slides Track (Images/Video) - Layer 1 */}
          <div className="absolute left-0 right-0 border-b border-white/5 bg-zinc-900/20"
            style={{ top: TRACK_LAYOUT.VISUAL_L2_TOP, height: TRACK_LAYOUT.VISUAL_L2_HEIGHT }}>

            {/* Sticky Header */}
            <div className="sticky left-0 w-[96px] h-full bg-zinc-900/90 border-r border-white/10 z-30 flex items-center justify-between px-2 text-[10px] text-zinc-400 backdrop-blur-sm">
              <span>Visual 2</span>
              <button
                onClick={(e) => { e.stopPropagation(); toggleLayerVisibility('visual', 1); }}
                className="p-1 hover:text-white hover:bg-zinc-700 rounded transition-colors"
              >
                {isLayerVisible('visual', 1) ? <Eye size={12} /> : <EyeOff size={12} className="text-zinc-600" />}
              </button>
            </div>

            <div className={`absolute top-0 bottom-0 left-[96px] right-0 ${!isLayerVisible('visual', 1) ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
              {slides.filter(s => s.type !== 'audio' && s.layer === 1).map(slide => (
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
                  {slide.type === 'video' ? (
                    <video src={slide.url} className="w-full h-full object-cover opacity-60 pointer-events-none" muted />
                  ) : (
                    <img src={slide.url} className="w-full h-full object-cover opacity-60 pointer-events-none" draggable={false} alt={slide.name} />
                  )}
                  <div className="absolute inset-0 p-1 pointer-events-none flex flex-col justify-end">
                    <span className="text-[10px] font-bold drop-shadow-md truncate text-zinc-200 bg-black/30 px-1 rounded w-max max-w-full">{slide.name}</span>
                  </div>
                  {slide.type === 'video' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); //...
                        setSlides(prev => prev.map(s => {
                          if (s.id === slide.id) return { ...s, isMuted: !s.isMuted };
                          return s;
                        }));
                      }}
                      className="absolute top-1 right-10 p-0.5 bg-black/60 hover:bg-zinc-600 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-40"
                    >
                      {slide.isMuted !== false ? <VolumeX size={10} /> : <Volume2 size={10} />}
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}
                    className="absolute top-1 right-4 p-0.5 bg-black/60 hover:bg-red-500 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-30"
                  >
                    <X size={10} />
                  </button>
                  <div
                    className="absolute top-0 bottom-0 left-0 w-3 cursor-w-resize flex items-center justify-center bg-black/20 hover:bg-purple-500/80 transition-colors z-20"
                    onMouseDown={(e) => handleMouseDown(e, slide.id, 'resize-start')}
                  >
                    <GripHorizontal size={10} className="text-white/70 rotate-90" />
                  </div>
                  <div
                    className="absolute top-0 bottom-0 right-0 w-3 cursor-e-resize flex items-center justify-center bg-black/20 hover:bg-purple-500/80 transition-colors z-20"
                    onMouseDown={(e) => handleMouseDown(e, slide.id, 'resize-end')}
                  >
                    <GripHorizontal size={10} className="text-white/70 rotate-90" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Lyrics Track */}
          <div className="absolute left-0 right-0 overflow-hidden" style={{ top: TRACK_LAYOUT.LYRICS_TOP, height: TRACK_LAYOUT.LYRICS_HEIGHT }}>
            <div className="sticky left-0 w-[96px] h-full bg-zinc-900/90 border-r border-white/10 z-30 flex items-center px-2 text-[10px] text-zinc-400 backdrop-blur-sm select-none">
              <span>Lyrics</span>
            </div>

            {/* Content */}
            <div className="absolute top-0 bottom-0 left-[96px] right-0 pointer-events-none">
              {lyrics.map((line, idx) => (
                <div
                  key={idx}
                  className="absolute top-1 bottom-1 text-[10px] text-zinc-400 truncate hover:text-white transition-colors hover:bg-zinc-800/50 rounded px-2 cursor-pointer border-l border-zinc-700 flex items-center whitespace-nowrap pointer-events-auto"
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
          </div>

          {/* 6. Audio Track - Layer 0 */}
          <div className="absolute left-0 right-0 border-t border-white/5 bg-zinc-900/40" style={{ top: TRACK_LAYOUT.AUDIO_L1_TOP, height: TRACK_LAYOUT.AUDIO_L1_HEIGHT }}>

            {/* Sticky Header */}
            <div className="sticky left-0 w-[96px] h-full bg-zinc-900/90 border-r border-white/10 z-30 flex items-center justify-between px-2 text-[10px] text-zinc-400 backdrop-blur-sm">
              <span>Audio 1</span>
              <button
                onClick={(e) => { e.stopPropagation(); toggleLayerVisibility('audio', 0); }}
                className="p-1 hover:text-white hover:bg-zinc-700 rounded transition-colors"
              >
                {isLayerVisible('audio', 0) ? <Eye size={12} /> : <EyeOff size={12} className="text-zinc-600" />}
              </button>
            </div>

            <div className={`absolute top-0 bottom-0 left-[96px] right-0 ${!isLayerVisible('audio', 0) ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
              {slides.filter(s => s.type === 'audio' && (s.layer === 0 || s.layer === undefined)).map(slide => (
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
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <Volume2 size={16} className="text-emerald-200" />
                  </div>
                  <div className="absolute inset-0 p-1 pointer-events-none flex flex-col justify-center">
                    <span className="text-[9px] font-bold drop-shadow-md truncate text-emerald-100 px-1">{slide.name}</span>
                  </div>
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
                  <button
                    onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}
                    className="absolute top-1 right-3 p-0.5 bg-black/60 hover:bg-red-500 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-40"
                  >
                    <X size={10} />
                  </button>
                  <div
                    className="absolute top-0 bottom-0 left-0 w-2 cursor-w-resize flex items-center justify-center hover:bg-emerald-500/50 transition-colors z-20"
                    onMouseDown={(e) => handleMouseDown(e, slide.id, 'resize-start')}
                  >
                  </div>
                  <div
                    className="absolute top-0 bottom-0 right-0 w-2 cursor-e-resize flex items-center justify-center hover:bg-emerald-500/50 transition-colors z-20"
                    onMouseDown={(e) => handleMouseDown(e, slide.id, 'resize-end')}
                  >
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6b. Audio Track - Layer 1 */}
          <div className="absolute left-0 right-0 border-t border-white/5 bg-zinc-900/40" style={{ top: TRACK_LAYOUT.AUDIO_L2_TOP, height: TRACK_LAYOUT.AUDIO_L2_HEIGHT }}>

            {/* Sticky Header */}
            <div className="sticky left-0 w-[96px] h-full bg-zinc-900/90 border-r border-white/10 z-30 flex items-center justify-between px-2 text-[10px] text-zinc-400 backdrop-blur-sm">
              <span>Audio 2</span>
              <button
                onClick={(e) => { e.stopPropagation(); toggleLayerVisibility('audio', 1); }}
                className="p-1 hover:text-white hover:bg-zinc-700 rounded transition-colors"
              >
                {isLayerVisible('audio', 1) ? <Eye size={12} /> : <EyeOff size={12} className="text-zinc-600" />}
              </button>
            </div>

            <div className={`absolute top-0 bottom-0 left-[96px] right-0 ${!isLayerVisible('audio', 1) ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
              {slides.filter(s => s.type === 'audio' && s.layer === 1).map(slide => (
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
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <Volume2 size={16} className="text-emerald-200" />
                  </div>
                  <div className="absolute inset-0 p-1 pointer-events-none flex flex-col justify-center">
                    <span className="text-[9px] font-bold drop-shadow-md truncate text-emerald-100 px-1">{slide.name}</span>
                  </div>
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
                  <button
                    onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}
                    className="absolute top-1 right-3 p-0.5 bg-black/60 hover:bg-red-500 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-40"
                  >
                    <X size={10} />
                  </button>
                  <div
                    className="absolute top-0 bottom-0 left-0 w-2 cursor-w-resize flex items-center justify-center hover:bg-emerald-500/50 transition-colors z-20"
                    onMouseDown={(e) => handleMouseDown(e, slide.id, 'resize-start')}
                  >
                  </div>
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
    </div >
  );
};

export default VisualEditor;