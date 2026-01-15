import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Maximize, Minimize, Upload, Music, FileText, Settings, ImageIcon,
  Repeat, Repeat1, Square, Eye, EyeOff, Video, Download, Film, Type, X, ListMusic, Rewind, FastForward,
  ChevronUp, ChevronDown
} from './components/Icons';
import { AudioMetadata, LyricLine, TabView, VisualSlide, VideoPreset, PlaylistItem, RenderConfig } from './types';
import { formatTime, parseLRC, parseSRT, parseTTML } from './utils/parsers';
import VisualEditor from './components/VisualEditor';
import PlaylistEditor from './components/PlaylistEditor';
import RenderSettings from './components/RenderSettings';
import { drawCanvasFrame } from './utils/canvasRenderer';
import { loadGoogleFonts } from './utils/fonts';
import { PRESET_CYCLE_LIST, PRESET_DEFINITIONS, videoPresetGroups } from './utils/presets';
import { useUI } from './contexts/UIContext';


function App() {
  const { toast, confirm } = useUI();
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
  const [audioElementKey, setAudioElementKey] = useState(0);
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
  const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all' | 'all_repeat'>('off');
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
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '3:4' | '1:1' | '1:2' | '2:1' | '2:3' | '3:2' | '20:9' | '21:9' | '4:5' | '4:3'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [preset, setPreset] = useState<VideoPreset>('default');
  const [customFontName, setCustomFontName] = useState<string | null>(null);
  // const [fontSizeScale, setFontSizeScale] = useState(1); // Migrated to renderConfig
  const [renderCodec, setRenderCodec] = useState<string>('auto');
  const [renderFps, setRenderFps] = useState<number>(30);
  const [renderQuality, setRenderQuality] = useState<'low' | 'med' | 'high'>('med');

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
    transitionEffect: 'none',
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
    backgroundBlurStrength: 0,
    introMode: 'auto',
    introText: '',
    textCase: 'none',
    highlightEffect: 'karaoke',
  });

  // Ref to access latest config in event handlers without triggering re-renders
  const renderConfigRef = useRef(renderConfig);
  useEffect(() => {
    renderConfigRef.current = renderConfig;
  }, [renderConfig]);

  const isBlurEnabled = renderConfig.backgroundBlurStrength > 0;

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
      case '4:3':
        return is1080p ? { w: 1440, h: 1080 } : { w: 960, h: 720 };
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
      case '4:5':
        return is1080p ? { w: 1080, h: 1350 } : { w: 720, h: 900 };
      case '20:9':
        return is1080p ? { w: 2400, h: 1080 } : { w: 1600, h: 720 };
      case '21:9':
        return is1080p ? { w: 2560, h: 1080 } : { w: 1720, h: 720 };
      case '16:9':
      default:
        return is1080p ? { w: 1920, h: 1080 } : { w: 1280, h: 720 };
    }
  };


  const { w: canvasWidth, h: canvasHeight } = getCanvasDimensions();

  // Visibility Toggles (Shortcuts)
  const [showInfo, setShowInfo] = useState(true);
  const [showPlayer, setShowPlayer] = useState(true);
  const [isMinimalMode, setIsMinimalMode] = useState(false);

  // Derived State
  const activeVisualSlides = useMemo(() => {
    const slides = visualSlides.filter(
      s => s.type !== 'audio' && currentTime >= s.startTime && currentTime < s.endTime
    );
    // Sort by layer (0 first, then 1) so 1 draws on top
    return slides.sort((a, b) => (a.layer || 0) - (b.layer || 0));
  }, [visualSlides, currentTime]);

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
        } else if (ext === 'ttml' || ext === 'xml') {
          parsedLyrics = parseTTML(text);
        }

        // Auto-enable karaoke highlight if word-level data is detected
        if (parsedLyrics.some(l => l.words && l.words.length > 0)) {
          setRenderConfig(prev => ({ ...prev, highlightEffect: 'karaoke' }));
          toast.success(`${ext?.toUpperCase()} loaded with word-level timing! Karaoke mode enabled.`);
        }
        setLyrics(parsedLyrics);
      } catch (err) {
        console.error("Failed to parse lyrics:", err);
        toast.error("Failed to parse lyric file.");
      }
    }
    // Allow re-upload
    e.target.value = '';
  };

  // Sync lyrics from playlist changes (e.g. loaded/deleted in Editor)
  useEffect(() => {
    if (currentTrackIndex !== -1 && playlist[currentTrackIndex]) {
      const track = playlist[currentTrackIndex];
      // We prioritize parsedLyrics if available, otherwise clear
      // This ensures if user clears lyrics in editor, it reflects here immediately
      setLyrics(track.parsedLyrics || []);
    }
  }, [playlist, currentTrackIndex]);

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!window.FontFace || !document.fonts) {
        toast.error("Custom fonts are not supported in this browser.");
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
        toast.error("Failed to load font file.");
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
      if (track.parsedLyrics.some(l => l.words && l.words.length > 0)) {
        setRenderConfig(prev => ({ ...prev, highlightEffect: 'karaoke' }));
      }
    } else if (track.lyricFile) {
      try {
        const text = await track.lyricFile.text();
        const ext = track.lyricFile.name.split('.').pop()?.toLowerCase();
        let parsed: LyricLine[] = [];
        if (ext === 'lrc') parsed = parseLRC(text);
        else if (ext === 'srt') parsed = parseSRT(text);
        else if (ext === 'ttml' || ext === 'xml') parsed = parseTTML(text);

        setLyrics(parsed);

        if (parsed.some(l => l.words && l.words.length > 0)) {
          setRenderConfig(prev => ({ ...prev, highlightEffect: 'karaoke' }));
        }

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
      if (prev === 'off') return 'one';       // 1. Loop One
      if (prev === 'one') return 'all';       // 2. Play All (Stop at End)
      if (prev === 'all') return 'all_repeat';// 3. Play All (Loop Playlist)
      return 'off';                           // 4. Off
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
    if (!audioRef.current || !canvasRef.current) return;

    // Determine Render Scope
    const isPlaylistRender = renderConfig.renderMode === 'playlist' && playlist.length > 0;
    const queue: {
      audioSrc: string;
      lyrics: LyricLine[];
      metadata: AudioMetadata;
      duration?: number;
      isFileSource?: boolean;
    }[] = [];

    if (isPlaylistRender) {
      // Build Queue from Playlist
      for (const item of playlist) {
        // Prepare lyrics
        let trackLyrics: LyricLine[] = [];
        if (item.parsedLyrics && item.parsedLyrics.length > 0) {
          trackLyrics = item.parsedLyrics;
        } else if (item.lyricFile) {
          try {
            const text = await item.lyricFile.text();
            const ext = item.lyricFile.name.split('.').pop()?.toLowerCase();
            if (ext === 'lrc') trackLyrics = parseLRC(text);
            else if (ext === 'srt') trackLyrics = parseSRT(text);
            else if (ext === 'ttml' || ext === 'xml') trackLyrics = parseTTML(text);
          } catch (e) {
            console.error("Failed to parse lyrics for playlist item", e);
          }
        }

        // Prepare Audio URL
        const url = URL.createObjectURL(item.audioFile);

        queue.push({
          audioSrc: url,
          lyrics: trackLyrics,
          metadata: item.metadata,
          isFileSource: true // Mark to revoke later
        });
      }
    } else {
      // Single Track (Current)
      if (!audioSrc) return;
      queue.push({
        audioSrc: audioSrc,
        lyrics: adjustedLyrics, // Use currently adjusted lyrics (with offset)
        metadata: metadata,
        isFileSource: false
      });
    }

    if (queue.length === 0) return;

    // Confirm
    const confirmMsg = isPlaylistRender
      ? `Start rendering ALL ${queue.length} songs from the playlist? This will result in one continuous video.`
      : `Start rendering ${aspectRatio} (${resolution}) video? This will play the song from start to finish.`;

    const isConfirmed = await confirm(`${confirmMsg} Please do not switch tabs during rendering.`, "Start Rendering?");
    if (!isConfirmed) {
      // Cleanup generated URLs if aborted immediately
      if (isPlaylistRender) queue.forEach(q => q.isFileSource && URL.revokeObjectURL(q.audioSrc));
      return;
    }

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

    const audioEl = audioRef.current;

    // Capture current preset to use inside the loop based on initial state
    const currentPreset = preset;

    // 1. Preload Images & Videos (Global Resources)
    const imageMap = new Map<string, HTMLImageElement>();
    const videoMap = new Map<string, HTMLVideoElement>();
    const audioMap = new Map<string, HTMLAudioElement>();
    const loadPromises: Promise<void>[] = [];

    // Helper Loaders
    const loadImg = (id: string, url: string) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => { imageMap.set(id, img); resolve(); };
        img.onerror = () => resolve();
        img.src = url;
      });
    };

    const loadVid = (id: string, url: string) => {
      return new Promise<void>((resolve) => {
        const vid = document.createElement('video');
        vid.crossOrigin = "anonymous";
        vid.muted = true;
        vid.playsInline = true;
        vid.preload = "auto";
        let resolved = false;
        const safeResolve = () => { if (!resolved) { resolved = true; videoMap.set(id, vid); resolve(); } };
        vid.oncanplay = () => { if (!resolved) { vid.currentTime = 0.001; } };
        vid.onseeked = () => safeResolve();
        vid.onerror = () => { console.warn("Failed to load video:", url); safeResolve(); };
        setTimeout(() => safeResolve(), 5000);
        vid.src = url;
        vid.load();
      });
    };

    const loadAudio = (id: string, url: string) => {
      return new Promise<void>((resolve) => {
        const aud = document.createElement('audio');
        aud.crossOrigin = "anonymous";
        aud.onloadedmetadata = () => { audioMap.set(id, aud); resolve(); };
        aud.onerror = () => resolve();
        aud.src = url;
      });
    };

    // Preload Visual Slides (Global)
    visualSlides.forEach(s => {
      if (s.type === 'video') loadPromises.push(loadVid(s.id, s.url));
      else if (s.type === 'audio') loadPromises.push(loadAudio(s.id, s.url));
      else if (s.type === 'audio') loadPromises.push(loadAudio(s.id, s.url));
      else loadPromises.push(loadImg(s.id, s.url));
    });

    // Load Channel Info Image
    if (renderConfig.showChannelInfo && renderConfig.channelInfoImage) {
      loadPromises.push(loadImg('__channel_info__', renderConfig.channelInfoImage));
    }
    // Load Custom Background Image
    if (renderConfig.backgroundSource === 'image' && renderConfig.backgroundImage) {
      loadPromises.push(loadImg('__custom_bg__', renderConfig.backgroundImage));
    }

    await Promise.all(loadPromises);

    if (abortRenderRef.current) {
      setIsRendering(false);
      if (isPlaylistRender) queue.forEach(q => q.isFileSource && URL.revokeObjectURL(q.audioSrc));
      return;
    }

    // 3. Setup Audio Mixing & Recording
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(renderFps);

    let audioStream: MediaStream | null = null;
    try {
      // @ts-ignore
      if (audioEl.captureStream) audioStream = audioEl.captureStream();
      // @ts-ignore
      else if (audioEl.mozCaptureStream) audioStream = audioEl.mozCaptureStream();
      else throw new Error("Audio capture not supported");
    } catch (e) {
      toast.error("Your browser does not support audio capture for recording.");
      setIsRendering(false);
      return;
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const mixerDest = audioContext.createMediaStreamDestination();

    // Connect Source to Mixer
    const source = audioContext.createMediaElementSource(audioEl);
    source.connect(mixerDest);

    // Connect Preloads
    videoMap.forEach((vidElement) => {
      vidElement.muted = true;
      const src = audioContext.createMediaElementSource(vidElement);
      src.connect(mixerDest);
    });
    audioMap.forEach((audElement) => {
      audElement.muted = true;
      const src = audioContext.createMediaElementSource(audElement);
      src.connect(mixerDest);
    });

    if (mixerDest.stream.getAudioTracks().length > 0) {
      stream.addTrack(mixerDest.stream.getAudioTracks()[0]);
    } else if (audioStream) {
      stream.addTrack(audioStream.getAudioTracks()[0]);
    }

    // Setup MediaRecorder
    const getPreferredMimeType = () => {
      if (renderCodec !== 'auto' && MediaRecorder.isTypeSupported(renderCodec)) return renderCodec;
      const types = [
        'video/webm; codecs=vp9,opus', 'video/webm; codecs=vp9', 'video/webm; codecs=av1',
        'video/mp4; codecs="av01.0.05M.08"', 'video/mp4; codecs="avc1.4D401E, mp4a.40.2"',
        'video/mp4; codecs="avc1.64001E, mp4a.40.2"', 'video/mp4', 'video/webm'
      ];
      for (const t of types) { if (MediaRecorder.isTypeSupported(t)) return t; }
      return 'video/webm';
    };

    const mimeType = getPreferredMimeType();
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
      if (!abortRenderRef.current) {
        const blob = new Blob(chunks, { type: mimeType });
        const downloadBlob = (blobToDownload: Blob) => {
          const url = URL.createObjectURL(blobToDownload);
          const a = document.createElement('a');
          a.href = url;
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const filename = isPlaylistRender
            ? `Playlist_${queue.length}_Songs_${aspectRatio.replace(':', '-')}.${ext}`
            : `${queue[0].metadata.title || 'video'}_${aspectRatio.replace(':', '-')}.${ext}`;

          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        };

        if (mimeType.includes('webm')) {
          downloadBlob(blob);
        } else {
          downloadBlob(blob);
        }
      } else {
        console.log("Render aborted");
      }

      // Cleanup
      audioContext.close();
      setIsRendering(false);
      setAudioElementKey(prev => prev + 1);
      if (isPlaylistRender) queue.forEach(q => q.isFileSource && URL.revokeObjectURL(q.audioSrc));
    };

    // --- RENDER ORCHESTRATION ---

    let queueIndex = 0;
    // Mutable Rendering State
    let currentRenderLyrics: LyricLine[] = [];
    let currentRenderMetadata: AudioMetadata = metadata;
    let currentRenderDuration = 0;

    // Render Loop (Frame Drawer)
    let lastRenderTime = 0;
    const renderInterval = 1000 / renderFps;

    const renderFrameLoop = (now: number) => {
      if (abortRenderRef.current) return;

      if (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused') {
        requestAnimationFrame(renderFrameLoop);
      }

      const elapsed = now - lastRenderTime;
      if (elapsed < renderInterval) return;
      lastRenderTime = now - (elapsed % renderInterval);

      const t = audioEl.currentTime;

      // Current Song Progress for UI (Partial)
      // We could also show Total Progress queueIndex / queue.length
      if (currentRenderDuration > 0) {
        setRenderProgress(((t / currentRenderDuration) * 100));
      }

      // Sync Backgrounds/Videos
      videoMap.forEach((v, id) => {
        if (id === 'background') {
          const vidDuration = v.duration || 1;
          const targetTime = t % vidDuration;
          // Handle Loop Wrap-around and Drift
          let drift = Math.abs(v.currentTime - targetTime);
          if (targetTime < v.currentTime && (v.currentTime - targetTime) > vidDuration / 2) {
            v.currentTime = targetTime;
          } else if (drift > 0.5) { // Increased tolerance
            v.currentTime = targetTime;
          }
          if (v.paused) v.play().catch(() => { });
        } else {
          const s = visualSlides.find(sl => sl.id === id);
          if (s) {
            if (t >= s.startTime && t < s.endTime) {
              const rel = (t - s.startTime) + (s.mediaStartOffset || 0);
              if (Math.abs(v.currentTime - rel) > 0.5) v.currentTime = rel;
              const shouldMute = s.isMuted !== false;
              if (v.muted !== shouldMute) v.muted = shouldMute;
              if (v.paused) v.play().catch(() => { });
            } else {
              if (!v.paused) v.pause();
              if (!v.muted) v.muted = true;
            }
          }
        }
      });

      // Sync Audio Slides
      audioMap.forEach((a, id) => {
        const s = visualSlides.find(sl => sl.id === id);
        if (s) {
          const layer = s.layer || 0;
          const isLayerVisible = renderConfig.layerVisibility?.audio?.[layer] !== false;

          if (isLayerVisible && t >= s.startTime && t < s.endTime) {
            const rel = (t - s.startTime) + (s.mediaStartOffset || 0);
            if (Math.abs(a.currentTime - rel) > 0.5) a.currentTime = rel;
            const shouldMute = s.isMuted === true;
            if (a.muted !== shouldMute) a.muted = shouldMute;
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
          t,
          currentRenderLyrics,
          currentRenderMetadata,
          visualSlides,
          imageMap, // Must contain cover!
          videoMap,
          currentPreset,
          customFontName,
          renderConfig.fontSizeScale,
          renderConfig.backgroundBlurStrength > 0, // Should be isBlurEnabled
          currentRenderDuration,
          renderConfig,
          renderConfig.renderMode === 'current' || (queueIndex === queue.length - 1),
          renderConfig.renderMode === 'current' || (queueIndex === 0)
        );
      }
    };


    const processNextTrack = async () => {
      if (abortRenderRef.current) {
        mediaRecorder.stop();
        return;
      }

      if (queueIndex >= queue.length) {
        // Add a small tail of silence/freeze
        await new Promise(r => setTimeout(r, 500));
        mediaRecorder.stop();
        return;
      }

      const track = queue[queueIndex];

      // Pause recording while loading assets/buffering to avoid black frames/gaps
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
      }

      // 1. Update State
      currentRenderLyrics = track.lyrics;
      currentRenderMetadata = track.metadata; // Update local ref
      currentRenderDuration = 0;

      // Update Metadata in Background if possible to show progress in UI?
      // Setting state might be risky if unmounted, but we are in App.
      // setMetadata(track.metadata); 

      // 2. Load Cover Art into imageMap
      if (track.metadata.coverUrl) {
        if (track.metadata.backgroundType === 'video') {
          // Ensure background video is loaded in videoMap
          // Note: if queue has different videos, we might overwrite 'background' key.
          // This is fine as we process sequentially.
          await loadVid('background', track.metadata.coverUrl);
        } else {
          await loadImg('cover', track.metadata.coverUrl);
        }
      }

      // 3. Load Audio
      // We pause first to be safe
      audioEl.pause();
      audioEl.src = track.audioSrc;
      audioEl.load();

      // Wait for ready
      await new Promise<void>((resolve) => {
        const onCanPlay = () => {
          audioEl.removeEventListener('canplay', onCanPlay);
          resolve();
        };
        audioEl.addEventListener('canplay', onCanPlay);
        // Fallback if cached
        if (audioEl.readyState >= 3) onCanPlay();
      });

      currentRenderDuration = audioEl.duration;

      // 4. Play and Record
      if (mediaRecorder.state === 'inactive') {
        if (audioContext.state === 'suspended') await audioContext.resume();
        mediaRecorder.start();
        requestAnimationFrame(renderFrameLoop);
      } else if (mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
      }
      await audioEl.play();

      // Wait for end
      await new Promise<void>((resolve) => {
        const onEnded = () => {
          audioEl.removeEventListener('ended', onEnded);
          resolve();
        };
        audioEl.addEventListener('ended', onEnded);
      });

      // 5. Next
      queueIndex++;
      processNextTrack();
    };


    // Start Processing Queue
    await processNextTrack();

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
  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the key shoud trigger UI wake-up
      const key = e.key.toLowerCase();
      const ignoredKeysForIdle = [' ', 'k', 's', 't', 'l', 'r', 'f', 'h', 'g', 'm', 'j', 'd', 'e', 'c', 'x', 'z', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'meta', 'control', 'shift', 'alt', 'printscreen', 'fn', '+', '-', '='];

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

      const setPresetCustom = () => setPreset('custom');

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          toast.success(isPlaying ? "Paused" : "Playing", { id: 'play-pause' });
          break;
        case 's':
          e.preventDefault();
          stopPlayback();
          toast.success("Stopped", { id: 'stop' });
          break;
        case 'n':
          e.preventDefault();
          playNextSong();
          toast.success("Next Song", { id: 'next-song' });
          break;
        case 'o':
          e.preventDefault();
          const newVal = !isMinimalMode;
          setIsMinimalMode(newVal);
          toast.success(`Minimal Mode: ${newVal ? 'On' : 'Off'}`, { id: 'minimal-mode' });
          break;
        case 'b':
          e.preventDefault();
          playPreviousSong();
          toast.success("Previous Song", { id: 'prev-song' });
          break;
        case 'r': // Loop (Repeat)
          e.preventDefault();
          toggleRepeat();
          // We calculate the next mode based on current state to show correct toast
          const nextRepMode = repeatMode === 'off' ? 'one' : repeatMode === 'one' ? 'all' : repeatMode === 'all' ? 'all_repeat' : 'off';
          const repLabels: Record<string, string> = { off: 'Repeat Off', one: 'Loop One', all: 'Play All (Stop)', all_repeat: 'Loop Playlist' };
          toast.success(`Repeat: ${repLabels[nextRepMode]}`, { id: 'repeat' });
          break;
        case 'l': // List (Playlist)
          e.preventDefault();
          const newMode = !isPlaylistMode;
          setIsPlaylistMode(newMode);
          if (newMode) setActiveTab(TabView.PLAYER);
          break;
        case 'h':
          e.preventDefault();
          const nextBypass = !bypassAutoHide;
          setBypassAutoHide(nextBypass);
          toast.success(nextBypass ? "HUD: Always Visible" : "HUD: Auto-Hide", { id: 'hud-mode' });
          break;
        case 'g': // Cycle Lyric Display Mode
          e.preventDefault();
          const modes = ['all', 'previous-next', 'next-only', 'active-only'];
          const currentMode = renderConfigRef.current.lyricDisplayMode;
          const currentIndex = modes.indexOf(currentMode);
          const nextIndex = (currentIndex + 1) % modes.length;
          const nextMode = modes[nextIndex] as any;

          setRenderConfig(prev => ({ ...prev, lyricDisplayMode: nextMode }));
          setPresetCustom();
          toast.success(`Lyric Mode: ${nextMode.replace('-', ' ')}`, { id: 'lyric-mode' });
          break;
        case 'c': // Cycle Text Case
          e.preventDefault();
          const cases = ['none', 'upper', 'lower', 'title', 'sentence', 'invert'];
          const currentCase = renderConfigRef.current.textCase;
          const currentCaseIndex = cases.indexOf(currentCase);
          const nextCaseIndex = (currentCaseIndex + 1) % cases.length;
          const nextCase = cases[nextCaseIndex] as any;

          setRenderConfig(prev => ({ ...prev, textCase: nextCase }));
          setPresetCustom();
          toast.success(`Text Case: ${nextCase}`, { id: 'text-case' });
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
          const nextMute = !isMuted;
          setIsMuted(nextMute);
          toast.success(nextMute ? "Muted" : "Unmuted", { id: 'mute' });
          break;
        case 'x': // Toggle Highlight Effect
          e.preventDefault();
          const isTurningOn = renderConfigRef.current.highlightEffect === 'none';
          setRenderConfig(prev => ({
            ...prev,
            highlightEffect: prev.highlightEffect === 'none' ? 'karaoke' : 'none'
          }));
          setPresetCustom();
          toast.success(`Highlight: ${isTurningOn ? 'On (Karaoke)' : 'Off'}`, { id: 'highlight-toggle' });
          break;
        case 'z': // Cycle Highlight Effect
          e.preventDefault();
          const highlightEffects = [
            'none', 'color', 'scale', 'glow', 'background',
            'karaoke', 'karaoke-fill', 'karaoke-outline', 'karaoke-underline', 'karaoke-shadow', 'karaoke-gradient',
            'karaoke-bounce', 'karaoke-wave', 'karaoke-scale',
            'karaoke-neon', 'karaoke-glow-blue', 'karaoke-glow-pink',
            'karaoke-blue', 'karaoke-purple', 'karaoke-green', 'karaoke-pink', 'karaoke-cyan',
            'karaoke-pill', 'karaoke-box', 'karaoke-rounded'
          ];

          const currentEffect = renderConfigRef.current.highlightEffect || 'none';
          const idx = highlightEffects.indexOf(currentEffect as string);
          const safeIdx = idx === -1 ? 0 : idx;
          const nextIdxZ = (safeIdx + 1) % highlightEffects.length;
          const nextEffectZ = highlightEffects[nextIdxZ] as string;

          let color = '';
          let bg = '';

          if (nextEffectZ.includes('blue') || nextEffectZ.includes('cyan')) {
            color = nextEffectZ.includes('cyan') ? '#06b6d4' : '#3b82f6';
            bg = color;
          } else if (nextEffectZ.includes('purple')) {
            color = '#a855f7';
            bg = color;
          } else if (nextEffectZ.includes('green')) {
            color = '#22c55e';
            bg = color;
          } else if (nextEffectZ.includes('pink')) {
            color = '#ec4899';
            bg = color;
          } else if (nextEffectZ === 'karaoke-pill' || nextEffectZ === 'karaoke-box' || nextEffectZ === 'karaoke-rounded') {
            color = '#fb923c';
            bg = '#fb923c';
          }

          setRenderConfig(prev => {
            const newConfig = { ...prev, highlightEffect: nextEffectZ };
            if (color) {
              newConfig.highlightColor = color;
              newConfig.highlightBackground = bg;
            }
            return newConfig;
          });
          setPresetCustom();

          toast.success(`Effect: ${nextEffectZ.replace(/-/g, ' ')}`, { id: 'highlight-effect' });
          break;
        case 'j': // Cycle Preset
          e.preventDefault();
          const pIdx = PRESET_CYCLE_LIST.indexOf(preset);
          const nextPIdx = (pIdx + 1) % PRESET_CYCLE_LIST.length;
          const nextP = PRESET_CYCLE_LIST[nextPIdx];

          setPreset(nextP);

          // Sync Config
          const pConfig = PRESET_DEFINITIONS[nextP];
          if (pConfig) {
            setRenderConfig(curr => ({ ...curr, ...pConfig }));
          }

          // Notification
          let pLabel: string = nextP;
          for (const g of videoPresetGroups) {
            const found = g.options.find(o => o.value === nextP);
            if (found) {
              pLabel = found.label;
              break;
            }
          }
          toast.success(`Preset: ${pLabel}`, { id: 'preset' });
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
          const currentScaleUp = renderConfigRef.current.fontSizeScale;
          const newValUp = Math.min(currentScaleUp + 0.1, 3.0);
          setRenderConfig(prev => ({ ...prev, fontSizeScale: newValUp }));
          toast.success(`Font Size: ${(newValUp * 100).toFixed(0)}%`, { id: 'font-size' });
          setPresetCustom();
          break;
        case '-':
          e.preventDefault();
          const currentScaleDown = renderConfigRef.current.fontSizeScale;
          const newValDown = Math.max(currentScaleDown - 0.1, 0.1);
          setRenderConfig(prev => ({ ...prev, fontSizeScale: newValDown }));
          toast.success(`Font Size: ${(newValDown * 100).toFixed(0)}%`, { id: 'font-size' });
          setPresetCustom();
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
  }, [isPlaying, repeatMode, activeTab, isRendering, resetIdleTimer, handleAbortRender, isPlaylistMode, playNextSong, playPreviousSong, toast, isMinimalMode, preset, bypassAutoHide, isMuted]);

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
  const isFooterVisible = showPlayer && (!isMouseIdle || bypassAutoHide) && !isRendering && !isMinimalMode;

  const activeSlide = activeVisualSlides.length > 0 ? activeVisualSlides[0] : null;

  const backgroundStyle = activeSlide
    ? { backgroundImage: `url(${activeSlide.url})` }
    : metadata.coverUrl
      ? { backgroundImage: `url(${metadata.coverUrl})` }
      : undefined;

  // Video Sync Logic
  const bgVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // 1. Active Visual Slides Sync
    activeVisualSlides.forEach(slide => {
      // Check visibility
      const layer = slide.layer || 0;
      if (renderConfig.layerVisibility?.visual?.[layer] === false) return;

      if (slide.type === 'video') {
        const vid = document.getElementById(`video-preview-${slide.id}`) as HTMLVideoElement;
        if (vid) {
          if (isRendering) {
            if (!vid.paused) vid.pause();
          } else {
            const relTime = (currentTime - slide.startTime) + (slide.mediaStartOffset || 0);

            // Check if we need to sync timestamps (fix drift/seeks)
            if (Math.abs(vid.currentTime - relTime) > 0.1) {
              vid.currentTime = relTime;
            }

            // Sync Muted State & Volume
            const shouldMute = slide.isMuted !== false; // Default true (muted)
            if (vid.muted !== shouldMute) vid.muted = shouldMute;

            const targetVolume = slide.volume !== undefined ? slide.volume : 1;
            if (Math.abs(vid.volume - targetVolume) > 0.01) vid.volume = targetVolume;

            if (isPlaying && vid.paused) {
              vid.play().catch(() => { }); // catch interrupt errors
            } else if (!isPlaying && !vid.paused) {
              vid.pause();
            }
          }
        }
      }
    });

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
        const relTime = (currentTime - s.startTime) + (s.mediaStartOffset || 0);
        if (Math.abs(aud.currentTime - relTime) > 0.2) aud.currentTime = relTime;

        const shouldMute = s.isMuted === true;
        if (aud.muted !== shouldMute) aud.muted = shouldMute;

        const targetVol = s.volume !== undefined ? s.volume : 1;
        if (Math.abs(aud.volume - targetVol) > 0.01) aud.volume = targetVol;

        if (isPlaying && aud.paused) aud.play().catch(() => { });
        else if (!isPlaying && !aud.paused) aud.pause();
      }
    });

  }, [currentTime, isPlaying, activeVisualSlides, metadata, activeAudioSlides, renderConfig.layerVisibility]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
      className={`relative w-full h-[100dvh] bg-black overflow-hidden flex font-sans select-none ${isMouseIdle && !bypassAutoHide ? 'cursor-none' : ''}`}
    >
      <audio
        key={audioElementKey}
        ref={audioRef}
        src={audioSrc || undefined}
        loop={repeatMode === 'one'}
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          if (isRendering) return;

          // Global Queue Handling (Active regardless of Playist UI visibility)
          const hasQueue = playlist.length > 0;

          if (repeatMode === 'one') {
            // Handled by loop attribute, but purely for backup:
            // if (!audioRef.current?.loop) audioRef.current?.play();
          } else if (repeatMode === 'all_repeat') {
            // Loop All: Always go next (loops around)
            if (hasQueue) {
              playNextSong();
            } else {
              // Single file loop equivalent
              audioRef.current?.play();
            }
          } else if (repeatMode === 'all') {
            // Play All (No Repeat): Stop at end
            if (hasQueue) {
              if (currentTrackIndex < playlist.length - 1) {
                playNextSong();
              } else {
                setIsPlaying(false);
              }
            } else {
              setIsPlaying(false);
            }
          } else {
            // Off: Stop
            setIsPlaying(false);
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
        {renderConfig.backgroundSource === 'image' && renderConfig.backgroundImage && (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${renderConfig.backgroundImage})` }} />
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
        {(renderConfig.backgroundSource === 'timeline' || renderConfig.backgroundSource === 'custom') && metadata.coverUrl && visualSlides.length === 0 && (
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
              className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out ${renderConfig.backgroundSource === 'custom' || activeVisualSlides.length === 0 ? 'opacity-60' : 'opacity-0'}`}
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
        {!metadata.coverUrl && activeVisualSlides.length === 0 && (renderConfig.backgroundSource === 'timeline' || renderConfig.backgroundSource === 'custom') && visualSlides.length === 0 && (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-black opacity-80"></div>
        )}

        {/* 2. Slide Overlay */}
        <div className={`absolute inset-0 pointer-events-none ${renderConfig.backgroundSource === 'timeline' ? 'opacity-100' : 'opacity-0'}`}>
          {renderConfig.backgroundSource === 'timeline' && activeVisualSlides.map(slide => {
            // Check visibility
            const layer = slide.layer || 0;
            if (renderConfig.layerVisibility?.visual?.[layer] === false) return null;

            return (
              <div key={slide.id} className="absolute inset-0 flex items-center justify-center overflow-hidden">
                {slide.type === 'video' ? (
                  <video
                    id={`video-preview-${slide.id}`}
                    src={slide.url}
                    className="w-full h-full object-cover"
                    muted={slide.isMuted !== false}
                    playsInline
                  />
                ) : (
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${slide.url})` }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Blur / Dim Overlay */}
        {/* Blur / Dim Overlay */}
        <div
          className="absolute inset-0 bg-black/30 transition-all duration-700"
          style={{
            backdropFilter: (renderConfig.backgroundBlurStrength > 0) ? `blur(${renderConfig.backgroundBlurStrength}px)` : (isBlurEnabled ? 'blur(12px)' : 'none'),
            backgroundColor: (renderConfig.backgroundBlurStrength > 0 || isBlurEnabled) ? 'rgba(0,0,0,0.4)' : undefined
          }}
        ></div>
      </div>

      {/* --- Main Content Area --- */}
      <div className="relative z-10 flex-1 flex flex-col transition-all duration-500">

        {/* Channel Info Overlay */}
        {renderConfig.showChannelInfo && isMinimalMode && (
          <div
            className={`absolute z-[60] flex flex-col gap-2 p-6 pointer-events-none transition-all duration-500
              ${renderConfig.channelInfoPosition === 'top-left' ? 'top-0 left-0 items-start text-left' :
                renderConfig.channelInfoPosition === 'top-right' ? 'top-0 right-0 items-end text-right' :
                  renderConfig.channelInfoPosition === 'bottom-left' ? 'bottom-0 left-0 items-start text-left' :
                    'bottom-0 right-0 items-end text-right'}
            `}
            style={{
              transform: `scale(${renderConfig.channelInfoSizeScale ?? 1})`,
              transformOrigin: renderConfig.channelInfoPosition?.includes('top')
                ? (renderConfig.channelInfoPosition?.includes('left') ? 'top left' : 'top right') // Corners
                : (renderConfig.channelInfoPosition?.includes('left') ? 'bottom left' : 'bottom right'),
              // Smart Margin: If center (future proof), only vertical. If corner, all sides.
              ...(renderConfig.channelInfoPosition?.includes('center')
                ? (renderConfig.channelInfoPosition?.includes('top') ? { marginTop: `${(renderConfig.channelInfoMarginScale ?? 1) * 1.5}rem` } : { marginBottom: `${(renderConfig.channelInfoMarginScale ?? 1) * 1.5}rem` })
                : { margin: `${(renderConfig.channelInfoMarginScale ?? 1) * 1.5}rem` })
            }}
          >
            {renderConfig.channelInfoImage && (
              <img
                src={renderConfig.channelInfoImage}
                alt="Channel"
                className="w-20 h-20 object-contain drop-shadow-lg"
              />
            )}
            {renderConfig.channelInfoText && (
              <p className="text-white font-bold drop-shadow-md text-lg px-2 py-1 bg-black/20 rounded-lg backdrop-blur-sm">
                {renderConfig.channelInfoText}
              </p>
            )}
          </div>
        )}

        {/* Minimal Mode Song Info Overlay */}
        {isMinimalMode && (
          <div
            className={`absolute z-20 flex flex-col gap-2 p-6 transition-all duration-500 pointer-events-none
              ${isHeaderVisible ? 'opacity-100' : 'opacity-0'}
              ${renderConfig.infoPosition === 'top-left' ? 'top-0 left-0 items-start text-left' :
                renderConfig.infoPosition === 'top-right' ? 'top-0 right-0 items-end text-right' :
                  renderConfig.infoPosition === 'top-center' ? 'top-0 left-1/2 items-center text-center' :
                    renderConfig.infoPosition === 'bottom-left' ? 'bottom-0 left-0 items-start text-left' :
                      renderConfig.infoPosition === 'bottom-right' ? 'bottom-0 right-0 items-end text-right' :
                        renderConfig.infoPosition === 'bottom-center' ? 'bottom-0 left-1/2 items-center text-center' :
                          'top-0 left-0 items-start text-left'}
            `}
            style={{
              transform: `${renderConfig.infoPosition?.includes('center') ? 'translateX(-50%)' : ''} scale(${renderConfig.infoSizeScale ?? 1})`,
              transformOrigin: renderConfig.infoPosition?.includes('top')
                ? (renderConfig.infoPosition?.includes('center') ? 'top center' : renderConfig.infoPosition?.includes('right') ? 'top right' : 'top left')
                : (renderConfig.infoPosition?.includes('center') ? 'bottom center' : renderConfig.infoPosition?.includes('right') ? 'bottom right' : 'bottom left'),
              // Smart Margin for Minimal Mode:
              // For Center positions, we only want to push from the top/bottom edge, not shift horizontally (which standard margin does if not careful)
              // For Corner positions, margin on all sides acts as inset padding nicely.
              ...(renderConfig.infoPosition?.includes('center')
                ? (renderConfig.infoPosition?.includes('top') ? { marginTop: `${(renderConfig.infoMarginScale ?? 1) * 1.5}rem` } : { marginBottom: `${(renderConfig.infoMarginScale ?? 1) * 1.5}rem` })
                : { margin: `${(renderConfig.infoMarginScale ?? 1) * 1.5}rem` })
            }}
          >
            {/* Inner Content Wrapper to handle layout styles */}
            <div className={`
              flex items-center gap-4 pointer-events-auto
              ${renderConfig.infoPosition?.includes('center') ? 'flex-col justify-center' : ''}
              ${renderConfig.infoPosition?.includes('right') ? 'flex-row-reverse' : 'flex-row'}
              ${renderConfig.infoStyle === 'box' ? 'bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10' : ''}
              ${(renderConfig.infoStyle === 'modern' || renderConfig.infoStyle === 'minimal') ? '' : ''}
            `}>

              {/* Cover Art */}
              <div className={`relative group shrink-0 transition-opacity duration-300 
                ${!renderConfig.showCover || renderConfig.infoStyle === 'minimal' || renderConfig.infoStyle === 'modern' ? 'hidden' : 'block'}
                ${renderConfig.infoStyle === 'circle_art' ? 'rounded-full' : 'rounded-md'}
                overflow-hidden bg-zinc-800 shadow-lg border border-white/10
                w-12 h-12 md:w-16 md:h-16
              `}>
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

              {/* Text Info */}
              <div className={`flex flex-col justify-center ${renderConfig.infoPosition?.includes('right') ? 'items-end' : renderConfig.infoPosition?.includes('center') ? 'items-center' : 'items-start'}`}>
                {/* Title */}
                <h1 className={`font-bold text-white drop-shadow-md line-clamp-1 transition-opacity duration-300 
                  ${!renderConfig.showTitle ? 'opacity-0 h-0 w-0' : 'opacity-100'}
                  ${renderConfig.infoStyle === 'minimal' ? 'text-sm' : renderConfig.infoStyle === 'modern' || renderConfig.infoStyle === 'modern_art' ? 'text-xl' : 'text-lg'}
                `}>{metadata.title}</h1>

                {/* Artist */}
                <div className={`flex items-center gap-2 transition-opacity duration-300 
                  ${!renderConfig.showArtist ? 'opacity-0 h-0 w-0' : 'opacity-100'}
                `}>
                  <p className={`drop-shadow-md
                    ${renderConfig.infoStyle === 'minimal' ? 'text-zinc-400 text-[10px]' : (renderConfig.infoStyle === 'modern' || renderConfig.infoStyle === 'modern_art') ? 'text-white text-sm font-medium' : 'text-zinc-300 text-xs'}
                  `}>{metadata.artist}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Bar (Song Info) */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${(isHeaderVisible && !isMinimalMode) ? 'max-h-80 md:max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-4 md:p-6 flex flex-col md:flex-row justify-between items-start gap-4 md:gap-0">
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

            <div className={`flex gap-2 flex-wrap ${isMinimalMode ? 'hidden' : ''}`}>
              <a
                href="https://ai.studio/apps/drive/1M1VfxdBlNB_eOPQqQiHspvVwizaEs0aI?fullscreenApplet=true"
                target="_blank"
                rel="noopener noreferrer"
                title="LyricFlow - Turn Audio into Subtitles"
                className="px-3 py-2 rounded-full transition-colors bg-black/30 text-zinc-300 hover:bg-white/10 text-xs font-bold flex items-center"
              >
                LyricFlow
              </a>
              <a
                href="https://ai.studio/apps/drive/1WKA-bCxzIKD-DcI_pq0HzxN3m1_oNEkg?fullscreenApplet=true"
                target="_blank"
                rel="noopener noreferrer"
                title="LyricalVision - Visualize lyrics with Gemini AI"
                className="px-3 py-2 rounded-full transition-colors bg-black/30 text-zinc-300 hover:bg-white/10 text-xs font-bold flex items-center"
              >
                LyricalVision
              </a>
              <a
                href="https://ai.studio/apps/drive/1IQUhhLIAJ_dYYbcOLni-x8LLk7Py4SSX?fullscreenApplet=true"
                target="_blank"
                rel="noopener noreferrer"
                title="GeminiTranscription - Transcribe, Translate, and Compare Models"
                className="px-3 py-2 rounded-full transition-colors bg-black/30 text-zinc-300 hover:bg-white/10 text-xs font-bold flex items-center"
              >
                GeminiTranscription
              </a>
              <button
                onClick={() => setBypassAutoHide(!bypassAutoHide)}
                className={`p-2 rounded-full transition-colors ${bypassAutoHide ? 'bg-purple-600/50 text-white' : 'bg-black/30 text-zinc-300 hover:bg-white/10'}`}
                title="Bypass Auto-hide (H)"
              >
                {bypassAutoHide ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
              <button
                onClick={() => setIsMinimalMode(!isMinimalMode)}
                className={`p-2 rounded-full transition-colors ${isMinimalMode ? 'bg-purple-600 text-white' : 'bg-black/30 text-zinc-300 hover:bg-white/10'}`}
                title="Minimal Mode (O)"
              >
                {isMinimalMode ? <Maximize size={20} /> : <Minimize size={20} />}
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
                title="Render Settings (D)"
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
              className={`w-full max-w-5xl max-h-full overflow-y-auto no-scrollbar px-4 md:px-6 space-y-4 md:space-y-6 transition-all duration-500 lyrics-root ${renderConfig.textAlign === 'left' ? 'text-left' : renderConfig.textAlign === 'right' ? 'text-right' : 'text-center'
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
                // We exclude font-size, line-height, margin, padding, width, height.
                const transEffect = renderConfig.transitionEffect;
                let containerClass = 'transition-[color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter,text-shadow] duration-500 cursor-pointer whitespace-pre-wrap ';

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

                // Calculate text content with casing logic
                let textContent = line.text;
                const casing = renderConfig.textCase;

                if (casing === 'upper') {
                  textContent = textContent.toUpperCase();
                } else if (casing === 'lower') {
                  textContent = textContent.toLowerCase();
                } else if (casing === 'title') {
                  textContent = textContent.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
                } else if (casing === 'sentence') {
                  textContent = textContent.charAt(0).toUpperCase() + textContent.slice(1).toLowerCase();
                } else if (casing === 'invert') {
                  textContent = textContent.replace(/\w\S*/g, (txt) => txt.charAt(0).toLowerCase() + txt.slice(1).toUpperCase());
                }

                // Apply Typewriter effect if active
                if (isActive && renderConfig.textAnimation === 'typewriter') {
                  textContent = textContent.substring(0, Math.max(0, Math.floor((currentTime - line.time) * 35)));
                }

                // --- Highlight Effect Logic ---
                // If we have word-level data and exact highlight effect (e.g. Karaoke)
                // We render words individually.
                let contentRender: React.ReactNode = textContent;

                if (isActive && renderConfig.highlightEffect !== 'none') {
                  const hEffect = renderConfig.highlightEffect;
                  const hasWords = line.words && line.words.length > 0;

                  if ((hEffect === 'karaoke' || hEffect?.startsWith('karaoke-')) && hasWords) {
                    // Word-level Karaoke with variants
                    contentRender = line.words!
                      .filter(w => w.text.trim().length > 0)
                      .map((w, wIdx) => {
                        // Apply Casing to individual words
                        let wText = w.text.trim();
                        if (casing === 'upper') wText = wText.toUpperCase();
                        else if (casing === 'lower') wText = wText.toLowerCase();
                        else if (casing === 'title') wText = wText.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
                        else if (casing === 'sentence') {
                          const lower = wText.toLowerCase();
                          wText = (wIdx === 0) ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
                        }
                        else if (casing === 'invert') wText = wText.replace(/\w\S*/g, (txt) => txt.charAt(0).toLowerCase() + txt.slice(1).toUpperCase());

                        const wStart = w.startTime + lyricOffset;
                        const wEnd = w.endTime + lyricOffset;
                        const isWordActive = currentTime >= wStart && currentTime < wEnd;
                        const isWordPast = currentTime >= wEnd;

                        const hasSpace = wText.endsWith(' ');
                        const marginRight = hasSpace ? '0px' : '0.3em'; // Standard space width if missing
                        let wordStyle: React.CSSProperties = { display: 'inline-block', marginRight: marginRight, transition: 'all 0.1s ease' }; // Base style

                        // Apply Global Decoration
                        if (renderConfig.textDecoration && renderConfig.textDecoration !== 'none') {
                          wordStyle.textDecoration = renderConfig.textDecoration;
                        }

                        // Inactive/Future state defaults
                        if (!isWordActive && !isWordPast) {
                          wordStyle.opacity = 0.5;
                          wordStyle.transform = 'scale(1)';
                        } else if (isWordPast) {
                          if (hEffect === 'karaoke-fill') {
                            const hBg = renderConfig.highlightBackground || '#fb923c';
                            wordStyle.backgroundColor = hBg;
                            wordStyle.color = '#000';
                            wordStyle.padding = '2px 6px';
                            wordStyle.borderRadius = '4px';
                            wordStyle.opacity = 1;
                          } else {
                            wordStyle.color = preset === 'custom' ? renderConfig.fontColor : 'white';
                            wordStyle.opacity = 1;
                          }
                        }

                        // Active State Per Effect
                        if (isWordActive) {
                          const hColor = renderConfig.highlightColor || '#fb923c';
                          const hBg = renderConfig.highlightBackground || '#fb923c';

                          if (hEffect === 'karaoke' || hEffect === 'color') {
                            wordStyle.color = hColor;
                            wordStyle.textShadow = `0 0 10px ${hColor}`;
                          } else if (hEffect === 'karaoke-neon') {
                            wordStyle.color = '#fff';
                            wordStyle.textShadow = `0 0 5px #fff, 0 0 10px #fff, 0 0 20px ${hColor}, 0 0 35px ${hColor}`;
                          } else if (hEffect === 'karaoke-scale') {
                            wordStyle.color = hColor;
                            wordStyle.transform = 'scale(1.3)';
                          } else if (hEffect === 'karaoke-underline') {
                            wordStyle.color = hColor;
                            wordStyle.textDecoration = (wordStyle.textDecoration || '') + ' underline';
                            wordStyle.textDecorationColor = hColor;
                            wordStyle.textUnderlineOffset = '4px';
                          } else if (hEffect === 'karaoke-bounce') {
                            wordStyle.color = hColor;
                            wordStyle.transform = 'translateY(-10px)';
                          } else if (hEffect === 'karaoke-fill') {
                            wordStyle.backgroundColor = hBg;
                            wordStyle.color = '#000';
                            wordStyle.padding = '2px 6px';
                            wordStyle.borderRadius = '4px';
                          } else if (hEffect === 'karaoke-outline') {
                            wordStyle.color = 'transparent';
                            wordStyle.WebkitTextStroke = `2px ${hColor}`;
                          } else if (hEffect === 'karaoke-shadow') {
                            wordStyle.color = hColor;
                            wordStyle.textShadow = '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000';
                          } else if (hEffect === 'karaoke-gradient') {
                            wordStyle.background = `linear-gradient(90deg, ${hColor}, ${hBg})`;
                            wordStyle.WebkitBackgroundClip = 'text';
                            wordStyle.WebkitTextFillColor = 'transparent';
                          } else if (hEffect === 'karaoke-wave') {
                            wordStyle.color = hColor;
                            wordStyle.animation = 'bounce 0.3s ease infinite';
                          } else if (hEffect === 'karaoke-pill') {
                            wordStyle.backgroundColor = hBg;
                            wordStyle.color = '#000';
                            wordStyle.padding = '4px 16px';
                            wordStyle.borderRadius = '9999px';
                          } else if (hEffect === 'karaoke-box') {
                            wordStyle.backgroundColor = hBg;
                            wordStyle.color = '#000';
                            wordStyle.padding = '4px 8px';
                            wordStyle.borderRadius = '0';
                          } else if (hEffect === 'karaoke-rounded') {
                            wordStyle.backgroundColor = hBg;
                            wordStyle.color = '#000';
                            wordStyle.padding = '4px 12px';
                            wordStyle.padding = '4px 12px';
                            wordStyle.borderRadius = '12px';
                          } else if (hEffect === 'karaoke-glass') {
                            // Glass Effect
                            wordStyle.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                            wordStyle.color = '#fff';
                            wordStyle.padding = '4px 12px';
                            wordStyle.borderRadius = '8px';
                            wordStyle.backdropFilter = 'blur(4px)';
                            wordStyle.border = '1px solid rgba(255, 255, 255, 0.3)';
                            wordStyle.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                          } else if (hEffect === 'karaoke-neon-multi') {
                            wordStyle.color = '#fff';
                            wordStyle.textShadow = '0 0 5px #fff, 0 0 10px #fff, 0 0 20px #ff00de, 0 0 35px #00ffff, 0 0 40px #ff00de';
                          } else if (hEffect === 'karaoke-soft-glow') {
                            wordStyle.color = hColor;
                            wordStyle.textShadow = `0 0 5px ${hColor}, 0 0 15px ${hColor}, 0 0 30px ${hColor}`;
                          } else if (hEffect === 'karaoke-3d') {
                            wordStyle.textShadow = `1px 1px 0px #ccc, 2px 2px 0px #bbb, 3px 3px 0px #aaa, 4px 4px 0px rgba(0,0,0,0.5)`;
                          } else if (hEffect === 'karaoke-emboss') {
                            wordStyle.color = '#ebebeb';
                            wordStyle.textShadow = '1px 2px 3px rgba(255,255,255,0.8), -1px -2px 3px rgba(0,0,0,0.8)';
                          } else if (hEffect === 'karaoke-chrome') {
                            wordStyle.background = 'linear-gradient(to bottom, #ebebeb 50%, #616161 50%, #ebebeb)';
                            (wordStyle as any).WebkitBackgroundClip = 'text';
                            wordStyle.color = 'transparent';
                          } else if (hEffect === 'karaoke-gold') {
                            wordStyle.background = 'linear-gradient(to bottom, #d4af37, #C5A028)';
                            (wordStyle as any).WebkitBackgroundClip = 'text';
                            wordStyle.color = 'transparent';
                          } else if (hEffect === 'karaoke-fire') {
                            wordStyle.color = '#fff';
                            wordStyle.textShadow = '0 -5px 4px #FFC107, 2px -10px 6px #FF9800, -2px -15px 11px #FF5722, 2px -25px 18px #795548';
                          } else if (hEffect === 'karaoke-frozen') {
                            wordStyle.color = '#fff';
                            wordStyle.textShadow = '0 0 5px rgba(255,255,255,0.8), 0 0 10px rgba(255,255,255,0.5), 0 0 20px #03A9F4, 0 0 30px #03A9F4';
                          } else if (hEffect === 'karaoke-rainbow') {
                            wordStyle.background = 'linear-gradient(to left, violet, indigo, blue, green, yellow, orange, red)';
                            (wordStyle as any).WebkitBackgroundClip = 'text';
                            wordStyle.color = 'transparent';
                          } else if (hEffect === 'karaoke-mirror') {
                            wordStyle.transform = 'scaleY(1.3) perspective(500px) rotateX(-10deg)';
                            wordStyle.textShadow = '0 15px 5px rgba(0,0,0,0.1), 0 -1px 3px rgba(0,0,0,0.3)';
                          } else if (hEffect === 'karaoke-vhs') {
                            wordStyle.textShadow = '2px 0 0 rgba(255,0,0,0.7), -2px 0 0 rgba(0,0,255,0.7)';
                          } else if (hEffect === 'karaoke-retro') {
                            wordStyle.fontFamily = "'Press Start 2P', cursive";
                            wordStyle.color = '#ff00ff';
                            wordStyle.textShadow = '4px 4px 0px #00ffff';
                          } else if (hEffect === 'karaoke-cyberpunk') {
                            wordStyle.color = '#fcee0a';
                            wordStyle.textShadow = '2px 2px 0px #000, -1px -1px 0 #05d9e8';
                          } else if (hEffect === 'karaoke-hologram') {
                            wordStyle.color = 'rgba(0, 255, 255, 0.7)';
                            wordStyle.textShadow = '0 0 5px rgba(0,255,255,0.5)';
                          } else if (hEffect === 'karaoke-comic') {
                            wordStyle.fontFamily = "'Bangers', cursive";
                            wordStyle.color = '#ffcc00';
                            wordStyle.textShadow = '2px 2px 0px #000, -1px -1px 0 #000';
                          } else if (hEffect === 'karaoke-glitch-text') {
                            wordStyle.animation = 'anim-glitch 0.4s infinite linear';
                          } else if (hEffect === 'karaoke-pulse') {
                            wordStyle.animation = 'anim-pulse 1s infinite ease-in-out';
                          } else if (hEffect === 'karaoke-breathe') {
                            wordStyle.animation = 'anim-breathe 2s infinite ease-in-out';
                          } else if (hEffect === 'karaoke-float') {
                            wordStyle.animation = 'anim-float 2s infinite ease-in-out';
                          } else if (hEffect === 'karaoke-sway') {
                            wordStyle.animation = 'anim-sway 2s infinite ease-in-out';
                          } else if (hEffect === 'karaoke-flicker') {
                            wordStyle.animation = 'anim-flicker 2s infinite linear';
                          } else if (hEffect === 'karaoke-shake') {
                            wordStyle.animation = 'anim-shake 0.2s infinite linear';
                          } else if (hEffect === 'karaoke-wobble') {
                            wordStyle.animation = 'anim-wobble 1s infinite ease-in-out';
                          } else if (hEffect === 'karaoke-jello') {
                            wordStyle.animation = 'anim-jello 1s infinite';
                          } else if (hEffect === 'karaoke-rubberband') {
                            wordStyle.animation = 'anim-rubberband 1s infinite';
                          } else if (hEffect === 'karaoke-heartbeat') {
                            wordStyle.animation = 'anim-heartbeat 1.3s infinite ease-in-out';
                          } else if (hEffect === 'karaoke-flash') {
                            wordStyle.animation = 'anim-flash 1s infinite';
                          } else if (hEffect === 'karaoke-tada') {
                            wordStyle.animation = 'anim-tada 1s infinite';
                          } else if (hEffect === 'karaoke-swing') {
                            wordStyle.animation = 'anim-swing 2s infinite';
                          } else if (hEffect === 'karaoke-rotate') {
                            wordStyle.animation = 'anim-rotate 4s infinite linear';
                          } else if (hEffect === 'karaoke-spin') {
                            wordStyle.animation = 'anim-rotate 1s infinite linear';
                          } else if (hEffect === 'karaoke-glitch') {
                            wordStyle.animation = 'anim-glitch 0.3s infinite linear';
                          } else if (hEffect === 'karaoke-typewriter') {
                            // Web Preview Approximation using clip-path steps
                            wordStyle.animation = 'typewriter-reveal 0.5s steps(10, end) forwards';
                            wordStyle.whiteSpace = 'nowrap';
                            wordStyle.overflow = 'hidden';
                            wordStyle.display = 'inline-block';
                            wordStyle.verticalAlign = 'bottom';
                            // Note: steps(10) is an approximation since we don't know char count here easily without more logic.
                            // Ideally this would be dynamic style based on word length.
                          }
                          else if (hEffect === 'karaoke-fade') {
                            wordStyle.animation = 'trans-fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards';
                          } else if (hEffect === 'karaoke-slide') {
                            wordStyle.animation = 'trans-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';
                          } else if (hEffect === 'karaoke-drop') {
                            wordStyle.animation = 'trans-drop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
                          } else if (hEffect === 'karaoke-lightspeed') {
                            wordStyle.animation = 'trans-lightspeed-in 0.5s ease-out forwards';
                          } else if (hEffect === 'karaoke-roll') {
                            wordStyle.animation = 'trans-roll-in 0.5s ease-out forwards';
                          } else if (hEffect === 'karaoke-zoom') {
                            wordStyle.animation = 'trans-zoom-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
                          } else if (hEffect === 'karaoke-elastic') {
                            wordStyle.animation = 'trans-elastic-in 0.7s ease-out forwards';
                          } else if (hEffect === 'karaoke-scale-rotate') {
                            wordStyle.animation = 'trans-scale-rotate-in 0.5s ease-out forwards';
                          } else if (hEffect === 'karaoke-flip') {
                            wordStyle.animation = 'trans-flip-in 0.5s ease-out forwards';
                          } else if (hEffect === 'karaoke-rotate-in') {
                            wordStyle.animation = 'trans-rotate-in 0.5s ease-out forwards';
                          } else if (hEffect === 'karaoke-spiral') {
                            wordStyle.animation = 'trans-spiral-in 0.6s ease-out forwards';
                          } else if (hEffect === 'karaoke-blur') {
                            wordStyle.animation = 'trans-blur-in 0.4s ease-out forwards';
                          } else if (hEffect === 'karaoke-shatter') {
                            wordStyle.animation = 'trans-shatter-in 0.5s ease-out forwards';
                          }

                          // Handle legacy color names by mapping them to use the custom color if user wants, 
                          // or keep them hardcoded. For now, let's make them respect the custom color 
                          // effectively treating the preset name as just a "style" of effect but allowing color override.
                          // However, to keep it simple, I'll update the explicit color ones to use defaults BUT
                          // since the user now has a color picker, they probably want that color to apply everywhere.
                          // I will update the "karaoke-blue", "purple" etc to just be aliases for standard colored styling
                          // but using the user's SELECTED color if they changed it, or defaults if they didn't.
                          // actually, the prompt implies "pilihlah highlight effect ini untuk mengatur highlight font"
                          // so all effects should respect the color picker.

                          else if (['karaoke-blue', 'karaoke-purple', 'karaoke-green', 'karaoke-pink', 'karaoke-cyan', 'karaoke-glow-blue', 'karaoke-glow-pink'].includes(hEffect || '')) {
                            wordStyle.color = hColor;
                            wordStyle.textShadow = `0 0 10px ${hColor}`;
                            if (hEffect?.includes('glow')) {
                              wordStyle.textShadow = `0 0 5px ${hColor}, 0 0 15px ${hColor}, 0 0 30px ${hColor}`;
                            }
                          }
                        }

                        return (
                          <span key={wIdx} className="inline-block" style={wordStyle}>
                            {wText}
                          </span>
                        );
                      });
                  } else if (hEffect === 'karaoke' || hEffect?.startsWith('karaoke-')) {
                    // Fallback Karaoke (Line Fill)
                    const hColor = renderConfig.highlightColor || '#fb923c';
                    const hBg = renderConfig.highlightBackground || '#fb923c';

                    textEffectStyles.color = hColor;

                    if (hEffect === 'karaoke-neon') textEffectStyles.textShadow = `0 0 10px ${hColor}, 0 0 20px ${hColor}`; // Simplify fallback neon
                    if (hEffect === 'karaoke-scale') textEffectStyles.transform = (textEffectStyles.transform || '') + ' scale(1.1)';
                    if (hEffect === 'karaoke-underline') textEffectStyles.textDecoration = 'underline';
                    if (hEffect === 'karaoke-bounce') textEffectStyles.transform = (textEffectStyles.transform || '') + ' translateY(-5px)';
                    if (hEffect === 'karaoke-fill') { textEffectStyles.backgroundColor = hBg; textEffectStyles.color = '#000'; textEffectStyles.padding = '4px 12px'; textEffectStyles.borderRadius = '6px'; }
                    if (hEffect === 'karaoke-outline') { textEffectStyles.color = 'transparent'; (textEffectStyles as any).WebkitTextStroke = `2px ${hColor}`; }
                    if (hEffect === 'karaoke-shadow') textEffectStyles.textShadow = `3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000`;
                    if (hEffect === 'karaoke-gradient') { textEffectStyles.background = `linear-gradient(90deg, ${hColor}, ${hBg})`; (textEffectStyles as any).WebkitBackgroundClip = 'text'; (textEffectStyles as any).WebkitTextFillColor = 'transparent'; }

                    if (['karaoke-pill', 'karaoke-box', 'karaoke-rounded'].includes(hEffect!)) {
                      textEffectStyles.backgroundColor = hBg;
                      textEffectStyles.color = '#000';
                      textEffectStyles.padding = '4px 16px';
                      textEffectStyles.borderRadius = hEffect === 'karaoke-pill' ? '9999px' : hEffect === 'karaoke-rounded' ? '12px' : '0';
                    }
                    if (hEffect?.includes('glow')) {
                      textEffectStyles.textShadow = `0 0 10px ${hColor}, 0 0 20px ${hColor}`;
                    }

                  } else if (hEffect === 'scale') {
                    textEffectStyles.color = renderConfig.highlightColor || '#fb923c';
                  } else if (renderConfig.highlightEffect === 'background') {
                    textEffectStyles.backgroundColor = (renderConfig.highlightBackground || '#fb923c') + '4D'; // 30% alpha roughly
                    textEffectStyles.padding = '0 10px';
                    textEffectStyles.borderRadius = '8px';
                  }
                }

                return (
                  <p
                    key={idx}
                    data-lyric-active={isActive ? "true" : "false"}
                    className={`${containerClass} ${isActive ? activeClass : inactiveClass} ${isActive && renderConfig.textAnimation !== 'none' && renderConfig.textAnimation !== 'typewriter' ? `text-anim-${renderConfig.textAnimation}` : ''}`}
                    style={textEffectStyles}
                    onClick={() => {
                      if (isActive) {
                        navigator.clipboard.writeText(line.text);
                        toast.success('Lyric copied to clipboard', 1500);
                      }
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
                    {contentRender}
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
                      <input type="file" accept=".lrc,.srt,.ttml,.xml" className="hidden" onChange={handleLyricsUpload} disabled={isRendering} />
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
                    title={`Repeat: ${repeatMode === 'off' ? 'Off' : repeatMode === 'one' ? 'One' : repeatMode === 'all' ? 'Play All (No Repeat)' : 'Loop All'} (R)`}
                    disabled={isRendering}
                  >
                    {repeatMode === 'one' && <Repeat1 size={20} />}
                    {repeatMode === 'all_repeat' && <Repeat size={20} />}
                    {repeatMode === 'all' && <ListMusic size={20} />}
                    {repeatMode === 'off' && <Repeat size={20} className="opacity-50" />}
                  </button>


                </div>

                <div className="flex items-center gap-1 justify-center lg:justify-end group flex-wrap order-3 lg:order-none w-auto lg:w-full">

                  <div className="flex items-center gap-1">
                    {/* Background Blur Toggle */}
                    <button
                      onClick={() => setRenderConfig(prev => ({ ...prev, backgroundBlurStrength: prev.backgroundBlurStrength > 0 ? 0 : 12 }))}
                      className={`bg-zinc-800/50 border border-white/5 text-[10px] font-mono rounded-lg px-2 h-9 transition-colors disabled:opacity-30 ${isBlurEnabled ? 'text-purple-400 border-purple-500/50' : 'text-zinc-300 hover:text-white'}`}
                      title={`Background Blur: ${isBlurEnabled ? 'On' : 'Off'}`}
                      disabled={isRendering}
                    >
                      {isBlurEnabled ? 'BLUR' : 'SHARP'}
                    </button>
                    {/* Highlight Toggle */}
                    <button
                      onClick={() => setRenderConfig(prev => ({ ...prev, highlightEffect: prev.highlightEffect === 'none' ? 'karaoke' : 'none' }))}
                      className={`p-2 rounded-full transition-all ${renderConfig.highlightEffect !== 'none' ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 'hover:bg-zinc-800 text-zinc-400'}`}
                      title="Toggle Lyric Highlight"
                    >
                      <Type size={20} />
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
                  {/* FPS Selection (Hidden) */}
                  {/* <div className="relative group">
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
                  </div> */}

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
              onRemoveTrack={(index) => {
                if (index === currentTrackIndex) {
                  stopPlayback();
                  setAudioSrc(null);
                  setLyrics([]);
                  setCurrentTrackIndex(-1);
                  setMetadata({ title: 'No Audio Loaded', artist: 'Select a file', coverUrl: null, backgroundType: 'image' });
                } else if (index < currentTrackIndex) {
                  setCurrentTrackIndex(prev => prev - 1);
                }
                setPlaylist(prev => {
                  const newList = [...prev];
                  newList.splice(index, 1);
                  return newList;
                });
              }}
              onClose={() => setIsPlaylistMode(false)}
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
                onClose={() => setActiveTab(TabView.PLAYER)}
                renderConfig={renderConfig}
                setRenderConfig={setRenderConfig}
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
          hasPlaylist={playlist.length > 0}
          onRender={handleExportVideo}
          customFontName={customFontName}
          onFontUpload={handleFontUpload}
          onClearCustomFont={() => setCustomFontName(null)}
          resolution={resolution}
          setResolution={setResolution}
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          renderCodec={renderCodec}
          setRenderCodec={setRenderCodec}
          supportedCodecs={supportedCodecs}
          renderQuality={renderQuality}
          setRenderQuality={setRenderQuality}
          renderFps={renderFps}
          setRenderFps={setRenderFps}
        />
      )}
    </div >
  );
}

export default App;