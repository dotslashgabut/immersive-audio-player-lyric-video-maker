import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Maximize, Minimize, Upload, Music, FileText, Settings, ImageIcon,
  Repeat, Square, Eye, EyeOff, Video, Download, Film, Type, X
} from './components/Icons';
import { AudioMetadata, LyricLine, TabView, VisualSlide, VideoPreset } from './types';
import { formatTime, parseLRC, parseSRT } from './utils/parsers';
import VisualEditor from './components/VisualEditor';

function App() {
  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const abortRenderRef = useRef(false);

  // State: Media & Data
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<AudioMetadata>({
    title: 'No Audio Loaded',
    artist: 'Select a file',
    coverUrl: null,
  });
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [visualSlides, setVisualSlides] = useState<VisualSlide[]>([]);

  // State: Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // State: UI
  const [activeTab, setActiveTab] = useState<TabView>(TabView.PLAYER);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMouseIdle, setIsMouseIdle] = useState(false);
  const [bypassAutoHide, setBypassAutoHide] = useState(false);


  // State: Video Export
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '3:4' | '1:1'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [preset, setPreset] = useState<VideoPreset>('default');
  const [customFontName, setCustomFontName] = useState<string | null>(null);

  // Derived dimensions
  const getCanvasDimensions = () => {
    const is1080p = resolution === '1080p';

    switch (aspectRatio) {
      case '9:16':
        return is1080p ? { w: 1080, h: 1920 } : { w: 720, h: 1280 };
      case '3:4':
        return is1080p ? { w: 1080, h: 1440 } : { w: 720, h: 960 };
      case '1:1':
        return is1080p ? { w: 1080, h: 1080 } : { w: 720, h: 720 };
      case '16:9':
      default:
        return is1080p ? { w: 1920, h: 1080 } : { w: 1280, h: 720 };
    }
  };

  const { w: canvasWidth, h: canvasHeight } = getCanvasDimensions();

  // Visibility Toggles (Shortcuts)
  const [showInfo, setShowInfo] = useState(true);
  const [showPlayer, setShowPlayer] = useState(true);

  // Derived State
  const activeSlide = visualSlides.find(
    s => s.type !== 'audio' && currentTime >= s.startTime && currentTime < s.endTime
  );

  const activeAudioSlides = visualSlides.filter(
    s => s.type === 'audio' && currentTime >= s.startTime && currentTime < s.endTime
  );

  const currentLyricIndex = lyrics.findIndex((line, index) => {
    const nextLine = lyrics[index + 1];
    return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
  });

  // --- Handlers ---

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioSrc(url);

      // Initial Fallback Metadata
      const fallbackMeta = {
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Unknown Artist',
        coverUrl: null,
      };
      setMetadata(fallbackMeta);

      // jsmediatags parsing
      // @ts-ignore
      import('jsmediatags/dist/jsmediatags.min.js').then((jsmediatags) => {
        jsmediatags.read(file, {
          onSuccess: (tag: any) => {
            const { title, artist, picture } = tag.tags;
            let coverUrl = null;
            if (picture) {
              const { data, format } = picture;
              let base64String = "";
              for (let i = 0; i < data.length; i++) {
                base64String += String.fromCharCode(data[i]);
              }
              coverUrl = `data:${format};base64,${window.btoa(base64String)}`;
            }

            setMetadata({
              title: title || fallbackMeta.title,
              artist: artist || fallbackMeta.artist,
              coverUrl: coverUrl || null
            });
          },
          onError: (error: any) => {
            console.log('Error reading tags:', error);
          }
        });
      });

      // Reset play state
      setIsPlaying(false);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.load();
      }
    }
  };

  const handleMetadataUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      setMetadata(prev => ({ ...prev, coverUrl: url, backgroundType: isVideo ? 'video' : 'image' }));
    }
  };

  const handleLyricsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        const ext = file.name.split('.').pop()?.toLowerCase();
        let parsedLyrics: LyricLine[] = [];

        if (ext === 'lrc') {
          parsedLyrics = parseLRC(text);
        } else if (ext === 'srt') {
          parsedLyrics = parseSRT(text);
        }
        setLyrics(parsedLyrics);
      } catch (err) {
        console.error("Failed to parse lyrics:", err);
        alert("Failed to parse lyric file.");
      }
    }
  };

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!window.FontFace || !document.fonts) {
        alert("Custom fonts are not supported in this browser.");
        return;
      }
      try {
        const url = URL.createObjectURL(file);
        const fontName = 'CustomFont';
        const font = new FontFace(fontName, `url(${url})`);
        await font.load();
        document.fonts.add(font);
        setCustomFontName(fontName);
      } catch (err) {
        console.error("Failed to load font:", err);
        alert("Failed to load font file.");
      }
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, []);

  const toggleLoop = () => {
    setIsLooping(!isLooping);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (isRendering) {
        setRenderProgress((audioRef.current.currentTime / duration) * 100);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
    setIsMuted(newVol === 0);
  };

  // --- Video Export Logic ---

  const drawCanvasFrame = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,

    images: Map<string, HTMLImageElement>,
    videos: Map<string, HTMLVideoElement>,
    activePreset: VideoPreset
  ) => {
    // Helper for wrapping text
    const getWrappedLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
      // 0. Handle explicit newlines first (Recursive)
      if (text.includes('\n')) {
        return text.split('\n').flatMap(line => getWrappedLines(ctx, line, maxWidth));
      }

      // 1. Initial split by spaces to respect word boundaries for Latin
      const words = text.split(' ');
      let preLines: string[] = [];
      let currentLine = words[0] || '';

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + " " + word;
        const width = ctx.measureText(testLine).width;
        if (width < maxWidth) {
          currentLine = testLine;
        } else {
          preLines.push(currentLine);
          currentLine = word;
        }
      }
      preLines.push(currentLine);

      // 2. Force break long strings (like CJK, or long URLs) that exceed width
      const finalLines: string[] = [];
      for (const line of preLines) {
        if (ctx.measureText(line).width <= maxWidth) {
          finalLines.push(line);
        } else {
          // Break line by characters
          let charLine = "";
          for (const char of line) {
            if (ctx.measureText(charLine + char).width <= maxWidth) {
              charLine += char;
            } else {
              if (charLine) finalLines.push(charLine);
              charLine = char;
            }
          }
          if (charLine) finalLines.push(charLine);
        }
      }
      return finalLines;
    };

    const drawWrappedText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
      const lines = getWrappedLines(ctx, text, maxWidth);

      // Draw lines centered vertically around y
      const startY = y - ((lines.length - 1) * lineHeight) / 2;
      lines.forEach((l, i) => {
        ctx.fillText(l, x, startY + (i * lineHeight));
      });
    };
    const sansFont = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    const serifFont = 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';
    const monoFont = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    const rockFont = '"Metal Mania", cursive';
    const kidsFont = '"Fredoka One", cursive';
    const sadFont = '"Shadows Into Light", cursive';
    const loveFont = '"Dancing Script", cursive';
    const techFont = '"Orbitron", sans-serif';
    const gothicFont = '"UnifrakturMaguntia", cursive';
    const experimentalFont = '"Rubik Glitch", cursive';

    // Choose Font Family
    let fontFamily = sansFont;
    if (activePreset === 'classic') fontFamily = serifFont;
    else if (activePreset === 'monospace') fontFamily = monoFont;
    else if (activePreset === 'metal') fontFamily = rockFont;
    else if (activePreset === 'kids') fontFamily = kidsFont;
    else if (activePreset === 'sad') fontFamily = sadFont;
    else if (activePreset === 'romantic') fontFamily = loveFont;
    else if (activePreset === 'tech') fontFamily = techFont;
    else if (activePreset === 'gothic') fontFamily = gothicFont;

    if (customFontName) fontFamily = `"${customFontName}", sans-serif`;

    // Treat Square (1:1) as portrait for layout purposes (centered content)
    const isPortrait = width <= height;

    // Scale Factor: All sizing logic is based on 1080p. 
    // If 720p, we scale everything down by ~0.66
    // 1080p long edge = 1920, 720p long edge = 1280. 1280/1920 = 0.666
    const scale = resolution === '1080p' ? 1 : (1280 / 1920);

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // 1. Draw Background
    const currentSlide = visualSlides.find(s => s.type !== 'audio' && time >= s.startTime && time < s.endTime);

    // Helper to draw scaled
    const drawScaled = (img: HTMLImageElement | HTMLVideoElement) => {
      const isVideo = img instanceof HTMLVideoElement;
      const w = isVideo ? (img as HTMLVideoElement).videoWidth : (img as HTMLImageElement).width;
      const h = isVideo ? (img as HTMLVideoElement).videoHeight : (img as HTMLImageElement).height;

      if (w && h) {
        const imgScale = Math.max(width / w, height / h);
        const x = (width / 2) - (w / 2) * imgScale;
        const y = (height / 2) - (h / 2) * imgScale;
        ctx.drawImage(img, x, y, w * imgScale, h * imgScale);
      }
    };

    if (currentSlide) {
      if (currentSlide.type === 'video' && videos.has(currentSlide.id)) {
        const vid = videos.get(currentSlide.id);
        if (vid) drawScaled(vid);
      } else {
        const img = images.get(currentSlide.id);
        if (img) drawScaled(img);
      }
    } else if (metadata.coverUrl) {
      if (metadata.backgroundType === 'video' && videos.has('background')) {
        const vid = videos.get('background');
        if (vid) drawScaled(vid);
      } else {
        const img = images.get('cover');
        if (img) drawScaled(img);
      }
    }

    // Overlay
    if (activePreset !== 'just_video') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Darken bg
      if (currentSlide) ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, width, height);
    }

    // SHORTCIRCUIT FOR 'just_video'
    if (activePreset === 'just_video') return;

    // 2. Draw Lyrics
    const activeIdx = lyrics.findIndex((line, index) => {
      const nextLine = lyrics[index + 1];
      return time >= line.time && (!nextLine || time < nextLine.time);
    });

    // Layout config (Scaled)
    let baseFontSize = (isPortrait ? 50 : 60) * scale;
    let secondaryFontSize = (isPortrait ? 25 : 30) * scale;
    let lineSpacing = (isPortrait ? 80 : 100) * scale;

    // Preset Overrides
    if (activePreset === 'large') {
      baseFontSize = (isPortrait ? 90 : 120) * scale;
      secondaryFontSize = (isPortrait ? 30 : 40) * scale; // Keep neighbors small or hide them
      lineSpacing = (isPortrait ? 110 : 140) * scale;
    } else if (activePreset === 'large_upper' || activePreset === 'big_center' || activePreset === 'metal' || activePreset === 'kids' || activePreset === 'tech' || activePreset === 'testing' || activePreset === 'testing_up') {
      baseFontSize = (isPortrait ? 80 : 110) * scale;
      secondaryFontSize = (isPortrait ? 30 : 40) * scale;
      lineSpacing = (isPortrait ? 110 : 140) * scale;
    } else if (activePreset === 'sad' || activePreset === 'romantic' || activePreset === 'gothic') {
      baseFontSize = (isPortrait ? 60 : 75) * scale; // Smaller for finer fonts
      secondaryFontSize = (isPortrait ? 25 : 30) * scale;
      lineSpacing = (isPortrait ? 90 : 120) * scale;
    } else if (activePreset === 'classic') {
      baseFontSize = (isPortrait ? 55 : 65) * scale;
      secondaryFontSize = (isPortrait ? 28 : 34) * scale;
    } else if (activePreset === 'slideshow') {
      baseFontSize = (isPortrait ? 30 : 40) * scale;
      secondaryFontSize = 0;
      lineSpacing = 0;
    }

    if (activeIdx !== -1) {
      const centerY = height / 2;

      // Calculate vertical shift if active line is wrapped (for Large presets)
      let activeLineShift = 0;
      const isBigLayout = ['large', 'large_upper', 'big_center', 'metal', 'kids', 'sad', 'romantic', 'tech', 'gothic', 'testing', 'testing_up'].includes(activePreset);
      if (isBigLayout || activePreset === 'slideshow') {
        const activeLine = lyrics[activeIdx];
        // We need to temporarily set the font to measure accurately
        const weight = '900';
        ctx.font = `${weight} ${baseFontSize}px ${fontFamily}`;

        const maxWidth = width * 0.9;
        const textToCheck = (activePreset === 'large_upper' || activePreset === 'big_center' || activePreset === 'metal' || activePreset === 'tech' || activePreset === 'testing_up') ? activeLine.text.toUpperCase() : activeLine.text;
        const lines = getWrappedLines(ctx, textToCheck, maxWidth);

        if (lines.length > 1) {
          const wrappedLineHeight = baseFontSize * 1.2;
          activeLineShift = ((lines.length - 1) * wrappedLineHeight) / 2;
        }
      }

      // Draw surrounding lines
      const range = isBigLayout ? 1 : 2; // Show fewer lines in large mode

      for (let i = -range; i <= range; i++) {
        const idx = activeIdx + i;
        if (idx >= 0 && idx < lyrics.length) {
          // Testing Preset: Hide previous lyrics (i < 0)
          if ((activePreset === 'testing' || activePreset === 'testing_up') && i < 0) continue;

          const line = lyrics[idx];
          const isCurrent = i === 0;

          // Style Setup
          ctx.textAlign = (activePreset === 'large' || activePreset === 'large_upper') ? 'left' : 'center';
          ctx.textBaseline = 'middle';

          let fontSpec = `${secondaryFontSize}px ${fontFamily}`;
          let fillStyle = 'rgba(255, 255, 255, 0.5)'; // Default Inactive

          if (isBigLayout) {
            fillStyle = 'rgba(113, 113, 122, 0.8)'; // Zinc-500
            if (activePreset === 'tech') fillStyle = 'rgba(34, 211, 238, 0.4)'; // Cyan-ish for inactive tech
            if (isCurrent) {
              fillStyle = '#ffffff';
              if (activePreset === 'romantic') fillStyle = '#fce7f3'; // Pink-100
              if (activePreset === 'tech') fillStyle = '#ecfeff'; // Cyan-50
            }
          } else if (activePreset === 'classic') {
            fillStyle = 'rgba(161, 161, 170, 0.8)'; // Zinc-400 equivalent
            if (isCurrent) {
              fillStyle = '#fef3c7'; // Amber-100
            }
          } else {
            if (isCurrent) fillStyle = '#ffffff';
          }

          if (isCurrent) {
            let weight = 'bold';
            if (activePreset === 'large' || activePreset === 'large_upper' || activePreset === 'big_center' || activePreset === 'metal' || activePreset === 'tech' || activePreset === 'testing' || activePreset === 'testing_up') weight = '900';
            if (activePreset === 'slideshow') weight = '400';
            if (activePreset === 'classic' || activePreset === 'romantic') weight = 'italic bold';
            if (activePreset === 'sad' || activePreset === 'gothic' || activePreset === 'kids') weight = '400'; // Some fonts come with specific weights

            fontSpec = `${weight} ${baseFontSize}px ${fontFamily}`;
          }

          ctx.font = fontSpec;
          ctx.fillStyle = fillStyle;

          // Shadow for active
          if (isCurrent) {
            if (activePreset === 'tech') {
              ctx.shadowColor = 'rgba(34, 211, 238, 0.8)'; // Cyan glow
              ctx.shadowBlur = 15 * scale;
            } else if (activePreset === 'romantic') {
              ctx.shadowColor = 'rgba(236, 72, 153, 0.6)'; // Pink glow
              ctx.shadowBlur = 15 * scale;
            } else if (activePreset === 'kids') {
              ctx.shadowColor = 'rgba(0,0,0,0.5)';
              ctx.shadowBlur = 0;
              ctx.shadowOffsetX = 3 * scale;
              ctx.shadowOffsetY = 3 * scale;
            } else if (activePreset === 'testing' || activePreset === 'testing_up') {
              ctx.shadowColor = 'transparent';
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 0;
            } else {
              ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
              ctx.shadowBlur = (activePreset === 'classic' ? 20 : 10) * scale;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 2 * scale;
            }
          } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
          }

          let yPos = centerY + (i * lineSpacing);
          // Apply shift to prevent overlap with multi-line active text
          if (i < 0) yPos -= activeLineShift;
          if (i > 0) yPos += activeLineShift;

          // X Position
          let xPos = width / 2;
          if (activePreset === 'large' || activePreset === 'large_upper') {
            // Left aligned with padding
            xPos = 60 * scale;
          }

          // Text measurement for basic wrapping prevention (clipping)
          const maxWidth = width * 0.9;

          if (activePreset === 'slideshow') {
            // Slideshow strict single line or wrapped but simple
            if (i !== 0) continue; // Hide neighbors
            drawWrappedText(ctx, line.text, xPos, yPos, maxWidth, baseFontSize * 1.2);
          } else if (isBigLayout && isCurrent) {
            const textToDraw = (activePreset === 'large_upper' || activePreset === 'big_center' || activePreset === 'metal' || activePreset === 'tech' || activePreset === 'testing_up') ? line.text.toUpperCase() : line.text;
            drawWrappedText(ctx, textToDraw, xPos, yPos, maxWidth, baseFontSize * 1.2);
          } else {
            // Fallback for others or non-active lines (no wrap, just print)
            const textToDraw = line.text;
            ctx.fillText(textToDraw, xPos, yPos, maxWidth);
          }
        }
      }
      // Reset Shadow
      ctx.shadowColor = 'transparent';
    } else {
      // Draw Song Title if no lyrics (Center Screen Placeholder)
      if (lyrics.length === 0) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${baseFontSize}px ${fontFamily}`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 10 * scale;
        ctx.fillText(metadata.title, width / 2, height / 2 - (40 * scale));

        ctx.font = `${secondaryFontSize}px ${fontFamily}`;
        ctx.fillStyle = '#cccccc';
        ctx.fillText(metadata.artist, width / 2, height / 2 + (40 * scale));
        ctx.shadowColor = 'transparent';
      }
    }

    // 3. Draw Metadata Overlay
    if (true) {
      // Group 2: Bottom Center Layouts
      if (['big_center', 'metal', 'kids', 'sad', 'romantic', 'tech', 'gothic', 'testing', 'testing_up', 'slideshow'].includes(activePreset)) {
        // Custom Metadata: Bottom of screen, centered, no art, small title
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let bottomMargin = 80 * scale; // Distance from bottom
        if (activePreset === 'testing' || activePreset === 'testing_up') bottomMargin = 120 * scale;

        const centerX = width / 2;

        // Title
        const titleSize = 20 * scale;
        ctx.font = `bold ${titleSize}px ${fontFamily}`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4 * scale;

        // Draw Title at bottom
        const titleY = height - bottomMargin - (30 * scale);

        // Tech preset: Title uppercase
        const titleText = (activePreset === 'tech') ? metadata.title.toUpperCase() : metadata.title;
        ctx.fillText(titleText, centerX, titleY);

        // Artist
        let artistSize = 16 * scale;
        if (activePreset === 'testing' || activePreset === 'testing_up') artistSize = 25 * scale;
        ctx.font = `${artistSize}px ${fontFamily}`;
        ctx.fillStyle = '#d4d4d8';

        const artistY = height - bottomMargin;
        ctx.fillText(metadata.artist, centerX, artistY);

        ctx.shadowColor = 'transparent';

      } else {
        const margin = 40 * scale;
        const isSquare = width === height; // Use dimension directly

        // Adjust sizes for 1:1 ratio
        const portraitThumbSize = isSquare ? 110 : 150;
        const landscapeThumbSize = 100;
        const thumbSize = (isPortrait ? portraitThumbSize : landscapeThumbSize) * scale;

        const textOffset = 25 * scale;
        const coverImg = metadata.coverUrl ? images.get('cover') : null;
        const r = 12 * scale; // Radius

        if (isPortrait) {
          // --- PORTRAIT LAYOUT (9:16, 3:4, 1:1): Top Center, slightly down ---
          // For 1:1, position higher (1.5x margin) vs others (3x margin)
          const startY = margin * (isSquare ? 1.5 : 3);
          const centerX = width / 2;

          // 1. Draw Image (Centered)
          const imgX = centerX - (thumbSize / 2);
          const imgY = startY;

          ctx.save();
          // Rounded Clip
          ctx.beginPath();
          ctx.roundRect(imgX, imgY, thumbSize, thumbSize, r);
          ctx.clip();

          if (coverImg) {
            ctx.drawImage(coverImg, imgX, imgY, thumbSize, thumbSize);
          } else {
            ctx.fillStyle = '#27272a';
            ctx.fillRect(imgX, imgY, thumbSize, thumbSize);
          }
          ctx.restore();

          // Border
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(imgX, imgY, thumbSize, thumbSize, r);
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = 2 * scale;
          ctx.stroke();
          ctx.restore();

          // 2. Draw Text (Centered Below Image)
          ctx.textAlign = 'center';

          // Title
          ctx.textBaseline = 'top';
          const titleSize = (isSquare ? 26 : 36) * scale;
          ctx.font = `bold ${titleSize}px ${fontFamily}`;
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 4 * scale;
          ctx.shadowOffsetY = 1 * scale;
          const titleY = imgY + thumbSize + textOffset;
          ctx.fillText(metadata.title, centerX, titleY);

          // Artist
          const artistSize = (isSquare ? 18 : 24) * scale;
          ctx.font = `${artistSize}px ${fontFamily}`;
          ctx.fillStyle = '#d4d4d8';
          ctx.shadowBlur = 2 * scale;
          const artistY = titleY + (isSquare ? 30 : 40) * scale;
          ctx.fillText(metadata.artist, centerX, artistY);

          ctx.shadowColor = 'transparent';

        } else {
          // --- LANDSCAPE LAYOUT (16:9): Top Left ---
          const x = margin;
          const y = margin;

          ctx.save();
          // Rounded Clip
          ctx.beginPath();
          ctx.roundRect(x, y, thumbSize, thumbSize, r);
          ctx.clip();

          if (coverImg) {
            ctx.drawImage(coverImg, x, y, thumbSize, thumbSize);
          } else {
            ctx.fillStyle = '#27272a';
            ctx.fillRect(x, y, thumbSize, thumbSize);
          }
          ctx.restore();

          // Border
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, thumbSize, thumbSize, r);
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = 2 * scale;
          ctx.stroke();
          ctx.restore();

          // Text Info (Right of Cover)
          const textX = margin + thumbSize + textOffset;
          const textCenterY = margin + (thumbSize / 2);

          ctx.textAlign = 'left';

          // Title
          ctx.textBaseline = 'bottom';
          ctx.font = `bold ${32 * scale}px ${fontFamily}`;
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 4 * scale;
          ctx.shadowOffsetY = 1 * scale;
          ctx.fillText(metadata.title, textX, textCenterY - (4 * scale));

          // Artist
          ctx.textBaseline = 'top';
          ctx.font = `${20 * scale}px ${fontFamily}`;
          ctx.fillStyle = '#d4d4d8';
          ctx.shadowBlur = 2 * scale;
          ctx.fillText(metadata.artist, textX, textCenterY + (4 * scale));

          ctx.shadowColor = 'transparent';
        }
      }
    }
  };

  const handleExportVideo = async () => {
    if (!audioSrc || !audioRef.current || !canvasRef.current) return;

    // Confirm
    if (!window.confirm(`Start rendering ${aspectRatio} (${resolution}) video? This will play the song from start to finish. Please do not switch tabs.`)) return;

    setIsRendering(true);
    setRenderProgress(0);
    abortRenderRef.current = false;

    // Stop and Reset
    stopPlayback();

    // Capture current preset to use inside the loop (avoid closure staleness if any, though activePreset is const in this render)
    const currentPreset = preset;

    // 1. Preload Images & Videos & Audio
    const imageMap = new Map<string, HTMLImageElement>();
    const videoMap = new Map<string, HTMLVideoElement>();
    const audioMap = new Map<string, HTMLAudioElement>();
    const loadPromises: Promise<void>[] = [];

    // Helper Load Image
    const loadImg = (id: string, url: string) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          imageMap.set(id, img);
          resolve();
        };
        img.onerror = () => resolve(); // Ignore errors
        img.src = url;
      });
    };

    // Helper Load Video
    const loadVid = (id: string, url: string) => {
      return new Promise<void>((resolve) => {
        const vid = document.createElement('video');
        vid.crossOrigin = "anonymous";
        vid.muted = true;
        vid.playsInline = true;
        vid.onloadedmetadata = () => {
          videoMap.set(id, vid);
          resolve();
        };
        vid.onerror = () => resolve();
        vid.src = url;
      });
    };

    // Helper Load Audio
    const loadAudio = (id: string, url: string) => {
      return new Promise<void>((resolve) => {
        const aud = document.createElement('audio');
        aud.crossOrigin = "anonymous";
        aud.onloadedmetadata = () => {
          audioMap.set(id, aud);
          resolve();
        };
        aud.onerror = () => resolve();
        aud.src = url;
      });
    };

    visualSlides.forEach(s => {
      if (s.type === 'video') loadPromises.push(loadVid(s.id, s.url));
      else if (s.type === 'audio') loadPromises.push(loadAudio(s.id, s.url));
      else loadPromises.push(loadImg(s.id, s.url));
    });

    if (metadata.coverUrl) {
      if (metadata.backgroundType === 'video') loadPromises.push(loadVid('background', metadata.coverUrl));
      else loadPromises.push(loadImg('cover', metadata.coverUrl));
    }

    await Promise.all(loadPromises);

    if (abortRenderRef.current) {
      setIsRendering(false);
      return;
    }

    // 3. Setup Audio Mixing & Recording
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(30); // Video Stream (30 FPS)

    const audioEl = audioRef.current;
    let audioStream: MediaStream | null = null;

    // Get Main Audio Stream
    try {
      // @ts-ignore
      if (audioEl.captureStream) audioStream = audioEl.captureStream();
      // @ts-ignore
      else if (audioEl.mozCaptureStream) audioStream = audioEl.mozCaptureStream();
      else throw new Error("Audio capture not supported");
    } catch (e) {
      alert("Your browser does not support audio capture for recording.");
      setIsRendering(false);
      return;
    }

    // Audio Mixer (Web Audio API)
    // We mix the Song + Any Video Slide Audio into a single destination
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const mixerDest = audioContext.createMediaStreamDestination();

    // Connect Main Song
    if (audioStream && audioStream.getAudioTracks().length > 0) {
      const source = audioContext.createMediaStreamSource(audioStream);
      source.connect(mixerDest);
    }

    // Connect All Preloaded Videos
    // We connect them all; we'll control their audibility via their .muted / .volume property in the loop
    videoMap.forEach((vidElement) => {
      const source = audioContext.createMediaElementSource(vidElement);
      source.connect(mixerDest);
    });

    // Connect All Preloaded Audios
    audioMap.forEach((audElement) => {
      const source = audioContext.createMediaElementSource(audElement);
      source.connect(mixerDest);
    });

    // Add Mixed Audio Track to Recorder Stream
    if (mixerDest.stream.getAudioTracks().length > 0) {
      stream.addTrack(mixerDest.stream.getAudioTracks()[0]);
    } else if (audioStream) {
      // Fallback if mixer failed for some reason
      stream.addTrack(audioStream.getAudioTracks()[0]);
    }

    const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
    const bitrate = resolution === '1080p' ? 8000000 : 4000000;
    const mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });

    mediaRecorderRef.current = mediaRecorder;

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      // Only download if NOT aborted
      if (!abortRenderRef.current) {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${metadata.title || 'video'}_${aspectRatio.replace(':', '-')}_${resolution}.${mimeType === 'video/mp4' ? 'mp4' : 'webm'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        console.log("Render aborted");
      }

      // Cleanup
      audioContext.close();
      setIsRendering(false);
    };

    // 4. Start Loop
    mediaRecorder.start();
    audioEl.play();
    setIsPlaying(true); // Sync UI state

    const renderLoop = () => {
      if (audioEl.paused || audioEl.ended) {
        // If ended naturally
        if (audioEl.ended && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsPlaying(false);
        }
        return;
      }

      const t = audioEl.currentTime;

      // Sync Export Videos
      videoMap.forEach((v, id) => {
        if (id === 'background') {
          // Sync background (Modulo Loop for Deterministic Render)
          const vidDuration = v.duration || 1;
          const targetTime = t % vidDuration;

          if (Math.abs(v.currentTime - targetTime) > 0.3) v.currentTime = targetTime;
          if (v.paused) v.play().catch(() => { });
        } else {
          // Sync slide
          const s = visualSlides.find(sl => sl.id === id);
          if (s) {
            if (t >= s.startTime && t < s.endTime) {
              const rel = t - s.startTime;
              if (Math.abs(v.currentTime - rel) > 0.1) v.currentTime = rel;

              // Handle Audio Muting & Volume for Export
              // If slide is unmuted (isMuted === false), we unmute the video element so it feeds into the mixer
              const shouldMute = s.isMuted !== false;
              if (v.muted !== shouldMute) v.muted = shouldMute;

              const targetVol = s.volume !== undefined ? s.volume : 1;
              if (Math.abs(v.volume - targetVol) > 0.01) v.volume = targetVol;

              if (v.paused) v.play().catch(() => { });
            } else {
              if (!v.paused) v.pause();
              // Ensure muted when not active just in case
              if (!v.muted) v.muted = true;
            }
          }
        }
      });

      // Sync Export Audios
      audioMap.forEach((a, id) => {
        const s = visualSlides.find(sl => sl.id === id);
        if (s) {
          if (t >= s.startTime && t < s.endTime) {
            const rel = t - s.startTime;
            if (Math.abs(a.currentTime - rel) > 0.1) a.currentTime = rel;

            // Handle Audio Muting & Volume for Export
            const shouldMute = s.isMuted === true; // Default false (unmuted for audio usually?) - wait, logic was: default muted for video.
            // For audio files, default should be unmuted?
            // In handleFileUpload I set `isMuted: type === 'video'`. So for audio, isMuted is false.
            // So `s.isMuted === true` means user explicitly muted it (if I provide UI).
            // But wait, my previous logic in VisualEditor was: `isMuted: type === 'video'`.
            // So for audio, isMuted is false.
            if (a.muted !== shouldMute) a.muted = shouldMute;

            const targetVol = s.volume !== undefined ? s.volume : 1;
            if (Math.abs(a.volume - targetVol) > 0.01) a.volume = targetVol;

            if (a.paused) a.play().catch(() => { });
          } else {
            if (!a.paused) a.pause();
            if (!a.muted) a.muted = true;
          }
        }
      });

      if (ctx) {
        drawCanvasFrame(ctx, canvas.width, canvas.height, audioEl.currentTime, imageMap, videoMap, currentPreset);
      }

      if (mediaRecorder.state === 'recording') {
        requestAnimationFrame(renderLoop);
      }
    };

    renderLoop();
  };



  const handleAbortRender = useCallback(() => {
    abortRenderRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      setIsRendering(false);
    }
    stopPlayback();
  }, [stopPlayback]);

  // Scroll active lyric into view
  useEffect(() => {
    if (currentLyricIndex !== -1 && lyricsContainerRef.current) {
      // +1 to account for the top spacer div
      const activeEl = lyricsContainerRef.current.children[currentLyricIndex + 1] as HTMLElement;
      if (activeEl) {
        const isBigLayout = ['large', 'large_upper', 'big_center', 'metal', 'kids', 'sad', 'romantic', 'tech', 'gothic'].includes(preset);
        if (isBigLayout) {
          // Custom scrolling for large text presets to avoid bottom overlap
          const container = lyricsContainerRef.current;
          const containerRect = container.getBoundingClientRect();
          const elRect = activeEl.getBoundingClientRect();

          // Current relative position
          const relativeTop = elRect.top - containerRect.top;

          // Target position: Center - Bias (Shift UP)
          // Shifting UP means target top is smaller.
          const offsetBias = containerRect.height * 0.15; // 15% shift up
          const targetTop = (containerRect.height - elRect.height) / 2 - offsetBias;

          const scrollDelta = relativeTop - targetTop;

          container.scrollTo({
            top: container.scrollTop + scrollDelta,
            behavior: 'smooth'
          });
        } else {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [currentLyricIndex, preset]);

  const controlsTimeoutRef = useRef<number | null>(null);

  // ... (keep existing state)

  // Helper to reset idle timer
  const resetIdleTimer = useCallback(() => {
    setIsMouseIdle(false);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    // Auto-hide after 3s of inactivity
    const timeout = window.setTimeout(() => {
      // Only set idle if we aren't bypassing it
      // Note: We check the ref/state inside the timeout or rely on the component state updates
      // Since bypassAutoHide overrides the EFFECT of isMouseIdle in the render, we can just set isMouseIdle(true)
      setIsMouseIdle(true);
    }, 3000);

    controlsTimeoutRef.current = timeout;
  }, []);

  // Handle idle mouse to hide controls
  const handleMouseMove = () => {
    resetIdleTimer();
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the key shoud trigger UI wake-up
      const key = e.key.toLowerCase();
      const ignoredKeysForIdle = [' ', 'k', 's', 'l', 'f', 'h', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'meta', 'control', 'shift', 'alt', 'printscreen', 'fn'];

      if (!ignoredKeysForIdle.includes(key)) {
        resetIdleTimer();
      }

      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (isRendering) {
        if (key === 'escape') {
          handleAbortRender();
        }
        return; // Block other shortcuts during render
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 's':
          e.preventDefault();
          stopPlayback();
          break;
        case 'l':
          e.preventDefault();
          toggleLoop();
          break;
        case 'h':
          e.preventDefault();
          setBypassAutoHide(prev => !prev);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'i': // Toggle Info (Top)
          setShowInfo(prev => !prev);
          break;
        case 'p': // Toggle Player (Bottom)
          setShowPlayer(prev => !prev);
          break;
        case 't': // Toggle Timeline (Editor)
          setActiveTab(prev => prev === TabView.PLAYER ? TabView.EDITOR : TabView.PLAYER);
          break;
        case 'arrowleft':
          e.preventDefault();
          if (audioRef.current) {
            const newTime = Math.max(0, audioRef.current.currentTime - 5);
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
          }
          break;
        case 'arrowright':
          e.preventDefault();
          if (audioRef.current) {
            const newTime = Math.min(duration, audioRef.current.currentTime + 5);
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isLooping, activeTab, isRendering, resetIdleTimer, handleAbortRender]);

  // --- Render Helpers ---

  // Combine manual visibility with mouse idle state
  // BypassAutoHide overrides mouse idle.
  const isHeaderVisible = showInfo && (!isMouseIdle || bypassAutoHide) && !isRendering;
  const isFooterVisible = showPlayer && (!isMouseIdle || bypassAutoHide) && !isRendering;

  const backgroundStyle = activeSlide
    ? { backgroundImage: `url(${activeSlide.url})` }
    : metadata.coverUrl
      ? { backgroundImage: `url(${metadata.coverUrl})` }
      : undefined;

  // Video Sync Logic
  const activeVideoRef = useRef<HTMLVideoElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // 1. Active Slide Video
    if (activeSlide?.type === 'video' && activeVideoRef.current) {
      const vid = activeVideoRef.current;
      const relTime = currentTime - activeSlide.startTime;

      // Check if we need to sync timestamps (fix drift/seeks)
      // Threshold 0.1s: Tight enough for smooth scrubbing, loose enough for playback drift
      if (Math.abs(vid.currentTime - relTime) > 0.1) {
        vid.currentTime = relTime;
      }

      // Sync Muted State & Volume
      const shouldMute = activeSlide.isMuted !== false; // Default true (muted)
      if (vid.muted !== shouldMute) vid.muted = shouldMute;

      const targetVolume = activeSlide.volume !== undefined ? activeSlide.volume : 1;
      if (Math.abs(vid.volume - targetVolume) > 0.01) vid.volume = targetVolume;

      if (isPlaying && vid.paused) {
        vid.play().catch(() => { }); // catch interrupt errors
      } else if (!isPlaying && !vid.paused) {
        vid.pause();
      }
    }

    // 2. Background Video (Metadata)
    // Only play if no active slide covers it, OR if we want it to run behind.
    // Let's run it always but maybe pause if not visible?
    // For now, simple sync:
    if (metadata.backgroundType === 'video' && bgVideoRef.current) {
      const vid = bgVideoRef.current;

      // Sync with modulo for Looping
      const vidDuration = vid.duration || 1;
      const targetTime = currentTime % vidDuration;

      // Sync if drifted > 0.1s (Smoother scrubbing)
      if (Math.abs(vid.currentTime - targetTime) > 0.1) {
        vid.currentTime = targetTime;
      }

      if (isPlaying && vid.paused) {
        vid.play().catch(() => { });
      } else if (!isPlaying && !vid.paused) {
        vid.pause();
      }
    }


    // 3. Audio Slides Sync (Preview)
    // We iterate over ALL audio slides that SHOULD be playing (activeAudioSlides)
    // But since we render them below, we need refs. 
    // Actually, simpler: we can querySelector them or maintain a map of refs.
    // Given the dynamic nature, querySelector by ID might be easiest for this lightweight app.
    activeAudioSlides.forEach(s => {
      const aud = document.getElementById(`audio-preview-${s.id}`) as HTMLAudioElement;
      if (aud) {
        const relTime = currentTime - s.startTime;
        if (Math.abs(aud.currentTime - relTime) > 0.2) aud.currentTime = relTime;

        const shouldMute = s.isMuted === true;
        if (aud.muted !== shouldMute) aud.muted = shouldMute;

        const targetVol = s.volume !== undefined ? s.volume : 1;
        if (Math.abs(aud.volume - targetVol) > 0.01) aud.volume = targetVol;

        if (isPlaying && aud.paused) aud.play().catch(() => { });
        else if (!isPlaying && !aud.paused) aud.pause();
      }
    });

  }, [currentTime, isPlaying, activeSlide, metadata, activeAudioSlides]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
      className={`relative w-full h-screen bg-black overflow-hidden flex font-sans select-none ${isMouseIdle && !bypassAutoHide ? 'cursor-none' : ''}`}
    >
      <audio
        ref={audioRef}
        src={audioSrc || undefined}
        loop={isLooping}
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          if (!isLooping) setIsPlaying(false);
        }}
        crossOrigin="anonymous"
      />

      {/* Audio Preview Elements */}
      {activeAudioSlides.map(s => (
        <audio
          key={s.id}
          id={`audio-preview-${s.id}`}
          src={s.url}
          className="hidden"
          playsInline
        />
      ))}

      {/* Hidden Rendering Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="absolute top-0 left-0 hidden pointer-events-none opacity-0"
      />

      {/* --- Visual Layer --- */}
      <div className="absolute inset-0 bg-black overflow-hidden pointer-events-none">
        {/* 1. Base Background (Metadata) */}
        {metadata.coverUrl && (
          metadata.backgroundType === 'video' ? (
            <video
              ref={bgVideoRef}
              src={metadata.coverUrl}
              className="absolute inset-0 w-full h-full object-cover opacity-60"
              muted
              loop
              playsInline
            />
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out opacity-60"
              style={{ backgroundImage: `url(${metadata.coverUrl})` }}
            />
          )
        )}

        {/* Default Gradient if nothing */}
        {!metadata.coverUrl && !activeSlide && (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-black opacity-80"></div>
        )}

        {/* 2. Slide Overlay */}
        <div className={`absolute inset-0 transition-opacity duration-500 ${activeSlide ? 'opacity-100' : 'opacity-0'}`}>
          {activeSlide && (
            activeSlide.type === 'video' ? (
              <video
                key={activeSlide.id}
                ref={activeVideoRef}
                src={activeSlide.url}
                className="w-full h-full object-cover"
                muted={activeSlide.isMuted !== false}
                playsInline
              />
            ) : (
              <div
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${activeSlide.url})` }}
              />
            )
          )}
        </div>

        {/* Blur / Dim Overlay */}
        <div className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-all duration-700 ${activeSlide ? 'bg-black/10 backdrop-blur-none' : ''}`}></div>
      </div>

      {/* --- Main Content Area --- */}
      <div className="relative z-10 flex-1 flex flex-col transition-all duration-500">

        {/* Top Bar (Song Info) */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isHeaderVisible ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-6 flex justify-between items-start">
            <div className="flex gap-4">
              <div className="flex gap-4 items-center">
                <div className="relative group w-16 h-16 rounded-md overflow-hidden bg-zinc-800 shadow-lg border border-white/10 shrink-0">
                  {metadata.coverUrl ? (
                    metadata.backgroundType === 'video' ? (
                      <video src={metadata.coverUrl} className="w-full h-full object-cover" muted loop onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                    ) : (
                      <img src={metadata.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                      <Music size={24} />
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <Upload size={20} className="text-white" />
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={handleMetadataUpload} />
                  </label>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white drop-shadow-md line-clamp-1">{metadata.title}</h1>
                  <div className="flex items-center gap-2">
                    <p className="text-zinc-300 text-sm drop-shadow-md">{metadata.artist}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setBypassAutoHide(!bypassAutoHide)}
                className={`p-2 rounded-full transition-colors ${bypassAutoHide ? 'bg-purple-600/50 text-white' : 'bg-black/30 text-zinc-300 hover:bg-white/10'}`}
                title="Bypass Auto-hide (H)"
              >
                {bypassAutoHide ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
              <button
                onClick={() => setActiveTab(activeTab === TabView.PLAYER ? TabView.EDITOR : TabView.PLAYER)}
                className={`p-2 rounded-full transition-colors ${activeTab === TabView.EDITOR ? 'bg-purple-600 text-white' : 'bg-black/30 text-zinc-300 hover:bg-white/10'}`}
                title="Toggle Timeline (T)"
              >
                <Film size={20} />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-full bg-black/30 text-zinc-300 hover:bg-white/10 transition-colors"
                title="Fullscreen (F)"
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Center Stage: Lyrics */}
        <div className="flex-1 flex items-center justify-center overflow-hidden relative">
          {lyrics.length > 0 ? (
            <div
              ref={lyricsContainerRef}
              className={`w-full max-w-5xl max-h-full overflow-y-auto no-scrollbar px-6 text-center space-y-6 transition-all duration-500`}
              style={{
                maskImage: (isHeaderVisible || isFooterVisible)
                  ? 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)'
                  : 'none'
              }}
            >
              <div className="h-[50vh]"></div>
              {lyrics.map((line, idx) => {
                const isActive = idx === currentLyricIndex;
                const isEditor = activeTab === TabView.EDITOR;

                // Handle Big Text preset visibility (show only current, prev, and next)
                const isBigLayout = ['large', 'large_upper', 'big_center', 'metal', 'kids', 'sad', 'romantic', 'tech', 'gothic', 'testing', 'testing_up'].includes(preset);
                if (isBigLayout && Math.abs(idx - currentLyricIndex) > 1) {
                  return <p key={idx} className="hidden" />;
                }

                // Testing Preset: Hide previous lyrics explicitly (web view)
                if ((preset === 'testing' || preset === 'testing_up') && idx < currentLyricIndex) {
                  return <p key={idx} className="hidden" />;
                }

                // Slideshow / Just Video: Hide neighbours
                if ((preset === 'slideshow' || preset === 'just_video') && idx !== currentLyricIndex) {
                  return <p key={idx} className="hidden" />;
                }

                // --- Dynamic Styling based on Preset ---
                let activeClass = '';
                let inactiveClass = '';
                let containerClass = 'transition-all duration-500 cursor-pointer ';

                if (preset === 'large' || preset === 'large_upper') {
                  // Large: Left aligned, huge text, bold
                  const activeSize = isEditor ? 'text-4xl md:text-6xl' : 'text-5xl md:text-8xl';
                  const inactiveSize = isEditor ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl';
                  activeClass = `${activeSize} font-black text-white ${preset === 'large_upper' ? 'uppercase' : ''} tracking-tight text-left pl-4`;
                  inactiveClass = `${inactiveSize} text-zinc-600/40 hover:text-zinc-400 text-left pl-4`;
                } else if (preset === 'big_center') {
                  const activeSize = isEditor ? 'text-4xl md:text-6xl' : 'text-5xl md:text-8xl';
                  const inactiveSize = isEditor ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl';
                  activeClass = `${activeSize} font-black text-white uppercase tracking-tight text-center`;
                  inactiveClass = `${inactiveSize} text-zinc-600/40 hover:text-zinc-400 text-center`;
                } else if (preset === 'testing_up') {
                  const activeSize = isEditor ? 'text-4xl md:text-6xl' : 'text-5xl md:text-8xl';
                  const inactiveSize = isEditor ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl';
                  activeClass = `${activeSize} font-black text-white uppercase tracking-tight text-center`;
                  inactiveClass = `${inactiveSize} text-zinc-600/40 hover:text-zinc-400 text-center`;
                } else if (preset === 'testing') {
                  const activeSize = isEditor ? 'text-4xl md:text-6xl' : 'text-5xl md:text-8xl';
                  const inactiveSize = isEditor ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl';
                  activeClass = `${activeSize} font-black text-white tracking-tight text-center`;
                  inactiveClass = `${inactiveSize} text-zinc-600/40 hover:text-zinc-400 text-center`;
                } else if (preset === 'metal') {
                  const activeSize = isEditor ? 'text-4xl md:text-6xl' : 'text-5xl md:text-8xl';
                  const inactiveSize = isEditor ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl';
                  activeClass = `${activeSize} text-white uppercase tracking-wide text-center drop-shadow-[0_4px_6px_rgba(255,0,0,0.5)]`;
                  inactiveClass = `${inactiveSize} text-zinc-600/60 hover:text-zinc-400 text-center`;
                } else if (preset === 'kids') {
                  const activeSize = isEditor ? 'text-4xl md:text-6xl' : 'text-5xl md:text-8xl';
                  const inactiveSize = isEditor ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl';
                  activeClass = `${activeSize} text-white tracking-wide text-center drop-shadow-[3px_3px_0px_rgba(0,0,0,0.5)]`;
                  inactiveClass = `${inactiveSize} text-zinc-600/60 hover:text-zinc-400 text-center`;
                } else if (preset === 'sad') {
                  const activeSize = isEditor ? 'text-3xl md:text-5xl' : 'text-4xl md:text-6xl';
                  const inactiveSize = isEditor ? 'text-lg md:text-xl' : 'text-xl md:text-2xl';
                  activeClass = `${activeSize} text-zinc-200 tracking-wider text-center drop-shadow-md`;
                  inactiveClass = `${inactiveSize} text-zinc-600/60 hover:text-zinc-400 text-center`;
                } else if (preset === 'romantic') {
                  const activeSize = isEditor ? 'text-3xl md:text-5xl' : 'text-4xl md:text-6xl';
                  const inactiveSize = isEditor ? 'text-lg md:text-xl' : 'text-xl md:text-2xl';
                  activeClass = `${activeSize} text-pink-100 italic tracking-wide text-center drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]`;
                  inactiveClass = `${inactiveSize} text-zinc-600/60 hover:text-zinc-400 text-center italic`;
                } else if (preset === 'tech') {
                  const activeSize = isEditor ? 'text-3xl md:text-5xl' : 'text-4xl md:text-7xl';
                  const inactiveSize = isEditor ? 'text-lg md:text-xl' : 'text-xl md:text-2xl';
                  activeClass = `${activeSize} text-cyan-50 font-bold uppercase tracking-widest text-center drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]`;
                  inactiveClass = `${inactiveSize} text-cyan-900/40 hover:text-cyan-800 text-center uppercase`;
                } else if (preset === 'gothic') {
                  const activeSize = isEditor ? 'text-4xl md:text-6xl' : 'text-5xl md:text-8xl';
                  const inactiveSize = isEditor ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl';
                  activeClass = `${activeSize} text-zinc-300 tracking-normal text-center drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]`;
                  inactiveClass = `${inactiveSize} text-zinc-700/60 hover:text-zinc-500 text-center`;
                } else if (preset === 'monospace') {
                  const activeSize = isEditor ? 'text-2xl md:text-3xl' : 'text-3xl md:text-5xl';
                  const inactiveSize = isEditor ? 'text-lg md:text-xl' : 'text-xl md:text-2xl';
                  activeClass = `${activeSize} font-mono font-bold text-white scale-105 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`;
                  inactiveClass = `${inactiveSize} font-mono text-zinc-500/60 hover:text-zinc-300 drop-shadow-sm`;
                } else if (preset === 'classic') {
                  // Classic: Serif, Italic
                  const activeSize = isEditor ? 'text-2xl md:text-4xl' : 'text-3xl md:text-6xl';
                  const inactiveSize = isEditor ? 'text-lg md:text-xl' : 'text-xl md:text-2xl';
                  activeClass = `${activeSize} font-serif italic font-bold text-amber-100 drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]`;
                  inactiveClass = `${inactiveSize} font-serif text-zinc-500/60 hover:text-zinc-300 italic`;
                } else if (preset === 'slideshow' || preset === 'just_video') {
                  // Slideshow: Small, centered
                  const activeSize = isEditor ? 'text-lg md:text-xl' : 'text-xl md:text-2xl';
                  activeClass = `${activeSize} text-white tracking-wide text-center`;
                  inactiveClass = 'hidden';
                } else {
                  // Default
                  const activeSize = isEditor ? 'text-2xl md:text-3xl' : 'text-3xl md:text-5xl';
                  const inactiveSize = isEditor ? 'text-lg md:text-xl' : 'text-xl md:text-2xl';
                  activeClass = `${activeSize} font-bold text-white scale-105 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`;
                  inactiveClass = `${inactiveSize} text-zinc-500/60 hover:text-zinc-300 drop-shadow-sm`;
                }

                return (
                  <p
                    key={idx}
                    className={`${containerClass} ${isActive ? activeClass : inactiveClass}`}
                    style={{
                      fontFamily: customFontName ? `"${customFontName}", sans-serif` :
                        preset === 'metal' ? '"Metal Mania", cursive'
                          : preset === 'kids' ? '"Fredoka One", cursive'
                            : preset === 'sad' ? '"Shadows Into Light", cursive'
                              : preset === 'romantic' ? '"Dancing Script", cursive'
                                : preset === 'tech' ? '"Orbitron", sans-serif'
                                  : preset === 'gothic' ? '"UnifrakturMaguntia", cursive'
                                    : undefined
                    }}
                    onClick={() => {
                      if (audioRef.current && !isRendering) {
                        audioRef.current.currentTime = line.time;
                        setCurrentTime(line.time);
                      }
                    }}
                  >
                    {line.text}
                  </p>
                );
              })}
              <div className="h-[50vh]"></div>
            </div>
          ) : (
            <div className="text-center text-zinc-400/50 select-none pointer-events-none">
              {!activeSlide && (
                <div className="flex flex-col items-center gap-4 animate-pulse">
                  <Music size={64} className="opacity-20" />
                  <p>Load audio & lyrics to start</p>
                  <p className="text-xs opacity-50">Shortcuts: Space (Play), S (Stop), L (Loop), H (Hold UI)</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Controls (Player) */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isFooterVisible ? 'max-h-60 opacity-100 translate-y-0' : 'max-h-0 opacity-0 translate-y-4'}`}>
          <div className="bg-gradient-to-t from-black/60 via-black/30 to-transparent p-6 pb-8">
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Progress Bar */}
              <div className="flex items-center gap-3 group">
                <span className="text-xs text-zinc-400 font-mono w-10 text-right">{formatTime(currentTime)}</span>
                <div className="flex-1 h-1 bg-zinc-700/50 rounded-full relative cursor-pointer group-hover:h-2 transition-all">
                  <div
                    className="absolute top-0 left-0 h-full bg-purple-500 rounded-full"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  ></div>
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    disabled={isRendering}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
                  />
                </div>
                <span className="text-xs text-zinc-400 font-mono w-10">{formatTime(duration)}</span>
              </div>

              {/* Main Buttons */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                <div className="flex gap-2">
                  <label className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer transition-colors" title="Load Audio">
                    <Music size={18} />
                    <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} disabled={isRendering} />
                  </label>
                  <div className="flex items-center gap-1">
                    <label className={`p-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors ${lyrics.length > 0 ? 'text-purple-400' : 'text-zinc-400 hover:text-white'}`} title="Load Lyrics (.lrc, .srt)">
                      <FileText size={18} />
                      <input type="file" accept=".lrc,.srt" className="hidden" onChange={handleLyricsUpload} disabled={isRendering} />
                    </label>
                    {lyrics.length > 0 && (
                      <button
                        onClick={() => setLyrics([])}
                        className="p-1 rounded-full text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                        title="Clear Lyrics"
                        disabled={isRendering}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <label className={`p-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors ${customFontName ? 'text-purple-400' : 'text-zinc-400 hover:text-white'}`} title={customFontName ? `Custom Font: ${customFontName}` : "Load Custom Font (.ttf, .otf, .woff)"}>
                      <Type size={18} />
                      <input type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={handleFontUpload} disabled={isRendering} />
                    </label>
                    {customFontName && (
                      <button
                        onClick={() => setCustomFontName(null)}
                        className="p-1 rounded-full text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                        title="Reset Default Font"
                        disabled={isRendering}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Volume Control (Moved here) */}
                  <div className="flex items-center gap-2 ml-2 bg-zinc-800/50 rounded-lg px-2 py-1">
                    <button onClick={() => setIsMuted(!isMuted)} className="text-zinc-400 hover:text-white">
                      {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <div className="w-16 h-1 bg-zinc-700 rounded-full relative overflow-hidden group">
                      <div
                        className="absolute top-0 left-0 h-full bg-zinc-300 group-hover:bg-purple-400 transition-colors"
                        style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                      ></div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <button
                    className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                    onClick={stopPlayback}
                    title="Stop (S)"
                    disabled={isRendering}
                  >
                    <Square size={20} fill="currentColor" />
                  </button>
                  <button className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50" disabled={isRendering} onClick={() => audioRef.current && (audioRef.current.currentTime -= 5)}>
                    <SkipBack size={24} />
                  </button>
                  <button
                    onClick={togglePlay}
                    disabled={isRendering}
                    className="w-14 h-14 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                  </button>
                  <button className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50" disabled={isRendering} onClick={() => audioRef.current && (audioRef.current.currentTime += 5)}>
                    <SkipForward size={24} />
                  </button>
                  <button
                    className={`transition-colors disabled:opacity-50 ${isLooping ? 'text-green-400 hover:text-green-300' : 'text-zinc-400 hover:text-white'}`}
                    onClick={toggleLoop}
                    title="Loop (L)"
                    disabled={isRendering}
                  >
                    <Repeat size={20} />
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full justify-end group">
                  {/* Preset Dropdown */}
                  <div className="relative group mr-2">
                    <select
                      value={preset}
                      onChange={(e) => setPreset(e.target.value as any)}
                      className="appearance-none bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded px-2 pr-6 w-20 h-6 focus:outline-none focus:border-purple-500 cursor-pointer"
                      disabled={isRendering}
                    >
                      <option value="default">Default</option>
                      <option value="large">Big Text</option>
                      <option value="large_upper">Big Text (UP)</option>
                      <option value="big_center">Big Center</option>
                      <option value="metal">Metal</option>
                      <option value="kids">Kids</option>
                      <option value="sad">Sad</option>
                      <option value="romantic">Romantic</option>
                      <option value="tech">Tech</option>
                      <option value="gothic">Gothic</option>
                      <option value="classic">Classic Serif</option>
                      <option value="monospace">Monospace</option>
                      <option value="testing_up">Testing (UP)</option>
                      <option value="testing">Testing</option>
                      <option value="slideshow">Slideshow</option>
                      <option value="just_video">Just Video</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-zinc-500">
                      <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                  </div>

                  {/* Resolution Toggle */}
                  <button
                    onClick={() => setResolution(prev => prev === '1080p' ? '720p' : '1080p')}
                    className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded px-1 h-6 transition-colors disabled:opacity-30"
                    title="Toggle Resolution (720p / 1080p)"
                    disabled={isRendering}
                  >
                    {resolution}
                  </button>
                  {/* Aspect Ratio Toggle */}
                  <button
                    onClick={() => setAspectRatio(prev => {
                      if (prev === '16:9') return '9:16';
                      if (prev === '9:16') return '3:4';
                      if (prev === '3:4') return '1:1';
                      return '16:9';
                    })}
                    className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded px-1 h-6 transition-colors disabled:opacity-30"
                    title="Toggle Aspect Ratio (16:9 / 9:16 / 3:4 / 1:1)"
                    disabled={isRendering}
                  >
                    {aspectRatio}
                  </button>
                  {/* Export Button */}
                  <button
                    onClick={handleExportVideo}
                    disabled={isRendering || !audioSrc}
                    className="text-zinc-400 hover:text-purple-400 transition-colors disabled:opacity-30 mr-2"
                    title="Export as Video"
                  >
                    <Video size={20} />
                  </button>

                  {/* Volume Control Removed from here */}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* --- Bottom Timeline Editor --- */}
        {activeTab === TabView.EDITOR && (
          <div className="animate-slide-up border-t border-white/10 z-30 shrink-0 w-full max-w-[100vw] overflow-hidden">
            <VisualEditor
              slides={visualSlides}
              setSlides={setVisualSlides}
              currentTime={currentTime}
              duration={duration || 60}
              lyrics={lyrics}
              onSeek={(time) => {
                if (audioRef.current && !isRendering) {
                  audioRef.current.currentTime = time;
                  setCurrentTime(time);
                }
              }}
            />
          </div>
        )}

      </div>



      {/* Rendering Overlay */}
      {
        isRendering && (
          <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="animate-bounce">
              <Video size={48} className="text-purple-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">Rendering Video ({aspectRatio} {resolution})</h2>
            <p className="text-zinc-400 max-w-md">The song is playing to capture the video. Please do not close the tab or switch windows.</p>

            <div className="w-full max-w-md h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-300 ease-linear"
                style={{ width: `${renderProgress}%` }}
              ></div>
            </div>
            <p className="text-sm font-mono text-zinc-500">{Math.round(renderProgress)}%</p>

            <button
              onClick={handleAbortRender}
              className="mt-4 px-6 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 rounded-full transition-colors flex items-center gap-2 border border-red-500/50"
            >
              <Square size={16} fill="currentColor" />
              Abort Rendering
            </button>
          </div>
        )
      }

    </div >
  );
}

export default App;