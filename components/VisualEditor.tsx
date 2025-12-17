import React, { useState, useRef, useEffect } from 'react';
import { VisualSlide, LyricLine } from '../types';
import { Plus, X, ImageIcon, GripHorizontal, ZoomIn, ZoomOut, Trash2, Volume2, VolumeX } from './Icons';
import { formatTime } from '../utils/parsers';

interface VisualEditorProps {
  slides: VisualSlide[];
  setSlides: React.Dispatch<React.SetStateAction<VisualSlide[]>>;
  currentTime: number;
  duration: number;
  lyrics: LyricLine[];
  onSeek: (time: number) => void;
}

const RULER_INTERVAL = 5; // Seconds between ruler marks
const SNAP_THRESHOLD_PX = 10; // Pixels to snap

const VisualEditor: React.FC<VisualEditorProps> = ({ slides, setSlides, currentTime, duration, lyrics, onSeek }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [pxPerSec, setPxPerSec] = useState(40); // Default zoom level

  // Calculate max extent of slides to expand timeline if needed
  const maxSlideEnd = Math.max(0, ...slides.map(s => s.endTime));

  // Horizontal timeline: Width based on duration, but at least 60s or enough to fit all slides
  const timelineDuration = Math.max(duration, 60, maxSlideEnd);
  const totalWidth = timelineDuration * pxPerSec;

  // Interaction State
  const [selectedSlideIds, setSelectedSlideIds] = useState<string[]>([]);

  const [activeDrag, setActiveDrag] = useState<{
    id: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    initialStart: number;
    initialEnd: number;
  } | null>(null);

  const [isScrubbing, setIsScrubbing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileCount = e.target.files.length;

      // Calculate start time based on current playback position
      const startTime = currentTime;
      // Calculate remaining duration
      const remainingDuration = Math.max(0, duration - startTime);

      // Determine duration per image
      // Fill the remaining duration, but ensure at least 3s per image.
      const calculatedDuration = remainingDuration / fileCount;
      const durationPerImage = Math.max(3, calculatedDuration);

      const newSlides: VisualSlide[] = [];

      Array.from(e.target.files).forEach((item, index) => {
        const file = item as File;
        const url = URL.createObjectURL(file);
        const type = file.type.startsWith('video/') ? 'video' : 'image';

        const start = startTime + (index * durationPerImage);
        const end = start + durationPerImage;

        newSlides.push({
          id: Math.random().toString(36).substr(2, 9),
          url,
          type,
          startTime: start,
          endTime: end,
          name: file.name,
          isMuted: type === 'video', // Default muted
          volume: type === 'video' ? 1 : undefined
        });
      });

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
    if (e.shiftKey) {
      setSelectedSlideIds(prev => {
        if (prev.includes(id)) return prev.filter(sid => sid !== id);
        return [...prev, id];
      });
    } else {
      // If clicking an already selected item (without shift), keep it selected (and potentially others if we supported multi-drag, but for now reset to single if it wasn't selected or if we want to isolate)
      // Standard behavior: Click on unselected -> Select only that. Click on selected -> Keep selection (until mouse up usually, but simpler: select only that unless already selected??)
      // Simplest: If not shift, set to just this ID.
      if (!selectedSlideIds.includes(id)) {
        setSelectedSlideIds([id]);
      } else {
        // If it is already selected, we don't clear others immediately on mousedown to allow for potential multi-drag in future, 
        // but since we only support single drag, we might as well reduce validation friction.
        // Actually, let's strictly set single selection on click without shift to match "Single Selection" requirement clearly.
        // User requested: "Single selection (image click)... Multi select ... shift+click".
        // If I click one of a group without shift, it usually deselects others.
        setSelectedSlideIds([id]);
      }
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

  // Timeline Scrubbing Handlers
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    // Only trigger if left click
    if (e.button !== 0) return;

    // Stop propagation to prevent conflicting drags if clicking specific elements
    // But we want to allow this on Ruler/Track/Playhead
    e.stopPropagation();
    editorRef.current?.focus();

    setSelectedSlideIds([]);
    setIsScrubbing(true);
    updateScrubPosition(e.clientX);

    window.addEventListener('mousemove', handleScrubMouseMove);
    window.addEventListener('mouseup', handleScrubMouseUp);
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

    // 1. Delete
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSlideIds.length > 0) {
      e.preventDefault();
      setSlides(prev => prev.filter(s => !selectedSlideIds.includes(s.id)));
      setSelectedSlideIds([]);
    }

    // 2. Move (Left/Right Arrow) - 0.5s Step
    if (selectedSlideIds.length > 0 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      e.stopPropagation(); // Stop bubbling to prevent audio seek
      const delta = e.key === 'ArrowRight' ? 0.5 : -0.5;

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
    const snapPoints = [0, duration];

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

          // Apply snapping
          newStart = getSnapTime(newStart, prev.id);

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
            <ImageIcon size={16} className="text-purple-400" />
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

          {/* Selection Utilities */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedSlideIds(slides.map(s => s.id))}
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
              if (s && s.type === 'video') {
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
            <Plus size={14} /> Import Images/Videos
            <input type="file" className="hidden" accept="image/*,video/*" multiple onChange={handleFileUpload} />
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
          onMouseDown={handleTimelineMouseDown}
        >

          {/* 1. Ruler (Top Strip) */}
          <div
            className="absolute top-0 left-0 right-0 h-6 border-b border-white/10 bg-zinc-900/50 select-none cursor-pointer z-40"
            onMouseDown={handleTimelineMouseDown}
          >
            {Array.from({ length: Math.ceil(totalWidth / (pxPerSec * RULER_INTERVAL)) }).map((_, i) => {
              const seconds = i * RULER_INTERVAL;
              if (seconds > timelineDuration) return null;
              return (
                <div
                  key={i}
                  className="absolute bottom-0 border-l border-white/20 text-[9px] text-zinc-500 font-mono pl-1 pb-0.5 pointer-events-none"
                  style={{ left: seconds * pxPerSec, width: RULER_INTERVAL * pxPerSec }}
                >
                  {formatTime(seconds)}
                </div>
              );
            })}
          </div>

          {/* 2. Grid Lines (Vertical) */}
          <div className="absolute top-6 bottom-0 left-0 right-0 pointer-events-none">
            {Array.from({ length: Math.ceil(totalWidth / (pxPerSec * RULER_INTERVAL)) }).map((_, i) => (
              <div
                key={i}
                className="absolute h-full border-l border-white/5"
                style={{ left: i * RULER_INTERVAL * pxPerSec }}
              ></div>
            ))}
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
            onMouseDown={handleTimelineMouseDown}
          >
            <div className="absolute top-6 -ml-2.5 bg-red-500 text-white text-[9px] px-1 rounded font-mono shadow-md z-30 group-hover:scale-110 transition-transform">
              {formatTime(currentTime)}
            </div>
          </div>

          {/* 4. Slides Track (Images) */}
          <div className="absolute top-8 h-24 left-0 right-0 border-b border-white/5 bg-zinc-900/20">
            {slides.map(slide => (
              <div
                key={slide.id}
                style={{
                  left: slide.startTime * pxPerSec,
                  width: Math.max(10, (slide.endTime - slide.startTime) * pxPerSec)
                }}
                className={`absolute top-1 bottom-1 rounded-md overflow-hidden group bg-zinc-800 border shadow-sm select-none cursor-move
                     ${(activeDrag?.id === slide.id || selectedSlideIds.includes(slide.id)) ? 'border-purple-400 z-30 shadow-xl opacity-90' : 'border-zinc-600 hover:border-zinc-400 z-10 hover:z-20'}
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
                    className="absolute top-1 right-6 p-0.5 bg-black/60 hover:bg-zinc-600 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-40"
                    title={slide.isMuted !== false ? "Unmute" : "Mute"}
                  >
                    {slide.isMuted !== false ? <VolumeX size={10} /> : <Volume2 size={10} />}
                  </button>
                )}

                {/* Delete Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}
                  className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-red-500 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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
          <div className="absolute top-36 h-12 left-0 right-0 overflow-hidden">
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

        </div>
      </div>
    </div>
  );
};

export default VisualEditor;