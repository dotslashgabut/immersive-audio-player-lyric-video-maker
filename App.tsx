import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Maximize, Minimize, Upload, Music, FileText, Settings, ImageIcon,
  Repeat, Repeat1, Square, Eye, EyeOff, Video, Download, Film, Type, X, ListMusic, Rewind, FastForward,
  ChevronUp, ChevronDown
} from './components/Icons';
import { AudioMetadata, LyricLine, TabView, VisualSlide, VideoPreset, PlaylistItem, RenderConfig } from './types';
import { formatTime, parseLRC, parseSRT } from './utils/parsers';
import VisualEditor from './components/VisualEditor';
import PlaylistEditor from './components/PlaylistEditor';
import RenderSettings from './components/RenderSettings';
import { drawCanvasFrame } from './utils/canvasRenderer';
import { loadGoogleFonts } from './utils/fonts';
// @ts-ignore
import fixWebmDuration from 'fix-webm-duration';

function App() {
  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const abortRenderRef = useRef(false);
  const exportVideoRef = useRef<() => void>(() => { });

  // Load fonts
  useEffect(() => {
    loadGoogleFonts();
  }, []);

  // State: Media & Data
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<AudioMetadata>({
    title: 'No Audio Loaded',
    artist: 'Select a file',
    coverUrl: null,
  });
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [visualSlides, setVisualSlides] = useState<VisualSlide[]>([]);
  const [lyricOffset, setLyricOffset] = useState(0);

  // State: Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // State: UI
  const [activeTab, setActiveTab] = useState<TabView>(TabView.PLAYER);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMouseIdle, setIsMouseIdle] = useState(false);
  const [bypassAutoHide, setBypassAutoHide] = useState(false);
  const [isBgVideoReady, setIsBgVideoReady] = useState(false);


  // State: Video Export
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '3:4' | '1:1' | '1:2' | '2:1' | '2:3' | '3:2'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [preset, setPreset] = useState<VideoPreset>('default');
  const [customFontName, setCustomFontName] = useState<string | null>(null);
  // const [fontSizeScale, setFontSizeScale] = useState(1); // Migrated to renderConfig
  const [renderCodec, setRenderCodec] = useState<string>('auto');
  const [renderFps, setRenderFps] = useState<number>(30);
  const [renderQuality, setRenderQuality] = useState<'low' | 'med' | 'high'>('med');
  const [isBlurEnabled, setIsBlurEnabled] = useState(false);
  const [showRenderSettings, setShowRenderSettings] = useState(false);
  const [renderConfig, setRenderConfig] = useState<RenderConfig>({
    backgroundSource: 'timeline',
    backgroundColor: '#581c87',
    backgroundGradient: 'linear-gradient(to bottom right, #312e81, #581c87, #000000)',
    renderMode: 'current',
    textAlign: 'center',
    contentPosition: 'center',
    fontFamily: 'sans-serif',
    fontSizeScale: 1.0,
    fontColor: '#ffffff',
    textEffect: 'shadow',
    textAnimation: 'none',
    transitionEffect: 'fade',
    lyricDisplayMode: 'all',
    fontWeight: 'bold',
    fontStyle: 'normal',
    textDecoration: 'none',
    showTitle: true,
    showArtist: true,
    showCover: true,
    showIntro: true,
    showLyrics: true,
    infoPosition: 'top-left',
    infoStyle: 'classic',
    infoMarginScale: 1.0,
  });

  const supportedCodecs = useMemo(() => {
    const candidates = [
      { label: 'VP9 (WebM)', value: 'video/webm; codecs=vp9,opus' },
      { label: 'H.264 (MP4)', value: 'video/mp4; codecs="avc1.4D401E, mp4a.40.2"' },
      { label: 'AV1 (MP4)', value: 'video/mp4; codecs="av01.0.05M.08"' },
      { label: 'AV1 (WebM)', value: 'video/webm; codecs=av1' },
      { label: 'H.264 High (MP4)', value: 'video/mp4; codecs="avc1.64001E, mp4a.40.2"' },
    ];
    return candidates.filter(c => MediaRecorder.isTypeSupported(c.value));
  }, []);

  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaylistMode, setIsPlaylistMode] = useState(false);

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
      case '1:2':
        return is1080p ? { w: 1080, h: 2160 } : { w: 720, h: 1440 };
      case '2:1':
        return is1080p ? { w: 2160, h: 1080 } : { w: 1440, h: 720 };
      case '2:3':
        return is1080p ? { w: 1080, h: 1620 } : { w: 720, h: 1080 };
      case '3:2':
        return is1080p ? { w: 1620, h: 1080 } : { w: 1080, h: 720 };
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

  // Adjusted lyrics based on offset
  const adjustedLyrics = useMemo(() => {
    if (lyricOffset === 0) return lyrics;
    return lyrics.map(l => ({
      ...l,
      time: l.time + lyricOffset,
      endTime: l.endTime !== undefined ? l.endTime + lyricOffset : undefined
    }));
  }, [lyrics, lyricOffset]);

  const currentLyricIndex = adjustedLyrics.findIndex((line, index) => {
    if (line.endTime !== undefined) {
      return currentTime >= line.time && currentTime < line.endTime;
    }
    const nextLine = adjustedLyrics[index + 1];
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
      setLyricOffset(0);
      setIsPlaying(false);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.load();
      }
    }
    // Allow re-upload
    e.target.value = '';
  };

  const handleMetadataUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      // Reset video ready state when changing background
      if (isVideo) setIsBgVideoReady(false);
      setMetadata(prev => ({ ...prev, coverUrl: url, backgroundType: isVideo ? 'video' : 'image' }));
    }
    // Allow re-upload
    e.target.value = '';
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
    // Allow re-upload
    e.target.value = '';
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
    // Allow re-upload
    e.target.value = '';
  };

  const playTrack = useCallback(async (index: number) => {
    if (index < 0 || index >= playlist.length) return;
    const track = playlist[index];

    // Load Audio
    const url = URL.createObjectURL(track.audioFile);
    setAudioSrc(url);

    // Metadata - use cover art from track if available
    setMetadata({
      title: track.metadata.title,
      artist: track.metadata.artist,
      coverUrl: track.metadata.coverUrl || null,
      backgroundType: 'image'
    });

    // Reset Lyrics
    setLyrics([]);

    // Load Lyrics
    if (track.parsedLyrics && track.parsedLyrics.length > 0) {
      setLyrics(track.parsedLyrics);
    } else if (track.lyricFile) {
      try {
        const text = await track.lyricFile.text();
        const ext = track.lyricFile.name.split('.').pop()?.toLowerCase();
        if (ext === 'lrc') setLyrics(parseLRC(text));
        else if (ext === 'srt') setLyrics(parseSRT(text));
      } catch (e) {
        console.error("Failed to load lyrics", e);
      }
    }

    setLyricOffset(0);
    setCurrentTrackIndex(index);
    // Auto-play after state update
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log("Autoplay failed", e));
        setIsPlaying(true);
      }
    }, 100);
  }, [playlist]);

  const playNextSong = useCallback(() => {
    if (playlist.length === 0) return;
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    playTrack(nextIndex);
  }, [playlist, currentTrackIndex, playTrack]);

  const playPreviousSong = useCallback(() => {
    if (playlist.length === 0) return;
    const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    playTrack(prevIndex);
  }, [playlist, currentTrackIndex, playTrack]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // If no audio source is loaded but we have a playlist, start the first track
        if (!audioSrc && playlist.length > 0) {
          playTrack(0);
        } else {
          audioRef.current.play().catch(console.error);
          setIsPlaying(true);
        }
      }
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

  const toggleRepeat = () => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
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

  const handleExportVideo = async () => {
    if (!audioSrc || !audioRef.current || !canvasRef.current) return;

    // Confirm
    if (!window.confirm(`Start rendering ${aspectRatio} (${resolution}) video? This will play the song from start to finish. Please do not switch tabs.`)) return;

    setShowRenderSettings(false);

    setIsRendering(true);
    setRenderProgress(0);
    abortRenderRef.current = false;

    // Stop and Reset
    stopPlayback();
    setRepeatMode('off');

    // Stop auto-hide immediately and bypass it during render
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setIsMouseIdle(false);
    setBypassAutoHide(true);

    // Pause background video in web view to prevent interference with render
    if (bgVideoRef.current) {
      bgVideoRef.current.pause();
    }

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
        vid.preload = "auto";

        let resolved = false;
        const safeResolve = () => {
          if (!resolved) {
            resolved = true;
            videoMap.set(id, vid);
            resolve();
          }
        };

        vid.oncanplay = () => {
          if (!resolved) {
            vid.currentTime = 0.001; // Force seek to ensure frame decode
          }
        };

        vid.onseeked = () => {
          safeResolve();
        };

        vid.onerror = () => {
          console.warn("Failed to load video:", url);
          safeResolve();
        };

        // Fallback timeout
        setTimeout(() => safeResolve(), 5000);

        vid.src = url;
        vid.load();
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
    const stream = canvas.captureStream(renderFps); // Video Stream (Dynamic FPS)

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
    // Pure audio - no filters or processing
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const mixerDest = audioContext.createMediaStreamDestination();

    // Connect Main Song directly to mixer (and NOT to destination)
    if (audioStream && audioStream.getAudioTracks().length > 0) {
      const source = audioContext.createMediaStreamSource(audioStream);
      source.connect(mixerDest);
    }

    // Connect All Preloaded Videos directly to mixer
    // We disconnect them from speakers by not calling .connect(audioContext.destination)
    videoMap.forEach((vidElement) => {
      // Ensure the element itself is muted in DOM so it doesn't play to speakers directly
      // (We already set muted=true on creation, but double check)
      vidElement.muted = true;

      const source = audioContext.createMediaElementSource(vidElement);
      source.connect(mixerDest);
    });

    // Connect All Preloaded Audios directly to mixer
    audioMap.forEach((audElement) => {
      // Ensure element DOM mute
      audElement.muted = true;

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

    // Attempt to use selected or VP9 first
    const getPreferredMimeType = () => {
      if (renderCodec !== 'auto' && MediaRecorder.isTypeSupported(renderCodec)) {
        return renderCodec;
      }
      const types = [
        'video/webm; codecs=vp9,opus',               // VP9 + Opus (Best WebM Support)
        'video/webm; codecs=vp9',                     // VP9 (Fallback)
        'video/webm; codecs=av1',                     // AV1 (WebM) - High Efficiency
        'video/mp4; codecs="av01.0.05M.08"',          // AV1 (MP4)
        'video/mp4; codecs="avc1.4D401E, mp4a.40.2"', // H.264 Main
        'video/mp4; codecs="avc1.64001E, mp4a.40.2"', // H.264 High
        'video/mp4; codecs="avc1.42E01E, mp4a.40.2"', // H.264 Baseline
        'video/mp4',                                  // Generic MP4
        'video/webm',                                 // Generic WebM
      ];
      for (const t of types) {
        if (MediaRecorder.isTypeSupported(t)) return t;
      }
      return 'video/webm';
    };

    const mimeType = getPreferredMimeType();

    // Calculated Bitrate based on Resolution, FPS, and Quality
    // Base: 720p 30fps Med = 4Mbps, 1080p 30fps Med = 8Mbps
    // Scale for FPS (60fps uses 1.5x) and Quality (Low 0.5x, High 2x)
    const baseBitrate = resolution === '1080p' ? 8000000 : 4000000;
    const fpsMultiplier = renderFps > 30 ? 1.5 : 1.0;
    const qualityMultiplier = renderQuality === 'high' ? 2.0 : renderQuality === 'low' ? 0.5 : 1.0;
    const bitrate = baseBitrate * fpsMultiplier * qualityMultiplier;

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

        const downloadBlob = (blobToDownload: Blob) => {
          const url = URL.createObjectURL(blobToDownload);
          const a = document.createElement('a');
          a.href = url;
          // Clean filename
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          a.download = `${metadata.title || 'video'}_${aspectRatio.replace(':', '-')}_${resolution}.${ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        };

        if (mimeType.includes('webm')) {
          const durationMs = (audioRef.current?.duration || 0) * 1000;
          fixWebmDuration(blob, durationMs, (fixedBlob: Blob) => {
            downloadBlob(fixedBlob);
          });
        } else {
          downloadBlob(blob);
        }
      } else {
        console.log("Render aborted");
      }

      // Cleanup
      audioContext.close();
      setIsRendering(false);
    };

    // 4. Start Sequence
    // Strategy: Start Recorder -> Wait 100ms (Record Silence) -> Start Audio
    // This ensures no cut at start and no audio glitch as the recorder is stable before signal hits.

    // Resume Audio Context
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    // Warm up Canvas
    if (ctx && audioEl) {
      drawCanvasFrame(
        ctx,
        canvas.width,
        canvas.height,
        0,
        adjustedLyrics,
        metadata,
        visualSlides,
        imageMap,
        videoMap,
        currentPreset,
        customFontName,
        renderConfig.fontSizeScale,
        isBlurEnabled,
        renderConfig
      );
    }

    // Throttle render loop based on selected FPS
    let lastRenderTime = 0;
    const renderInterval = 1000 / renderFps;

    const renderLoop = (now: number) => {
      // Check for End
      if (audioEl.ended) {
        // Add 100ms tail buffer to ensure we catch the very end (reduced from 500ms for precise duration)
        if (mediaRecorder.state === 'recording') {
          setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
              setIsPlaying(false);
            }
          }, 100);
        }
        return; // Stop the loop logic immediately though
      }

      if (audioEl.paused && audioEl.currentTime > 0 && !audioEl.ended) {
        // Paused but not ended? (User paused or lag). Just return, loop keeps running.
        // If aborted, abort handler deals with it.
      }

      // Continue loop first to maintain stable timing
      if (mediaRecorder.state === 'recording') {
        requestAnimationFrame(renderLoop);
      }

      // Throttle actual rendering
      const elapsed = now - lastRenderTime;
      if (elapsed < renderInterval) {
        return;
      }
      lastRenderTime = now - (elapsed % renderInterval);

      const t = audioEl.currentTime;

      // Sync Export Videos - Use larger tolerance to prevent audio glitches
      videoMap.forEach((v, id) => {
        if (id === 'background') {
          // Sync background (Looping)
          const vidDuration = v.duration || 1;
          let targetTime = t % vidDuration;

          // Handle loop wrap-around logic
          // If the difference is large (e.g. video is near end, target is near start), just let it play or seek if needed.
          // We use a simple drift check. If drift > 1s, we snap.
          // Special case: if we just wrapped around (targetTime is small, v.currentTime is large), we force seek to start.

          let drift = Math.abs(v.currentTime - targetTime);

          // Handle wrap-around drift calculation (e.g. current=59s, target=1s, duration=60s -> drift is 2s, not 58s)
          // Actually, simplest is: if targetTime < v.currentTime significanty (meaning new loop started), we seek.

          if (targetTime < v.currentTime && (v.currentTime - targetTime) > vidDuration / 2) {
            // We wrapped around in target, but video is still near end. Seek to start.
            v.currentTime = targetTime;
          } else if (drift > 1.0) {
            // Normal drift correction
            v.currentTime = targetTime;
          }

          if (v.paused) v.play().catch(() => { });
        } else {
          // Sync slide
          const s = visualSlides.find(sl => sl.id === id);
          if (s) {
            if (t >= s.startTime && t < s.endTime) {
              const rel = t - s.startTime;

              // Only seek if severely out of sync (>0.5s) to prevent audio glitches
              if (Math.abs(v.currentTime - rel) > 0.5) v.currentTime = rel;

              // Handle Audio Muting & Volume for Export
              const shouldMute = s.isMuted !== false;
              if (v.muted !== shouldMute) v.muted = shouldMute;

              const targetVol = s.volume !== undefined ? s.volume : 1;
              if (Math.abs(v.volume - targetVol) > 0.01) v.volume = targetVol;

              if (v.paused) v.play().catch(() => { });
            } else {
              if (!v.paused) v.pause();
              if (!v.muted) v.muted = true;
            }
          }
        }
      });

      // Sync Export Audios - Use larger tolerance to prevent glitches
      audioMap.forEach((a, id) => {
        const s = visualSlides.find(sl => sl.id === id);
        if (s) {
          if (t >= s.startTime && t < s.endTime) {
            const rel = t - s.startTime;
            // Only seek if severely out of sync (>0.5s) to prevent audio buffer glitches
            if (Math.abs(a.currentTime - rel) > 0.5) a.currentTime = rel;

            // Handle Audio Muting & Volume for Export
            const shouldMute = s.isMuted === true;
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
        drawCanvasFrame(
          ctx,
          canvas.width,
          canvas.height,
          audioEl.currentTime,
          adjustedLyrics,
          metadata,
          visualSlides,
          imageMap,
          videoMap,
          currentPreset,
          customFontName,
          renderConfig.fontSizeScale,
          isBlurEnabled,
          renderConfig
        );
      }
    };

    // Start Recording -> Wait -> Start Audio to ensure no frame drop at start
    const startRender = async () => {
      if (abortRenderRef.current) return;

      // Start Recorder first
      mediaRecorder.start();

      // IMPORTANT: Wait 50ms to let Recorder initialize and capture first 1-2 frames of silence/black
      // This prevents the "cut off start" issue where audio starts before recorder writes the first frame.
      await new Promise(r => setTimeout(r, 50));

      if (abortRenderRef.current) {
        mediaRecorder.stop();
        return;
      }

      setIsPlaying(true);
      requestAnimationFrame(renderLoop);

      // Start audio
      const startPromise = audioEl.play();
      if (startPromise !== undefined) {
        startPromise.catch(error => {
          console.error("Playback failed start:", error);
          setIsRendering(false);
          mediaRecorder.stop();
        });
      }
    };

    startRender();
  };

  // Keep export function ref up to date for shortcuts
  useEffect(() => {
    exportVideoRef.current = handleExportVideo;
  });



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
  const scrollToActiveLyric = useCallback(() => {
    if (currentLyricIndex !== -1 && lyricsContainerRef.current) {
      // Use data attribute to find the active lyric element
      const activeEl = lyricsContainerRef.current.querySelector('[data-lyric-active="true"]') as HTMLElement;
      if (activeEl) {
        const container = lyricsContainerRef.current;

        // Skip if element is hidden
        if (activeEl.offsetHeight === 0) return;

        // Use offsetTop (layout position) instead of getBoundingClientRect (visual position)
        // This avoids issues with CSS transforms like scale-105
        const elOffsetTop = activeEl.offsetTop;
        const elHeight = activeEl.offsetHeight;
        const containerHeight = container.clientHeight;

        // Target: Position based on contentPosition preference
        let positionRatio = 0.5; // Center default
        if (renderConfig.contentPosition === 'top') positionRatio = 0.25;
        if (renderConfig.contentPosition === 'bottom') positionRatio = 0.75;

        const targetScrollTop = elOffsetTop - (containerHeight * positionRatio) + (elHeight / 2);

        container.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
      }
    }
  }, [currentLyricIndex, preset, renderConfig.contentPosition]);

  // Trigger scroll on lyric change
  useEffect(() => {
    scrollToActiveLyric();
  }, [scrollToActiveLyric]);

  // Re-scroll after visibility changes (wait for CSS transition to complete)
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToActiveLyric();
    }, 550); // Wait for 500ms CSS transition + buffer
    return () => clearTimeout(timer);
  }, [isMouseIdle, bypassAutoHide, showInfo, showPlayer, activeTab, isPlaylistMode, scrollToActiveLyric]);

  const controlsTimeoutRef = useRef<number | null>(null);

  // ... (keep existing state)

  // Helper to reset idle timer
  // Helper to reset idle timer
  const resetIdleTimer = useCallback(() => {
    setIsMouseIdle(false);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    // Auto-hide after 3s of inactivity (only if not rendering)
    if (!isRendering) {
      const timeout = window.setTimeout(() => {
        // Only set idle if we aren't bypassing it
        // Note: We check the ref/state inside the timeout or rely on the component state updates
        // Since bypassAutoHide overrides the EFFECT of isMouseIdle in the render, we can just set isMouseIdle(true)
        setIsMouseIdle(true);
      }, 3000);

      controlsTimeoutRef.current = timeout;
    }
  }, [isRendering]);

  // Handle idle mouse to hide controls
  const handleMouseMove = () => {
    resetIdleTimer();
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the key shoud trigger UI wake-up
      const key = e.key.toLowerCase();
      const ignoredKeysForIdle = [' ', 'k', 's', 't', 'l', 'r', 'f', 'h', 'm', 'j', 'd', 'e', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'meta', 'control', 'shift', 'alt', 'printscreen', 'fn', '+', '-', '='];

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
        case 'n':
          e.preventDefault();
          playNextSong();
          break;
        case 'b':
          e.preventDefault();
          playPreviousSong();
          break;
        case 'r': // Loop (Repeat)
          e.preventDefault();
          toggleRepeat();
          break;
        case 'l': // List (Playlist)
          e.preventDefault();
          const newMode = !isPlaylistMode;
          setIsPlaylistMode(newMode);
          if (newMode) setActiveTab(TabView.PLAYER);
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
        case 'd': // Toggle Render Settings
          e.preventDefault();
          setShowRenderSettings(prev => !prev);
          break;
        case 't': // Toggle Timeline (Editor)
          if (isPlaylistMode) {
            setIsPlaylistMode(false);
            setActiveTab(TabView.EDITOR);
          } else {
            setActiveTab(prev => prev === TabView.PLAYER ? TabView.EDITOR : TabView.PLAYER);
          }
          break;
        case 'm': // Mute
          e.preventDefault();
          setIsMuted(prev => !prev);
          break;
        case 'j': // Cycle Preset
          e.preventDefault();
          const presets: VideoPreset[] = [
            'default', 'large', 'classic', 'large_upper', 'monospace',
            'big_center', 'metal', 'kids', 'sad', 'romantic', 'tech',
            'gothic', 'testing', 'testing_up', 'slideshow', 'just_video', 'subtitle', 'none'
          ];
          setPreset(prev => {
            const idx = presets.indexOf(prev);
            const nextIdx = (idx + 1) % presets.length;
            return presets[nextIdx];
          });
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
        case 'arrowup':
          e.preventDefault();
          if (lyricsContainerRef.current) {
            lyricsContainerRef.current.scrollBy({ top: -100, behavior: 'smooth' });
          }
          break;
        case 'arrowdown':
          e.preventDefault();
          if (lyricsContainerRef.current) {
            lyricsContainerRef.current.scrollBy({ top: 100, behavior: 'smooth' });
          }
          break;
        case '+':
        case '=': // For keyboards where + is Shift+=
          e.preventDefault();
          setRenderConfig(prev => ({ ...prev, fontSizeScale: Math.min(prev.fontSizeScale + 0.1, 3.0) })); // Max 300%
          break;
        case '-':
          e.preventDefault();
          setRenderConfig(prev => ({ ...prev, fontSizeScale: Math.max(prev.fontSizeScale - 0.1, 0.1) })); // Min 10%
          break;
        case 'e':
          if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
            e.preventDefault();
            exportVideoRef.current();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, repeatMode, activeTab, isRendering, resetIdleTimer, handleAbortRender, isPlaylistMode, playNextSong, playPreviousSong]);

  // Smooth Playback Animation Loop (Throttled to ~30fps)
  useEffect(() => {
    let animationFrameId: number;
    let lastFrameTime = 0;
    const fpsInterval = 1000 / 30;

    const animate = (now: number) => {
      if (audioRef.current && !audioRef.current.paused && isPlaying) {
        animationFrameId = requestAnimationFrame(animate);

        const elapsed = now - lastFrameTime;

        if (elapsed > fpsInterval) {
          lastFrameTime = now - (elapsed % fpsInterval);
          setCurrentTime(audioRef.current.currentTime);
        }
      }
    };

    if (isPlaying && !isRendering) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, isRendering]);

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

      if (isRendering) {
        if (!vid.paused) vid.pause();
      } else {
        const relTime = currentTime - activeSlide.startTime;

        // Check if we need to sync timestamps (fix drift/seeks)
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
    }

    // 2. Background Video (Metadata)
    // Only play if no active slide covers it, OR if we want it to run behind.
    // Let's run it always but maybe pause if not visible?
    // For now, simple sync:
    if (metadata.backgroundType === 'video' && bgVideoRef.current) {
      const vid = bgVideoRef.current;

      if (isRendering) {
        if (!vid.paused) vid.pause();
      } else {
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
        loop={repeatMode === 'one'}
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          if (isRendering) return;
          if (repeatMode === 'one') {
            // Native loop handles it, but safety fallback
          } else {
            // Off or All
            if (isPlaylistMode && playlist.length > 0) {
              if (repeatMode === 'all') {
                playNextSong();
              } else {
                // Off: Stop if last song
                if (currentTrackIndex < playlist.length - 1) {
                  playNextSong();
                } else {
                  setIsPlaying(false);
                }
              }
            } else {
              // Normal Mode (Single)
              if (repeatMode === 'all') {
                // Loop for continuity if user selected 'All'
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play();
                }
              } else {
                setIsPlaying(false);
              }
            }
          }
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
        {/* 1. Base Background */}
        {renderConfig.backgroundSource === 'color' && (
          <div className="absolute inset-0" style={{ backgroundColor: renderConfig.backgroundColor }} />
        )}
        {renderConfig.backgroundSource === 'gradient' && (
          <div className="absolute inset-0" style={{ background: renderConfig.backgroundGradient }} />
        )}
        {renderConfig.backgroundSource === 'smart-gradient' && (
          <div className="absolute inset-0"
            style={{
              background: (() => {
                const hex = renderConfig.backgroundColor || '#312e81';
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                const color = `${r},${g},${b}`;
                const darker = `${Math.floor(r * 0.6)},${Math.floor(g * 0.6)},${Math.floor(b * 0.6)}`;
                return `linear-gradient(to bottom right, rgb(${color}), rgb(${darker}) 50%, #000000)`;
              })()
            }}
          />
        )}
        {(renderConfig.backgroundSource === 'timeline' || renderConfig.backgroundSource === 'custom') && metadata.coverUrl && (
          metadata.backgroundType === 'video' ? (
            <video
              ref={bgVideoRef}
              src={metadata.coverUrl}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isBgVideoReady ? 'opacity-60' : 'opacity-0'}`}
              muted
              loop={!isRendering}
              playsInline
              preload="auto"
              onLoadedData={() => setIsBgVideoReady(true)}
            />
          ) : (
            <div
              className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out ${renderConfig.backgroundSource === 'custom' || !activeSlide ? 'opacity-60' : 'opacity-0'}`}
              style={{ backgroundImage: `url(${metadata.coverUrl})` }}
            />
          )
        )}

        {/* Solid Color / Gradient / Smart Gradient Background */}
        {renderConfig.backgroundSource === 'color' && (
          <div className="absolute inset-0 transition-all duration-500" style={{ backgroundColor: renderConfig.backgroundColor }}></div>
        )}
        {renderConfig.backgroundSource === 'gradient' && (
          <div className="absolute inset-0 transition-all duration-500" style={{ background: renderConfig.backgroundGradient }}></div>
        )}
        {renderConfig.backgroundSource === 'smart-gradient' && (
          <div className="absolute inset-0 transition-all duration-500"
            style={{
              background: (() => {
                const hex = renderConfig.backgroundColor || '#312e81';
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                const color = `${r},${g},${b}`;
                // Darker: 60%
                const darker = `${Math.floor(r * 0.6)},${Math.floor(g * 0.6)},${Math.floor(b * 0.6)}`;
                return `linear-gradient(to bottom right, rgb(${color}), rgb(${darker}) 50%, #000000)`;
              })()
            }}
          ></div>
        )}

        {/* Default Gradient if nothing */}
        {!metadata.coverUrl && !activeSlide && (renderConfig.backgroundSource === 'timeline' || renderConfig.backgroundSource === 'custom') && (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-black opacity-80"></div>
        )}

        {/* 2. Slide Overlay */}
        <div className={`absolute inset-0 transition-opacity duration-500 ${activeSlide && renderConfig.backgroundSource === 'timeline' ? 'opacity-100' : 'opacity-0'}`}>
          {activeSlide && renderConfig.backgroundSource === 'timeline' && (
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
        {/* Blur / Dim Overlay */}
        <div className={`absolute inset-0 bg-black/30 transition-all duration-700 ${isBlurEnabled ? 'backdrop-blur-md bg-black/40' : 'backdrop-blur-none'}`}></div>
      </div>

      {/* --- Main Content Area --- */}
      <div className="relative z-10 flex-1 flex flex-col transition-all duration-500">

        {/* Top Bar (Song Info) */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isHeaderVisible ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-6 flex justify-between items-start">
            <div className="flex gap-4">
              <div className="flex gap-4 items-center">
                <div className={`relative group w-16 h-16 rounded-md overflow-hidden bg-zinc-800 shadow-lg border border-white/10 shrink-0 transition-opacity duration-300 ${!renderConfig.showCover ? 'opacity-0 scale-75 pointer-events-none w-0 h-0 -ml-4' : 'opacity-100 scale-100'}`}>
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
                  <h1 className={`text-xl font-bold text-white drop-shadow-md line-clamp-1 transition-opacity duration-300 ${!renderConfig.showTitle ? 'opacity-0' : 'opacity-100'}`}>{metadata.title}</h1>
                  <div className={`flex items-center gap-2 transition-opacity duration-300 ${!renderConfig.showArtist ? 'opacity-0' : 'opacity-100'}`}>
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
                onClick={() => {
                  const newMode = !isPlaylistMode;
                  setIsPlaylistMode(newMode);
                  if (newMode) setActiveTab(TabView.PLAYER);
                }}
                className={`p-2 rounded-full transition-colors ${isPlaylistMode ? 'bg-orange-600 text-white' : 'bg-black/30 text-zinc-300 hover:bg-white/10'}`}
                title="Toggle Playlist (L)"
              >
                <ListMusic size={20} />
              </button>
              <button
                onClick={() => {
                  if (isPlaylistMode) setIsPlaylistMode(false);
                  setActiveTab(activeTab === TabView.PLAYER ? TabView.EDITOR : TabView.PLAYER);
                }}
                className={`p-2 rounded-full transition-colors ${activeTab === TabView.EDITOR && !isPlaylistMode ? 'bg-purple-600 text-white' : 'bg-black/30 text-zinc-300 hover:bg-white/10'}`}
                title="Toggle Timeline (T)"
              >
                <Film size={20} />
              </button>
              <button
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setShowRenderSettings(!showRenderSettings);
                }}
                className={`p-2 rounded-full transition-colors ${showRenderSettings ? 'bg-purple-600 text-white' : 'bg-black/30 text-zinc-300 hover:bg-white/10'}`}
                title="Render Settings"
              >
                <Settings size={20} />
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
        <div className={`flex-1 flex justify-center overflow-hidden relative ${renderConfig.contentPosition === 'top' ? 'items-start pt-[10vh]' : renderConfig.contentPosition === 'bottom' ? 'items-end pb-[10vh]' : 'items-center'}`}>
          {lyrics.length > 0 ? (
            <div
              ref={lyricsContainerRef}
              className={`w-full max-w-5xl max-h-full overflow-y-auto no-scrollbar px-6 space-y-6 transition-all duration-500 lyrics-root ${renderConfig.textAlign === 'left' ? 'text-left' : renderConfig.textAlign === 'right' ? 'text-right' : 'text-center'
                } ${!renderConfig.showLyrics ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              style={{
                maskImage: (isHeaderVisible || isFooterVisible)
                  ? 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)'
                  : 'none'
              }}
            >
              <style>{`
                .lyrics-root .text-lg { font-size: calc(1.125rem * ${renderConfig.fontSizeScale}); line-height: calc(1.75rem * ${renderConfig.fontSizeScale}); }
                .lyrics-root .text-xl { font-size: calc(1.25rem * ${renderConfig.fontSizeScale}); line-height: calc(1.75rem * ${renderConfig.fontSizeScale}); }
                .lyrics-root .text-2xl { font-size: calc(1.5rem * ${renderConfig.fontSizeScale}); line-height: calc(2rem * ${renderConfig.fontSizeScale}); }
                .lyrics-root .text-3xl { font-size: calc(1.875rem * ${renderConfig.fontSizeScale}); line-height: calc(2.25rem * ${renderConfig.fontSizeScale}); }
                .lyrics-root .text-4xl { font-size: calc(2.25rem * ${renderConfig.fontSizeScale}); line-height: calc(2.5rem * ${renderConfig.fontSizeScale}); }
                .lyrics-root .text-5xl { font-size: calc(3rem * ${renderConfig.fontSizeScale}); }
                .lyrics-root .text-6xl { font-size: calc(3.75rem * ${renderConfig.fontSizeScale}); }
                .lyrics-root .text-7xl { font-size: calc(4.5rem * ${renderConfig.fontSizeScale}); }
                .lyrics-root .text-8xl { font-size: calc(6rem * ${renderConfig.fontSizeScale}); }
              `}</style>
              <div className={`transition-all duration-500 ${renderConfig.contentPosition === 'center' ? ((activeTab === TabView.EDITOR || isPlaylistMode) ? 'h-[25vh]' : (!isHeaderVisible && !isFooterVisible) ? 'h-[50vh]' : 'h-[40vh]') : 'h-0'}`}></div>
              {adjustedLyrics.map((line, idx) => {
                const isActive = idx === currentLyricIndex;
                const isEditor = activeTab === TabView.EDITOR || isPlaylistMode;
                const isPortraitPreview = ['9:16', '3:4', '1:1', '1:2', '2:3'].includes(aspectRatio);

                const isBigLayout = ['large', 'large_upper', 'big_center', 'metal', 'kids', 'sad', 'romantic', 'tech', 'gothic', 'testing', 'testing_up', 'one_line', 'one_line_up', 'custom'].includes(preset);

                // --- Render Config Display Mode Filter ---
                if (renderConfig.lyricDisplayMode !== 'all') {
                  if (renderConfig.lyricDisplayMode === 'active-only' && idx !== currentLyricIndex) return <p key={idx} className="hidden" />;
                  if (renderConfig.lyricDisplayMode === 'next-only' && (idx < currentLyricIndex || idx > currentLyricIndex + 1)) return <p key={idx} className="hidden" />;
                  if (renderConfig.lyricDisplayMode === 'previous-next' && Math.abs(idx - currentLyricIndex) > 1) return <p key={idx} className="hidden" />;
                } else {
                  // Fallback to Preset Defaults
                  // If mode is 'all', we generally want to show everything.
                  // BUT we still respect 'none' or 'just_video' as "no lyric" presets generally, 
                  // though showLyrics toggle handles visibility. 
                  if (preset === 'none' || preset === 'just_video') return <p key={idx} className="hidden" />;

                  // Previously we restricted isBigLayout to +/- 1 line. 
                  // User requested "Show All" to actually show all lines.
                  // So we removed the lines that returned 'hidden' for isBigLayout, one_line, etc.
                }

                // --- Dynamic Styling based on Preset ---
                let activeClass = '';
                let inactiveClass = '';
                // [FIX] Use specific transitions instead of transition-all to prevent font-size/height animation
                // animating dimensions causes layout shifts during scroll calculation, leading to "jumps".
                const transEffect = renderConfig.transitionEffect;
                let containerClass = 'transition-all duration-500 cursor-pointer whitespace-pre-wrap ';

                // Handle Transitions
                if (isActive) {
                  // Active State
                  if (transEffect === 'slide') containerClass += 'translate-y-0 opacity-100 ';
                  else if (transEffect === 'zoom') containerClass += 'scale-100 opacity-100 ';
                  else if (transEffect === 'float') containerClass += 'translate-y-0 opacity-100 ';
                  else if (transEffect === 'blur') containerClass += 'blur-0 opacity-100 ';
                  else if (transEffect === 'fade') containerClass += 'opacity-100 ';
                  else if (transEffect === 'drop') containerClass += 'trans-drop-enter opacity-100 ';
                  else if (transEffect === 'lightspeed') containerClass += 'trans-lightspeed-enter opacity-100 ';
                  else if (transEffect === 'roll') containerClass += 'trans-roll-enter opacity-100 ';
                  else if (transEffect === 'elastic') containerClass += 'trans-elastic-enter opacity-100 ';
                  else if (transEffect === 'flip') containerClass += 'trans-flip-enter opacity-100 ';
                  else if (transEffect === 'rotate-in') containerClass += 'trans-rotate-in-enter opacity-100 ';
                  else if (transEffect === 'spiral') containerClass += 'trans-spiral-enter opacity-100 ';
                  else if (transEffect === 'shatter') containerClass += 'trans-shatter-enter opacity-100 ';
                  else containerClass += 'opacity-100 ';
                } else {
                  // Inactive State
                  if (transEffect === 'slide') containerClass += 'translate-y-4 opacity-0 ';
                  else if (transEffect === 'zoom') containerClass += 'scale-75 opacity-0 ';
                  else if (transEffect === 'float') containerClass += 'translate-y-8 opacity-0 ';
                  else if (transEffect === 'blur') containerClass += 'blur-md opacity-0 ';
                  else if (transEffect === 'fade') containerClass += 'opacity-50 ';
                  else if (transEffect === 'drop') containerClass += 'trans-drop-exit opacity-0 ';
                  else if (transEffect === 'roll') containerClass += 'trans-roll-exit opacity-0 ';
                  else containerClass += 'opacity-0 '; // Default hide for other effects when not active

                  if (transEffect === 'none') containerClass = containerClass.replace('opacity-0', 'opacity-50');
                }

                if (preset === 'large' || preset === 'large_upper') {
                  // Large: Left aligned, huge text, bold
                  // Render Logic Equiv: Portrait=90, Landscape=120. (Approx 25% diff)

                  // Let's us 6xl(3.75) vs 8xl(6)
                  const portraitActive = isEditor ? 'text-4xl' : 'text-6xl';
                  const landscapeActive = isEditor ? 'text-6xl' : 'text-8xl';
                  const activeSize = isPortraitPreview ? portraitActive : landscapeActive;

                  const inactiveSize = isPortraitPreview
                    ? (isEditor ? 'text-xl' : 'text-2xl')
                    : (isEditor ? 'text-2xl' : 'text-3xl');
                  activeClass = `${activeSize} font-black text-white ${preset === 'large_upper' ? 'uppercase' : ''} tracking-tight text-left pl-4`;
                  inactiveClass = `${inactiveSize} text-zinc-600/40 hover:text-zinc-400 text-left pl-4`;
                } else if (preset === 'big_center') {
                  const activeSize = isPortraitPreview
                    ? (isEditor ? 'text-4xl' : 'text-5xl')
                    : (isEditor ? 'text-6xl' : 'text-8xl');
                  const inactiveSize = isPortraitPreview
                    ? (isEditor ? 'text-xl' : 'text-2xl')
                    : (isEditor ? 'text-2xl' : 'text-3xl');
                  activeClass = `${activeSize} font-black text-white uppercase tracking-tight text-center`;
                  inactiveClass = `${inactiveSize} text-zinc-600/40 hover:text-zinc-400 text-center`;
                } else if (preset === 'testing_up') {
                  const activeSize = isPortraitPreview
                    ? (isEditor ? 'text-4xl' : 'text-5xl')
                    : (isEditor ? 'text-6xl' : 'text-8xl');
                  const inactiveSize = isPortraitPreview
                    ? (isEditor ? 'text-xl' : 'text-2xl')
                    : (isEditor ? 'text-2xl' : 'text-3xl');
                  activeClass = `${activeSize} text-white uppercase tracking-tight text-center`;
                  inactiveClass = `${inactiveSize} text-zinc-600/40 hover:text-zinc-400 text-center`;
                } else if (preset === 'testing') {
                  const activeSize = isPortraitPreview
                    ? (isEditor ? 'text-4xl' : 'text-5xl')
                    : (isEditor ? 'text-6xl' : 'text-8xl');
                  const inactiveSize = isPortraitPreview
                    ? (isEditor ? 'text-xl' : 'text-2xl')
                    : (isEditor ? 'text-2xl' : 'text-3xl');
                  activeClass = `${activeSize} text-white tracking-tight text-center`;
                  inactiveClass = `${inactiveSize} text-zinc-600/40 hover:text-zinc-400 text-center`;
                } else if (preset === 'one_line_up') {
                  const activeSize = isPortraitPreview
                    ? (isEditor ? 'text-4xl' : 'text-5xl')
                    : (isEditor ? 'text-6xl' : 'text-8xl');
                  const inactiveSize = isPortraitPreview
                    ? (isEditor ? 'text-xl' : 'text-2xl')
                    : (isEditor ? 'text-2xl' : 'text-3xl');
                  activeClass = `${activeSize} text-white uppercase tracking-tight text-center`;
                  inactiveClass = `${inactiveSize} text-zinc-600/40 hover:text-zinc-400 text-center`;
                } else if (preset === 'one_line') {
                  const activeSize = isPortraitPreview
                    ? (isEditor ? 'text-4xl' : 'text-5xl')
                    : (isEditor ? 'text-6xl' : 'text-8xl');
                  const inactiveSize = isPortraitPreview
                    ? (isEditor ? 'text-xl' : 'text-2xl')
                    : (isEditor ? 'text-2xl' : 'text-3xl');
                  activeClass = `${activeSize} text-white tracking-tight text-center`;
                  inactiveClass = `${inactiveSize} text-zinc-600/40 hover:text-zinc-400 text-center`;
                } else if (preset === 'metal') {
                  const activeSize = isPortraitPreview
                    ? (isEditor ? 'text-4xl' : 'text-5xl')
                    : (isEditor ? 'text-6xl' : 'text-8xl');
                  const inactiveSize = isPortraitPreview
                    ? (isEditor ? 'text-xl' : 'text-2xl')
                    : (isEditor ? 'text-2xl' : 'text-3xl');
                  activeClass = `${activeSize} text-white uppercase tracking-wide text-center drop-shadow-[0_4px_6px_rgba(255,0,0,0.5)]`;
                  inactiveClass = `${inactiveSize} text-zinc-600/60 hover:text-zinc-400 text-center`;
                } else if (preset === 'kids') {
                  const activeSize = isPortraitPreview
                    ? (isEditor ? 'text-4xl' : 'text-5xl')
                    : (isEditor ? 'text-6xl' : 'text-8xl');
                  const inactiveSize = isPortraitPreview
                    ? (isEditor ? 'text-xl' : 'text-2xl')
                    : (isEditor ? 'text-2xl' : 'text-3xl');
                  activeClass = `${activeSize} text-white tracking-wide text-center drop-shadow-[3px_3px_0px_rgba(0,0,0,0.5)]`;
                  inactiveClass = `${inactiveSize} text-zinc-600/60 hover:text-zinc-400 text-center`;
                } else if (preset === 'sad') {
                  const activeSize = isPortraitPreview
                    ? (isEditor ? 'text-4xl' : 'text-5xl') // 48px / 60px
                    : (isEditor ? 'text-6xl' : 'text-7xl'); // 60px / 72px (Render 75px)
                  const inactiveSize = isPortraitPreview
                    ? (isEditor ? 'text-lg' : 'text-xl')
                    : (isEditor ? 'text-xl' : 'text-2xl');
                  activeClass = `${activeSize} text-zinc-200 tracking-wider text-center drop-shadow-md`;
                  inactiveClass = `${inactiveSize} text-zinc-600/60 hover:text-zinc-400 text-center`;
                } else if (preset === 'romantic') {
                  const activeSize = isPortraitPreview
                    ? (isEditor ? 'text-4xl' : 'text-5xl')
                    : (isEditor ? 'text-6xl' : 'text-7xl');
                  const inactiveSize = isPortraitPreview
                    ? (isEditor ? 'text-lg' : 'text-xl')
                    : (isEditor ? 'text-xl' : 'text-2xl');
                  activeClass = `${activeSize} text-pink-100 italic tracking-wide text-center drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]`;
                  inactiveClass = `${inactiveSize} text-zinc-600/60 hover:text-zinc-400 text-center italic`;
                } else if (preset === 'tech') {
                  const activeSize = isPortraitPreview
                    ? (isEditor ? 'text-4xl' : 'text-5xl')
                    : (isEditor ? 'text-6xl' : 'text-8xl');
                  const inactiveSize = isPortraitPreview
                    ? (isEditor ? 'text-xl' : 'text-2xl')
                    : (isEditor ? 'text-2xl' : 'text-3xl');
                  activeClass = `${activeSize} text-cyan-50 font-bold uppercase tracking-widest text-center drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]`;
                  inactiveClass = `${inactiveSize} text-cyan-900/40 hover:text-cyan-800 text-center uppercase`;
                } else if (preset === 'gothic') {
                  const activeSize = isPortraitPreview
                    ? (isEditor ? 'text-4xl' : 'text-5xl')
                    : (isEditor ? 'text-6xl' : 'text-7xl');
                  const inactiveSize = isPortraitPreview
                    ? (isEditor ? 'text-xl' : 'text-2xl')
                    : (isEditor ? 'text-2xl' : 'text-3xl');
                  activeClass = `${activeSize} text-zinc-300 tracking-normal text-center drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]`;
                  inactiveClass = `${inactiveSize} text-zinc-700/60 hover:text-zinc-500 text-center`;
                } else if (preset === 'monospace') {
                  const activeSize = isPortraitPreview
                    ? (isEditor ? 'text-2xl' : 'text-3xl')
                    : (isEditor ? 'text-3xl' : 'text-5xl');
                  const inactiveSize = isPortraitPreview
                    ? (isEditor ? 'text-lg' : 'text-xl')
                    : (isEditor ? 'text-xl' : 'text-2xl');
                  activeClass = `${activeSize} font-mono font-bold text-white scale-105 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`;
                  inactiveClass = `${inactiveSize} font-mono text-zinc-500/60 hover:text-zinc-300 drop-shadow-sm`;
                } else if (preset === 'classic') {
                  // Classic: Serif, Italic
                  // Render: Portrait=55, Landscape=65
                  const activeSize = isPortraitPreview
                    ? (isEditor ? 'text-2xl' : 'text-3xl') // 30 / 36
                    : (isEditor ? 'text-3xl' : 'text-6xl'); // 36 / 60
                  const inactiveSize = isPortraitPreview
                    ? (isEditor ? 'text-lg' : 'text-xl')
                    : (isEditor ? 'text-xl' : 'text-2xl');
                  activeClass = `${activeSize} font-serif italic font-bold text-amber-100 drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]`;
                  inactiveClass = `${inactiveSize} font-serif text-zinc-500/60 hover:text-zinc-300 italic`;
                } else if (preset === 'slideshow' || preset === 'just_video') {
                  // Slideshow: Small, centered
                  const activeSize = isPortraitPreview
                    ? (isEditor ? 'text-2xl' : 'text-3xl')
                    : (isEditor ? 'text-3xl' : 'text-4xl');
                  activeClass = `${activeSize} text-white tracking-wide text-center`;
                  inactiveClass = 'hidden';
                } else if (preset === 'subtitle') {
                  // Subtitle: Small, bottom-center (adjusts based on footer visibility and editor/playlist)
                  const activeSize = isPortraitPreview
                    ? (isEditor ? 'text-2xl' : 'text-3xl')
                    : (isEditor ? 'text-3xl' : 'text-4xl');
                  activeClass = `${activeSize} text-white tracking-wide text-center`;
                  inactiveClass = 'hidden';
                  // Position based on visible panels:
                  // - Editor/Playlist panel: ~280px
                  // - Footer (audio controls): ~160px (bottom-40)
                  // - Minimal (nothing visible): ~64px (bottom-16)
                  let bottomClass = 'bottom-16';
                  if (isEditor && isFooterVisible) {
                    // Both editor/playlist AND footer visible
                    bottomClass = 'bottom-[480px]';
                  } else if (isEditor) {
                    // Only editor/playlist visible
                    bottomClass = 'bottom-[320px]';
                  } else if (isFooterVisible) {
                    // Only footer visible
                    bottomClass = 'bottom-40';
                  }
                  containerClass += `fixed ${bottomClass} left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 `;
                } else if (preset === 'custom') {
                  const activeSize = isPortraitPreview
                    ? (isEditor ? 'text-4xl' : 'text-5xl')
                    : (isEditor ? 'text-6xl' : 'text-8xl');
                  const inactiveSize = isPortraitPreview
                    ? (isEditor ? 'text-xl' : 'text-2xl')
                    : (isEditor ? 'text-2xl' : 'text-3xl');

                  const alignClass = renderConfig.textAlign === 'center' ? 'text-center' : renderConfig.textAlign === 'right' ? 'text-right' : 'text-left';

                  activeClass = `${activeSize} tracking-tight ${alignClass}`;
                  inactiveClass = `${inactiveSize} opacity-40 hover:opacity-100 ${alignClass}`;

                  // We'll apply color and effects via inline style for 'custom'
                } else {
                  // Default
                  const activeSize = isPortraitPreview
                    ? (isEditor ? 'text-2xl' : 'text-3xl') //
                    : (isEditor ? 'text-3xl' : 'text-5xl');
                  const inactiveSize = isPortraitPreview
                    ? (isEditor ? 'text-lg' : 'text-xl')
                    : (isEditor ? 'text-xl' : 'text-2xl');
                  activeClass = `${activeSize} font-bold text-white scale-105 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`;
                  inactiveClass = `${inactiveSize} text-zinc-500/60 hover:text-zinc-300 drop-shadow-sm`;
                }

                // Dynamic Styles for Custom Preset options
                let textEffectStyles: React.CSSProperties = {
                  color: (preset === 'custom') ? renderConfig.fontColor : undefined,
                  fontWeight: (preset === 'custom') ? renderConfig.fontWeight : undefined,
                  fontStyle: (preset === 'custom') ? renderConfig.fontStyle : undefined,
                  textDecoration: (preset === 'custom') ? renderConfig.textDecoration : undefined,
                  fontFamily: customFontName ? `"${customFontName}", sans-serif` :
                    (preset === 'custom' && renderConfig.fontFamily !== 'sans-serif') ? renderConfig.fontFamily :
                      preset === 'metal' ? '"Metal Mania", cursive'
                        : preset === 'kids' ? '"Fredoka One", cursive'
                          : preset === 'sad' ? '"Shadows Into Light", cursive'
                            : preset === 'romantic' ? '"Dancing Script", cursive'
                              : preset === 'tech' ? '"Orbitron", sans-serif'
                                : preset === 'gothic' ? '"UnifrakturMaguntia", cursive'
                                  : undefined,
                };

                // Advanced Text Effects
                if (preset === 'custom' && isActive && renderConfig.textEffect !== 'none') {
                  const textEf = renderConfig.textEffect;

                  if (textEf === 'glow') textEffectStyles.textShadow = `0 0 10px ${renderConfig.fontColor}, 0 0 20px ${renderConfig.fontColor}`;
                  else if (textEf === 'neon') textEffectStyles.textShadow = `0 0 5px #fff, 0 0 10px #fff, 0 0 20px ${renderConfig.fontColor}, 0 0 40px ${renderConfig.fontColor}, 0 0 80px ${renderConfig.fontColor}`;
                  else if (textEf === 'neon-multi') textEffectStyles.textShadow = `0 0 5px #fff, 0 0 10px #fff, 0 0 20px #ff00de, 0 0 35px #00ffff, 0 0 40px #ff00de, 0 0 50px #00ffff`;
                  else if (textEf === 'shadow') textEffectStyles.textShadow = '3px 3px 6px rgba(0,0,0,0.7)';
                  else if (textEf === 'outline') textEffectStyles.textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';
                  else if (textEf === '3d') textEffectStyles.textShadow = '1px 1px 0px #ccc, 2px 2px 0px #bbb, 3px 3px 0px #aaa, 4px 4px 0px rgba(0,0,0,0.5)';
                  else if (textEf === 'emboss') { textEffectStyles.color = '#ebebeb'; textEffectStyles.textShadow = '1px 2px 3px rgba(255,255,255,0.8), -1px -2px 3px rgba(0,0,0,0.8)'; }
                  else if (textEf === 'gold') {
                    textEffectStyles.background = 'linear-gradient(to bottom, #d4af37, #C5A028)';
                    (textEffectStyles as any).WebkitBackgroundClip = 'text';
                    textEffectStyles.color = 'transparent';
                  }
                  else if (textEf === 'chrome') {
                    textEffectStyles.background = 'linear-gradient(to bottom, #ebebeb 50%, #616161 50%, #ebebeb)';
                    (textEffectStyles as any).WebkitBackgroundClip = 'text';
                    textEffectStyles.color = 'transparent';
                  }
                  else if (textEf === 'fire') {
                    textEffectStyles.color = '#fff';
                    textEffectStyles.textShadow = '0 -5px 4px #FFC107, 2px -10px 6px #FF9800, -2px -15px 11px #FF5722, 2px -25px 18px #795548';
                  }
                  else if (textEf === 'frozen') {
                    textEffectStyles.color = '#fff';
                    textEffectStyles.textShadow = '0 0 5px rgba(255,255,255,0.8), 0 0 10px rgba(255,255,255,0.5), 0 0 20px #03A9F4, 0 0 30px #03A9F4, 0 0 40px #03A9F4';
                  }
                  else if (textEf === 'vhs') {
                    textEffectStyles.textShadow = '2px 0 0 rgba(255,0,0,0.7), -2px 0 0 rgba(0,0,255,0.7)';
                  }
                  else if (textEf === 'gradient') {
                    textEffectStyles.background = `linear-gradient(to right, ${renderConfig.fontColor}, #ffffff)`;
                    (textEffectStyles as any).WebkitBackgroundClip = 'text';
                    textEffectStyles.color = 'transparent';
                  }
                  else if (textEf === 'rainbow') {
                    textEffectStyles.background = 'linear-gradient(to left, violet, indigo, blue, green, yellow, orange, red)';
                    (textEffectStyles as any).WebkitBackgroundClip = 'text';
                    textEffectStyles.color = 'transparent';
                  }
                  else if (textEf === 'glass') {
                    textEffectStyles.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    textEffectStyles.backdropFilter = 'blur(8px)';
                    textEffectStyles.padding = '0.5rem 1rem';
                    textEffectStyles.borderRadius = '0.75rem';
                    textEffectStyles.border = '1px solid rgba(255, 255, 255, 0.2)';
                    textEffectStyles.display = 'inline-block';
                  }
                  else if (textEf === 'mirror') {
                    textEffectStyles.transform = 'scaleY(1.3) perspective(500px) rotateX(-10deg)';
                    textEffectStyles.textShadow = '0 15px 5px rgba(0,0,0,0.1), 0 -1px 3px rgba(0,0,0,0.3)';
                  }
                  else if (textEf === 'retro') {
                    textEffectStyles.fontFamily = "'Press Start 2P', cursive";
                    textEffectStyles.color = '#ff00ff';
                    textEffectStyles.textShadow = '4px 4px 0px #00ffff';
                  }
                  else if (textEf === 'hologram') {
                    textEffectStyles.color = 'rgba(0, 255, 255, 0.7)';
                    textEffectStyles.textShadow = '0 0 5px rgba(0,255,255,0.5), 0 0 10px rgba(0,255,255,0.5)';
                    textEffectStyles.backgroundImage = 'repeating-linear-gradient(0deg, transparent, transparent 2px, #00ffff 3px)';
                    (textEffectStyles as any).WebkitBackgroundClip = 'text';
                  }
                  else if (textEf === 'comic') {
                    textEffectStyles.fontFamily = "'Bangers', cursive";
                    textEffectStyles.color = '#ffcc00';
                    textEffectStyles.textShadow = '2px 2px 0px #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';
                    textEffectStyles.letterSpacing = '1px';
                  }
                }

                return (
                  <p
                    key={idx}
                    data-lyric-active={isActive ? "true" : "false"}
                    className={`${containerClass} ${isActive ? activeClass : inactiveClass} ${isActive && renderConfig.textAnimation !== 'none' && renderConfig.textAnimation !== 'typewriter' ? `text-anim-${renderConfig.textAnimation}` : ''}`}
                    style={textEffectStyles}
                    onClick={() => {
                      if (audioRef.current && !isRendering) {
                        audioRef.current.currentTime = line.time;
                        // If we want to jump to the EXACT point in audio where this lyric is SUPPOSED to play now:
                        // line.time IS (originalTime + offset).
                        // So if we seek to line.time, we are seeking to the adjusted time.
                        // Example: Lyric originally 10s. Offset +5s. adjusted time = 15s.
                        // We see text. Click it. Audio jumps to 15s.
                        // At 15s, currentLyricIndex checks if time >= 15s. Yes.
                        // So the lyric matches the audio at that new point. Correct.
                        setCurrentTime(line.time);
                      }
                    }}
                  >
                    {isActive && renderConfig.textAnimation === 'typewriter'
                      ? line.text.substring(0, Math.max(0, Math.floor((currentTime - line.time) * 35)))
                      : line.text}
                  </p>
                );
              })}
              <div className={`transition-all duration-500 ${renderConfig.contentPosition === 'center' ? ((activeTab === TabView.EDITOR || isPlaylistMode) ? 'h-[25vh]' : (!isHeaderVisible && !isFooterVisible) ? 'h-[50vh]' : 'h-[40vh]') : 'h-0'}`}></div>
            </div>
          ) : (
            <div className="text-center text-zinc-400/50 select-none pointer-events-none">
              {!activeSlide && preset !== 'none' && (
                <div className="flex flex-col items-center gap-4 animate-pulse">
                  <Music size={64} className="opacity-20" />
                  <p>Load audio & lyrics to start</p>
                  <p className="text-xs opacity-50">Shortcuts: Space (Play), S (Stop), R (Repeat), H (Hold UI)</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Controls (Player) */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isFooterVisible ? 'max-h-60 opacity-100 translate-y-0' : 'max-h-0 opacity-0 translate-y-4'}`}>
          <div className="bg-gradient-to-t from-black/60 via-black/30 to-transparent p-4 pb-6 lg:p-6 lg:pb-8">
            <div className="max-w-7xl mx-auto space-y-4">
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

                {/* Volume Control (Top Row) */}
                <div className="flex items-center gap-2 pl-4">
                  <button onClick={() => setIsMuted(!isMuted)} className="text-zinc-400 hover:text-white">
                    {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <div className="w-16 h-1 bg-zinc-700/50 rounded-full relative overflow-hidden group/vol">
                    <div
                      className="absolute top-0 left-0 h-full bg-zinc-300 group-hover/vol:bg-purple-400 transition-colors"
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

              {/* Main Buttons */}
              <div className="flex flex-wrap lg:grid lg:grid-cols-[1fr_auto_1fr] items-center justify-center gap-4">
                <div className="flex gap-1 justify-center lg:justify-start flex-wrap order-2 lg:order-none w-auto lg:w-full">
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

                  {/* Lyric Offset Controls */}
                  <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg px-2 py-1 h-9">
                    <span className="text-xs text-zinc-300 w-12 text-center font-mono select-none border-r border-white/10 pr-2 mr-1">
                      {lyricOffset > 0 ? '+' : ''}{lyricOffset.toFixed(1)}s
                    </span>
                    <div className="flex flex-col -my-1 h-full justify-center">
                      <button
                        onClick={() => setLyricOffset(prev => parseFloat((prev + 0.1).toFixed(1)))}
                        className="text-zinc-400 hover:text-white flex items-center justify-center h-3.5 w-4 hover:bg-white/10 rounded-sm transition-colors"
                        title="Increase Lyric Offset (+0.1s)"
                        disabled={isRendering}
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        onClick={() => setLyricOffset(prev => parseFloat((prev - 0.1).toFixed(1)))}
                        className="text-zinc-400 hover:text-white flex items-center justify-center h-3.5 w-4 hover:bg-white/10 rounded-sm transition-colors"
                        title="Decrease Lyric Offset (-0.1s)"
                        disabled={isRendering}
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
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

                  {/* Font Size Control */}
                  <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg px-2 py-1 h-9">
                    <span className="text-xs text-zinc-300 w-10 text-center font-mono select-none border-r border-white/10 pr-2 mr-1">
                      {Math.round(renderConfig.fontSizeScale * 100)}%
                    </span>
                    <div className="flex flex-col -my-1 h-full justify-center">
                      <button
                        onClick={() => setRenderConfig(prev => ({ ...prev, fontSizeScale: Math.min(prev.fontSizeScale + 0.1, 3.0) }))}
                        className="text-zinc-400 hover:text-white flex items-center justify-center h-3.5 w-4 hover:bg-white/10 rounded-sm transition-colors"
                        title="Increase Font Size"
                        disabled={isRendering}
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        onClick={() => setRenderConfig(prev => ({ ...prev, fontSizeScale: Math.max(prev.fontSizeScale - 0.1, 0.1) }))}
                        className="text-zinc-400 hover:text-white flex items-center justify-center h-3.5 w-4 hover:bg-white/10 rounded-sm transition-colors"
                        title="Decrease Font Size"
                        disabled={isRendering}
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Preset Dropdown (Moved here) */}
                  <div className="relative group">
                    <select
                      value={preset}
                      onChange={(e) => setPreset(e.target.value as any)}
                      className="appearance-none bg-zinc-800/50 border border-white/5 text-zinc-300 text-xs rounded-lg px-3 pr-8 h-9 w-24 focus:outline-none focus:border-purple-500 cursor-pointer"
                      disabled={isRendering}
                      title="Select Visual Preset"
                    >
                      <option value="custom" className="bg-zinc-900 font-bold text-purple-400">Custom ✨</option>
                      <option value="default" className="bg-zinc-900">Default</option>
                      <option value="large" className="bg-zinc-900">Big Text</option>
                      <option value="large_upper" className="bg-zinc-900">Big Text (UP)</option>
                      <option value="big_center" className="bg-zinc-900">Big Center</option>
                      <option value="metal" className="bg-zinc-900">Metal</option>
                      <option value="kids" className="bg-zinc-900">Kids</option>
                      <option value="sad" className="bg-zinc-900">Sad</option>
                      <option value="romantic" className="bg-zinc-900">Romantic</option>
                      <option value="tech" className="bg-zinc-900">Tech</option>
                      <option value="gothic" className="bg-zinc-900">Gothic</option>
                      <option value="classic" className="bg-zinc-900">Classic Serif</option>
                      <option value="monospace" className="bg-zinc-900">Monospace</option>
                      <option value="testing_up" className="bg-zinc-900">Testing (UP)</option>
                      <option value="testing" className="bg-zinc-900">Testing</option>
                      <option value="one_line_up" className="bg-zinc-900">One Line (UP)</option>
                      <option value="one_line" className="bg-zinc-900">One Line</option>
                      <option value="slideshow" className="bg-zinc-900">Slideshow</option>
                      <option value="just_video" className="bg-zinc-900">Just Video</option>
                      <option value="subtitle" className="bg-zinc-900">Subtitle</option>
                      <option value="none" className="bg-zinc-900">None</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-zinc-500">
                      <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                  </div>


                </div>

                <div className="flex items-center gap-4 lg:gap-6 justify-center order-1 lg:order-none w-full lg:w-auto mb-2 lg:mb-0">
                  <button
                    className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                    onClick={stopPlayback}
                    title="Stop (S)"
                    disabled={isRendering}
                  >
                    <Square size={20} fill="currentColor" />
                  </button>
                  <button className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50" disabled={isRendering || playlist.length === 0} onClick={playPreviousSong} title="Previous Song">
                    <SkipBack size={24} />
                  </button>
                  <button className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50" disabled={isRendering} onClick={() => audioRef.current && (audioRef.current.currentTime -= 5)} title="Rewind 5s">
                    <Rewind size={20} />
                  </button>
                  <button
                    onClick={togglePlay}
                    disabled={isRendering}
                    className="w-14 h-14 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                  </button>
                  <button className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50" disabled={isRendering} onClick={() => audioRef.current && (audioRef.current.currentTime += 5)} title="Fast Forward 5s">
                    <FastForward size={20} />
                  </button>
                  <button className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50" disabled={isRendering || playlist.length === 0} onClick={playNextSong} title="Next Song">
                    <SkipForward size={24} />
                  </button>
                  <button
                    className={`transition-colors disabled:opacity-50 ${repeatMode !== 'off' ? 'text-green-400 hover:text-green-300' : 'text-zinc-400 hover:text-white'}`}
                    onClick={toggleRepeat}
                    title={`Repeat: ${repeatMode === 'off' ? 'Off' : repeatMode === 'all' ? 'All' : 'One'} (R)`}
                    disabled={isRendering}
                  >
                    {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
                  </button>


                </div>

                <div className="flex items-center gap-1 justify-center lg:justify-end group flex-wrap order-3 lg:order-none w-auto lg:w-full">

                  <div className="flex items-center gap-1">
                    {/* Background Blur Toggle */}
                    <button
                      onClick={() => setIsBlurEnabled(prev => !prev)}
                      className={`bg-zinc-800/50 border border-white/5 text-[10px] font-mono rounded-lg px-2 h-9 transition-colors disabled:opacity-30 ${isBlurEnabled ? 'text-purple-400 border-purple-500/50' : 'text-zinc-300 hover:text-white'}`}
                      title={`Background Blur: ${isBlurEnabled ? 'Msg' : 'Off'}`}
                      disabled={isRendering}
                    >
                      {isBlurEnabled ? 'BLUR' : 'SHARP'}
                    </button>
                    {/* Resolution Toggle */}
                    <button
                      onClick={() => setResolution(prev => prev === '1080p' ? '720p' : '1080p')}
                      className="bg-zinc-800/50 border border-white/5 text-[10px] font-mono text-zinc-300 hover:text-white rounded-lg px-2 h-9 transition-colors disabled:opacity-30"
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
                        if (prev === '1:1') return '1:2';
                        if (prev === '1:2') return '2:1';
                        if (prev === '2:1') return '2:3';
                        if (prev === '2:3') return '3:2';
                        return '16:9';
                      })}
                      className="bg-zinc-800/50 border border-white/5 text-[10px] font-mono text-zinc-300 hover:text-white rounded-lg px-2 h-9 transition-colors disabled:opacity-30"
                      title="Toggle Aspect Ratio (16:9 / 9:16 / 3:4 / 1:1 / 1:2 / 2:1 / 2:3 / 3:2)"
                      disabled={isRendering}
                    >
                      {aspectRatio}
                    </button>
                  </div>
                  {/* Codec Selection */}
                  <div className="relative group">
                    <select
                      value={renderCodec}
                      onChange={(e) => setRenderCodec(e.target.value)}
                      className="appearance-none bg-zinc-800/50 border border-white/5 text-zinc-300 text-xs rounded-lg px-3 pr-8 w-28 h-9 focus:outline-none focus:border-purple-500 cursor-pointer"
                      disabled={isRendering}
                      title="Select Video Codec"
                    >
                      <option value="auto" className="bg-zinc-900">Codec: Auto</option>
                      {supportedCodecs.map(c => (
                        <option key={c.value} value={c.value} className="bg-zinc-900">{c.label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-zinc-500">
                      <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                  </div>

                  {/* FPS Selection */}
                  <div className="relative group">
                    <select
                      value={renderFps}
                      onChange={(e) => setRenderFps(parseInt(e.target.value))}
                      className="appearance-none bg-zinc-800/50 border border-white/5 text-zinc-300 text-xs rounded-lg px-3 pr-8 w-20 h-9 focus:outline-none focus:border-purple-500 cursor-pointer"
                      disabled={isRendering}
                      title="Select Frame Rate"
                    >
                      <option value="24" className="bg-zinc-900">24 FPS</option>
                      <option value="25" className="bg-zinc-900">25 FPS</option>
                      <option value="30" className="bg-zinc-900">30 FPS</option>
                      <option value="50" className="bg-zinc-900">50 FPS</option>
                      <option value="60" className="bg-zinc-900">60 FPS</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-zinc-500">
                      <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                  </div>

                  {/* Quality/Bitrate Selection */}
                  <div className="relative group">
                    <select
                      value={renderQuality}
                      onChange={(e) => setRenderQuality(e.target.value as any)}
                      className="appearance-none bg-zinc-800/50 border border-white/5 text-zinc-300 text-xs rounded-lg px-3 pr-8 w-16 h-9 focus:outline-none focus:border-purple-500 cursor-pointer"
                      disabled={isRendering}
                      title="Select Quality (Bitrate)"
                    >
                      <option value="low" className="bg-zinc-900">Low</option>
                      <option value="med" className="bg-zinc-900">Med</option>
                      <option value="high" className="bg-zinc-900">High</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-zinc-500">
                      <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                  </div>

                  {/* Export Button */}
                  <button
                    onClick={handleExportVideo}
                    disabled={isRendering || !audioSrc}
                    className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                    title="Export as Video"
                  >
                    <Video size={18} />
                  </button>


                </div>
              </div>
            </div>
          </div>
        </div>
        {/* --- Bottom Timeline Editor or Playlist --- */}
        {isPlaylistMode ? (
          <div className="animate-slide-up border-t border-white/10 z-30 shrink-0 w-full max-w-[100vw] overflow-hidden">
            <PlaylistEditor
              playlist={playlist}
              setPlaylist={setPlaylist}
              currentTrackIndex={currentTrackIndex}
              setCurrentTrackIndex={setCurrentTrackIndex}
              onPlayTrack={playTrack}
              currentTime={currentTime}
              onSeek={(time) => {
                if (audioRef.current && !isRendering) {
                  audioRef.current.currentTime = time;
                  setCurrentTime(time);
                }
              }}
              onClearPlaylist={() => {
                // Stop playback and clear audio state
                stopPlayback();
                setAudioSrc(null);
                setLyrics([]);
                setCurrentTrackIndex(-1);
                setMetadata({ title: 'No Audio Loaded', artist: 'Select a file', coverUrl: null, backgroundType: 'image' });
              }}
            />
          </div>
        ) : (
          activeTab === TabView.EDITOR && (
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
          )
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
            <p className="text-zinc-400 max-w-md">
              Rendering in real-time using Canvas 2D engine.<br />
              The audio will play during capture.<br />
              Please keep this tab active for best performance.
            </p>

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

      {showRenderSettings && (
        <RenderSettings
          config={renderConfig}
          setConfig={setRenderConfig}
          preset={preset}
          setPreset={setPreset}
          onClose={() => setShowRenderSettings(false)}
          isPlaylistMode={isPlaylistMode}
          onRender={handleExportVideo}
          customFontName={customFontName}
          onFontUpload={handleFontUpload}
          onClearCustomFont={() => setCustomFontName(null)}
        />
      )}
    </div >
  );
}

export default App;