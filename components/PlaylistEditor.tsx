import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { PlaylistItem, LyricLine } from '../types';
import { Plus, Trash2, Play, Pause, Volume2, FileText, ListMusic, Shuffle, User, Disc, Music, X, Sparkles, Loader2, FileJson, FileType, FileDown, Key, Upload, Square, Search, Folder } from './Icons';
import { formatTime, parseLRC, parseSRT, parseTTML, parseTimestamp, parseJSON, parseVTT } from '../utils/parsers';
import { useUI } from '../contexts/UIContext';
import { transcribeAudio } from '../services/geminiService';

interface PlaylistEditorProps {
    playlist: PlaylistItem[];
    setPlaylist: React.Dispatch<React.SetStateAction<PlaylistItem[]>>;
    currentTrackIndex: number;
    setCurrentTrackIndex: React.Dispatch<React.SetStateAction<number>>;
    onPlayTrack: (index: number, autoPlay?: boolean, playlistOverride?: PlaylistItem[]) => void;
    isPlaying: boolean;
    onTogglePlay: () => void;
    onSeek: (time: number) => void;
    onClearPlaylist: () => void;
    onRemoveTrack?: (index: number) => void;

    currentTime: number;
    onClose: () => void;
}

const PlaylistEditor: React.FC<PlaylistEditorProps> = ({ playlist, setPlaylist, currentTrackIndex, setCurrentTrackIndex, onPlayTrack, isPlaying, onTogglePlay, onSeek, onClearPlaylist, onRemoveTrack, currentTime, onClose }) => {
    const { confirm } = useUI();
    const containerRef = useRef<HTMLDivElement>(null);
    const abortControllersRef = useRef<Map<string, AbortController>>(new Map());


    const formatLrcTimeDisplay = (sec: number) => {
        const mins = Math.floor(sec / 60).toString().padStart(2, '0');
        const secs = (sec % 60).toFixed(2).padStart(5, '0');
        return `[${mins}:${secs}]`;
    };
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
    const [transcribingIds, setTranscribingIds] = useState<Set<string>>(new Set());
    const [searchingIds, setSearchingIds] = useState<Set<string>>(new Set());
    const [apiKey, setApiKey] = useState<string>(localStorage.getItem('gemini_api_key') || '');
    const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
    const [transcriptionGranularity, setTranscriptionGranularity] = useState<'line' | 'word'>('line');
    const [showApiKeyInput, setShowApiKeyInput] = useState(false);

    const lyricFileInputRef = useRef<HTMLInputElement>(null);
    const [manualLyricTargetId, setManualLyricTargetId] = useState<string | null>(null);

    useEffect(() => {
        if (apiKey) {
            localStorage.setItem('gemini_api_key', apiKey);
        }
    }, [apiKey]);


    const currentItem = currentTrackIndex >= 0 ? playlist[currentTrackIndex] : null;
    const currentLyrics = currentItem?.parsedLyrics || [];

    const activeLyricIndex = useMemo(() => {
        if (!currentItem) return -1;
        return currentLyrics.findIndex((l, i) => {
            if (l.endTime !== undefined) {
                return currentTime >= l.time && currentTime < l.endTime;
            }
            const next = currentLyrics[i + 1];
            return currentTime >= l.time && (!next || currentTime < next.time);
        });
    }, [currentTime, currentItem, currentLyrics]);

    useEffect(() => {
        if (activeLyricIndex !== -1) {
            const activeEl = document.getElementById(`lyric-active-${currentTrackIndex}`);
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
            }
        }
    }, [activeLyricIndex, currentTrackIndex]);

    const handleSort = (type: 'filename' | 'artist' | 'title' | 'album' | 'random') => {
        if (playlist.length === 0) return;

        // Keep track of current playing item to update index
        const currentItem = currentTrackIndex >= 0 ? playlist[currentTrackIndex] : null;

        const sorted = [...playlist];
        let direction: 'asc' | 'desc' = 'asc';

        if (type === 'random') {
            setSortConfig({ key: 'random', direction: 'asc' });
            for (let i = sorted.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
            }
        } else {
            // Toggle direction if clicking same key
            if (sortConfig.key === type && sortConfig.direction === 'asc') {
                direction = 'desc';
            }
            setSortConfig({ key: type, direction });

            const multiplier = direction === 'asc' ? 1 : -1;

            if (type === 'filename') {
                sorted.sort((a, b) => multiplier * a.audioFile.name.localeCompare(b.audioFile.name));
            } else if (type === 'artist') {
                sorted.sort((a, b) => multiplier * (a.metadata.artist || '').localeCompare(b.metadata.artist || ''));
            } else if (type === 'title') {
                sorted.sort((a, b) => multiplier * (a.metadata.title || '').localeCompare(b.metadata.title || ''));
            } else if (type === 'album') {
                sorted.sort((a, b) => multiplier * (a.metadata.album || '').localeCompare(b.metadata.album || ''));
            }
        }

        setPlaylist(sorted);

        // Restore index for the currently playing song
        if (currentItem) {
            const newIndex = sorted.findIndex(i => i.id === currentItem.id);
            // If track found, update index. If not found (shouldn't happen), do nothing or reset.
            if (newIndex !== -1) setCurrentTrackIndex(newIndex);
        }
    };



    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (selectedIndex !== null && e.key === 'Delete') {
            e.preventDefault();
            e.stopPropagation();
            if (onRemoveTrack) {
                onRemoveTrack(selectedIndex);
            } else {
                setPlaylist(prev => {
                    const newList = [...prev];
                    newList.splice(selectedIndex, 1);
                    return newList;
                });
            }
            // Adjust selection after deletion
            if (selectedIndex >= playlist.length - 1) {
                setSelectedIndex(playlist.length > 1 ? playlist.length - 2 : null);
            }
        } else if (e.key === 'ArrowDown' && playlist.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            setSelectedIndex(prev => prev === null ? 0 : Math.min(prev + 1, playlist.length - 1));
        } else if (e.key === 'ArrowUp' && playlist.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            setSelectedIndex(prev => prev === null ? 0 : Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && selectedIndex !== null) {
            e.preventDefault();
            e.stopPropagation();
            onPlayTrack(selectedIndex);
        } else if (e.key === 'Escape') {
            setSelectedIndex(null);
        }
    }, [selectedIndex, playlist.length, setPlaylist, onPlayTrack]);

    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.addEventListener('keydown', handleKeyDown);
            return () => container.removeEventListener('keydown', handleKeyDown);
        }
    }, [handleKeyDown]);

    // Reset selection if playlist shrinks
    useEffect(() => {
        if (selectedIndex !== null && selectedIndex >= playlist.length) {
            setSelectedIndex(playlist.length > 0 ? playlist.length - 1 : null);
        }
    }, [playlist.length, selectedIndex]);

    const processFiles = async (files: File[]) => {
        const fileGroups = new Map<string, { audio?: File; lyric?: File }>();

        files.forEach(file => {
            const ext = file.name.split('.').pop()?.toLowerCase();
            // @ts-ignore
            const path = file.webkitRelativePath || file.name;
            const basename = path.replace(/\.[^/.]+$/, "");

            if (!fileGroups.has(basename)) {
                fileGroups.set(basename, {});
            }
            const group = fileGroups.get(basename)!;

            // Simple extension check
            if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'mp4', 'webm', 'ogg', 'mkv', 'mov', 'avi', 'm4v'].includes(ext || '')) {
                group.audio = file;
            } else if (['lrc', 'srt', 'ttml', 'xml', 'json', 'vtt'].includes(ext || '')) {
                group.lyric = file;
            }
        });

        const newItems: PlaylistItem[] = [];


        const extractMetadata = async (file: File, fallbackTitle: string): Promise<{ title: string; artist: string; album?: string; coverUrl: string | null; backgroundType?: 'image' | 'video' }> => {
            return new Promise((resolve) => {
                if (file.type.startsWith('video/')) {
                    resolve({
                        title: fallbackTitle,
                        artist: 'Unknown Artist',
                        coverUrl: URL.createObjectURL(file),
                        backgroundType: 'video'
                    });
                    return;
                }

                // @ts-ignore
                import('jsmediatags/dist/jsmediatags.min.js').then((jsmediatags) => {
                    jsmediatags.read(file, {
                        onSuccess: (tag: any) => {
                            const { title, artist, album, picture } = tag.tags;
                            let coverUrl: string | null = null;
                            if (picture) {
                                const { data, format } = picture;
                                let base64String = "";
                                for (let i = 0; i < data.length; i++) {
                                    base64String += String.fromCharCode(data[i]);
                                }
                                coverUrl = `data:${format};base64,${window.btoa(base64String)}`;
                            }
                            resolve({
                                title: title || fallbackTitle,
                                artist: artist || 'Unknown Artist',
                                album: album || undefined,
                                coverUrl
                            });
                        },
                        onError: () => {
                            resolve({
                                title: fallbackTitle,
                                artist: 'Unknown Artist',
                                coverUrl: null
                            });
                        }
                    });
                }).catch(() => {
                    resolve({
                        title: fallbackTitle,
                        artist: 'Unknown Artist',
                        coverUrl: null
                    });
                });
            });
        };


        const parseLyrics = async (file: File): Promise<LyricLine[]> => {
            try {
                const text = await file.text();
                const ext = file.name.split('.').pop()?.toLowerCase();
                if (ext === 'lrc') return parseLRC(text);
                if (ext === 'srt') return parseSRT(text);
                if (ext === 'ttml' || ext === 'xml') return parseTTML(text);
                if (ext === 'vtt') return parseVTT(text);
                if (ext === 'json') return parseJSON(text);
            } catch (e) {
                console.error("Failed to parse lyrics", e);
            }
            return [];
        };


        for (const [basename, group] of fileGroups.entries()) {
            if (group.audio) {
                const metadata = await extractMetadata(group.audio, basename);
                const id = Math.random().toString(36).substr(2, 9);

                // Parse lyrics if available
                let itemParsedLyrics: LyricLine[] = [];
                if (group.lyric) {
                    itemParsedLyrics = await parseLyrics(group.lyric);
                }

                newItems.push({
                    id,
                    audioFile: group.audio,
                    lyricFile: group.lyric,
                    parsedLyrics: itemParsedLyrics,
                    metadata,
                    duration: 0 // Will be known when played
                });
            }
        }

        if (newItems.length > 0) {
            const updatedPlaylist = [...playlist, ...newItems];
            setPlaylist(updatedPlaylist);
            // Automatically load the first track of the playlist (index 0)
            // Use overwrite params to ensure it uses the new list and doesn't auto-play
            onPlayTrack(0, false, updatedPlaylist);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files) as File[];
            await processFiles(files);
            // Allow re-upload
            e.target.value = '';
        }
    };


    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files) as File[];
            await processFiles(files);
        }
    };

    const removeTrack = (index: number) => {
        if (onRemoveTrack) {
            onRemoveTrack(index);
        } else {
            setPlaylist(prev => {
                const newList = [...prev];
                newList.splice(index, 1);
                return newList;
            });
        }
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64String = (reader.result as string).split(',')[1];
                resolve(base64String);
            };
            reader.onerror = error => reject(error);
        });
    };

    const handleTranscribe = async (item: PlaylistItem) => {

        if (!navigator.onLine) {
            alert("Unable to transcribe: No internet connection.");
            return;
        }


        if (transcribingIds.has(item.id)) {
            const controller = abortControllersRef.current.get(item.id);
            if (controller) {
                controller.abort();
            }
            return;
        }

        // Validate API Key before starting to prevent "stuck loading" state
        // Try to get key from state, or process.env (defined in vite.config.ts)
        const keyToUse = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY || '';

        // Simple validation for API Key length (approx 39 chars for Gemini)
        if (!keyToUse || keyToUse.trim().length !== 39) {
            if (!keyToUse) {
                alert("Please set your Gemini API Key first!");
            } else {
                alert(`Invalid API Key length (${keyToUse.trim().length}). It must be exactly 39 characters.`);
            }
            setShowApiKeyInput(true);
            return;
        }

        setTranscribingIds(prev => new Set(prev).add(item.id));
        const controller = new AbortController();
        abortControllersRef.current.set(item.id, controller);


        const MAX_SIZE_BYTES = 19.5 * 1024 * 1024; // slightly under 20MB for safety
        if (item.audioFile.size > MAX_SIZE_BYTES) {
            alert(`File is too large (${(item.audioFile.size / 1024 / 1024).toFixed(1)}MB). Gemini inline audio limit is ~20MB.\n\nPlease convert to MP3/M4A or use a smaller file.`);
            setTranscribingIds(prev => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
            });
            abortControllersRef.current.delete(item.id);
            return;
        }

        try {
            const base64Data = await fileToBase64(item.audioFile);

            // Get duration to validate timestamps if not already known
            let duration = item.duration || 0;
            if (duration === 0) {
                try {
                    duration = await new Promise<number>((resolve) => {
                        const audio = new Audio(URL.createObjectURL(item.audioFile));
                        audio.onloadedmetadata = () => {
                            resolve(audio.duration);
                            URL.revokeObjectURL(audio.src);
                        };
                        audio.onerror = () => {
                            URL.revokeObjectURL(audio.src); // cleanup
                            resolve(0);
                        };
                    });
                } catch (e) {
                    console.warn("Could not determine duration for AI validation", e);
                }
            }

            // Use service
            const segments = await transcribeAudio(
                selectedModel,
                base64Data,
                item.audioFile.type,
                keyToUse,
                controller.signal,
                transcriptionGranularity
            );

            let transcribedLyrics: LyricLine[] = segments.map(s => ({
                time: parseTimestamp(s.startTime),
                text: s.text,
                endTime: parseTimestamp(s.endTime),
                words: s.words ? s.words.map(w => ({
                    text: w.text,
                    startTime: parseTimestamp(w.startTime),
                    endTime: parseTimestamp(w.endTime)
                })) : undefined
            }));

            // Filter out lyrics beyond duration
            if (duration > 0) {
                transcribedLyrics = transcribedLyrics.filter(l => l.time < duration && l.time >= 0);
            }

            setPlaylist(prev => prev.map(p =>
                p.id === item.id ? {
                    ...p,
                    parsedLyrics: transcribedLyrics.sort((a, b) => a.time - b.time),
                    duration: duration > 0 ? duration : p.duration
                } : p
            ));
        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log("Transcription aborted via user action.");
            } else {
                console.error("Transcription failed:", err);

                let errorMsg = "Transcription failed. Please check your API key or file format.";

                if (!navigator.onLine) {
                    errorMsg = "Connection lost. Please check your internet connection.";
                } else if (err.message) {
                    const lowerMsg = err.message.toLowerCase();
                    if (lowerMsg.includes('fetch') || lowerMsg.includes('network') || lowerMsg.includes('failed to connect')) {
                        errorMsg = "Network error. Please check your connection.";
                    } else if (lowerMsg.includes('api key') || err.message.includes('400') || err.message.includes('401') || err.message.includes('403')) {
                        errorMsg = "API Key Error: Please check if your key is valid and has credits.";
                    }
                }

                alert(errorMsg);
            }
        } finally {
            abortControllersRef.current.delete(item.id);
            setTranscribingIds(prev => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
            });
        }
    };

    const handleSearchLyrics = async (item: PlaylistItem) => {
        if (!navigator.onLine) {
            alert("No internet connection.");
            return;
        }

        setSearchingIds(prev => new Set(prev).add(item.id));

        try {

            // @ts-ignore
            const module = await import('@stef-0012/synclyrics');

            let searchFn: (opts: any) => Promise<string | null>;
            const Mod = (module.default || module) as any;

            console.log("SyncLyrics Module:", module);

            const sourcesOption = ["musixmatch", "lrclib", "netease"];

            // Determine if it's a Class, Instance, or Function
            if (typeof Mod === 'function' && Mod.prototype && Mod.prototype.getLyrics) {
                // Class usage
                console.log("Detected Class usage");
                const instance = new Mod({ sources: sourcesOption });
                searchFn = (opts) => instance.getLyrics(opts);
            } else if (Mod.getLyrics && typeof Mod.getLyrics === 'function') {
                // Instance usage
                console.log("Detected Instance usage");
                // If Mod is already an instance, we might not be able to re-configure sources unless there's a setSources method.
                // But we can check if it takes options in getLyrics or if we can re-instantiate if it exposes the class.
                searchFn = (opts) => Mod.getLyrics(opts);
            } else if (Mod.SyncLyrics) {
                // Named export usage
                console.log("Detected Mod.SyncLyrics export");
                const SL = Mod.SyncLyrics;
                if (typeof SL === 'function' && SL.prototype && SL.prototype.getLyrics) {
                    console.log("Using SyncLyrics as Class");
                    const instance = new SL({ sources: sourcesOption });
                    searchFn = (opts) => instance.getLyrics(opts);
                } else if (typeof SL === 'function') {
                    console.log("Using SyncLyrics as Function");
                    searchFn = SL;
                } else {
                    throw new Error("Mod.SyncLyrics found but is not a function or class.");
                }
            } else if (typeof Mod === 'function') {
                // Direct function usage
                console.log("Detected Function usage");
                searchFn = Mod;
            } else {
                throw new Error(`Could not find suitable search function. Mod type: ${typeof Mod}. Keys: ${typeof Mod === 'object' ? JSON.stringify(Object.keys(Mod)) : 'N/A'}`);
            }

            const searchOptions = {
                track: item.metadata.title,
                artist: item.metadata.artist,
                album: item.metadata.album,
                // Some versions of synclyrics might take sources here too?
                // But normally it's constructor. 
                // We'll pass it here just in case the flexible API supports it.
                sources: sourcesOption
            };
            console.log("Searching lyrics with options:", searchOptions);

            const result = await searchFn(searchOptions);

            if (result && typeof result === 'string') {
                processResult(result, item);
            } else {
                console.warn("npm package returned no result. Attempting fallback to LrcLib.net API directly...");

                // Get duration for better matching
                let duration = item.duration || 0;
                if (duration === 0) {
                    try {
                        duration = await new Promise<number>((resolve) => {
                            const audio = new Audio(URL.createObjectURL(item.audioFile));
                            audio.onloadedmetadata = () => {
                                const d = audio.duration;
                                URL.revokeObjectURL(audio.src);
                                resolve(d);
                            };
                            audio.onerror = () => resolve(0);
                        });
                    } catch (e) {
                        console.warn("Could not determine duration for search", e);
                    }
                }

                const params = new URLSearchParams({
                    artist_name: item.metadata.artist,
                    track_name: item.metadata.title,
                    album_name: item.metadata.album || '',
                    duration: duration.toString()
                });

                const response = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
                if (!response.ok) {
                    // Try search endpoint if exact get fails
                    const searchResponse = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(item.metadata.title + ' ' + item.metadata.artist)}`);
                    if (searchResponse.ok) {
                        const searchData = await searchResponse.json();
                        // Find best match with duration if possible
                        if (Array.isArray(searchData) && searchData.length > 0) {

                            const best = searchData.find((t: any) => t.syncedLyrics);
                            if (best) {
                                processResult(best.syncedLyrics, item);
                                return;
                            } else if (searchData[0].plainLyrics) {
                                processResult(searchData[0].plainLyrics, item);
                                return;
                            }
                        }
                    }

                    throw new Error("No lyrics found in fallback source.");
                }

                const data = await response.json();
                if (data.syncedLyrics) {
                    processResult(data.syncedLyrics, item);
                } else if (data.plainLyrics) {
                    processResult(data.plainLyrics, item);
                } else {
                    alert("No lyrics found.");
                }
            }

        } catch (err: any) {
            console.error("Search failed:", err);
            if (err.message?.includes("CORS") || err.message?.includes("etwork") || err.message?.includes("Failed to fetch")) {
                alert("Network Error: Could not connect to lyric services. \n(Possible CORS blocking in browser).");
            } else {
                alert("Search failed: " + err.message);
            }
        } finally {
            setSearchingIds(prev => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
            });
        }
    };

    const processResult = (content: string, targetItem: PlaylistItem) => {
        let parsed = parseLRC(content);
        // If standard LRC empty, try SRT
        if (parsed.length === 0) parsed = parseSRT(content);

        if (parsed.length > 0) {
            // Check if we got word-level lyrics
            const hasWordLevel = parsed.some(l => l.words && l.words.length > 0);
            if (hasWordLevel) {
                console.log("Word-level (enhanced) lyrics found!");
            } else {
                console.log("Line-level lyrics found.");
            }

            setPlaylist(prev => prev.map(p =>
                p.id === targetItem.id ? {
                    ...p,
                    parsedLyrics: parsed,
                    lyricFile: new File([content], `synched-lyrics${hasWordLevel ? '.lrc-enhanced' : '.lrc'}`, { type: 'text/plain' })
                } : p
            ));
        } else {
            alert("Lyrics found but could not be parsed.");
        }
    };

    const downloadFile = (content: string, filename: string, mimeType: string) => {
        const blob = new Blob([content], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const exportLyrics = async (item: PlaylistItem, format: 'txt' | 'json' | 'srt' | 'lrc' | 'lrc-enhanced' | 'ttml' | 'vtt') => {
        const rawLyrics = item.parsedLyrics || [];
        if (rawLyrics.length === 0) return;

        let content = "";
        const ext = format === 'lrc-enhanced' ? 'lrc' : format;
        const filename = `${item.metadata.title || 'lyrics'}.${ext}`;

        // Get duration if missing
        let duration = item.duration || 0;
        if (duration === 0) {
            try {
                duration = await new Promise<number>((resolve) => {
                    const audio = new Audio(URL.createObjectURL(item.audioFile));
                    audio.onloadedmetadata = () => {
                        resolve(audio.duration);
                        URL.revokeObjectURL(audio.src);
                    };
                    audio.onerror = () => resolve(0);
                });
            } catch (e) {
                console.warn("Could not determine duration for export check", e);
            }
        }

        // --- Pre-process Timestamps (Infer missing end times) ---
        // Create a deep copy to avoid mutating the original playlist item state
        // AND FILTER out whitespace-only words early so they don't break the timestamp chain.
        // This ensures "Word A" connects directly to "Word B", ignoring "Space" in between.
        const processedLyrics = rawLyrics.map(l => ({
            ...l,
            words: l.words ? l.words.filter(w => w.text.trim().length > 0).map(w => ({ ...w })) : undefined
        }));

        for (let i = 0; i < processedLyrics.length; i++) {
            const line = processedLyrics[i];
            const nextLine = processedLyrics[i + 1];

            // Infer Line End Time if missing
            if (line.endTime === undefined) {
                if (nextLine) {
                    line.endTime = nextLine.time;
                } else {
                    // Last line: use audio duration
                    line.endTime = duration > 0 ? duration : line.time + 5;
                }
            }

            // Infer Word End Times if missing
            if (line.words && line.words.length > 0) {
                for (let j = 0; j < line.words.length; j++) {
                    const word = line.words[j];
                    const nextWord = line.words[j + 1];

                    // Check if end time is missing or invalid (<= start time)
                    // We assume that if parsed from simple LRC, word.endTime might be 0 or equal to startTime
                    if (word.endTime === undefined || word.endTime <= word.startTime) {
                        if (nextWord) {
                            word.endTime = nextWord.startTime;
                        } else {
                            // Last word uses line end time
                            word.endTime = line.endTime;
                        }
                    }
                }
            }
        }

        if (format === 'txt') {
            content = processedLyrics.map(l => l.text).join("\n");
        } else if (format === 'json') {
            content = JSON.stringify(processedLyrics, null, 2);
        } else if (format === 'srt') {
            // SRT Format: HH:MM:SS,mmm
            const toSrtTime = (sec: number) => {
                const hrs = Math.floor(sec / 3600).toString().padStart(2, '0');
                const mins = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
                const secs = Math.floor(sec % 60).toString().padStart(2, '0');
                const ms = Math.floor((sec % 1) * 1000).toString().padStart(3, '0');
                return `${hrs}:${mins}:${secs},${ms}`;
            };

            content = processedLyrics.map((l, i) => {
                const start = toSrtTime(l.time);
                // Ensure end is > start
                const endVal = (l.endTime !== undefined && l.endTime > l.time) ? l.endTime : l.time + 2;
                const end = toSrtTime(endVal);
                return `${i + 1}\n${start} --> ${end}\n${l.text}\n`;
            }).join("\n");

        } else if (format === 'lrc') {
            // LRC: Standard export (keeps original blank line logic for compatibility)
            // We use rawLyrics or processedLyrics - processed has better endTime but LRC format is special.
            // We'll stick closely to the original logic for LRC to ensure existing behavior is preserved.
            const lrcLines: string[] = [];

            const formatLrcTime = (sec: number) => {
                const mins = Math.floor(sec / 60).toString().padStart(2, '0');
                const secs = (sec % 60).toFixed(2).padStart(5, '0');
                return `[${mins}:${secs}]`;
            };

            for (let i = 0; i < rawLyrics.length; i++) {
                const current = rawLyrics[i];
                const next = rawLyrics[i + 1];

                lrcLines.push(`${formatLrcTime(current.time)}${current.text.replace(/-\s+/g, '-').replace(/[ \t]+/g, ' ').trim().replace(/\n/g, '\\n')}`);

                const endTime = current.endTime ?? (current.time + 3);
                const blankTime = endTime + 4;
                const isWithinDuration = duration > 0 ? blankTime <= duration : true;

                if (isWithinDuration) {
                    if (next) {
                        if (next.time > blankTime) {
                            lrcLines.push(`${formatLrcTime(blankTime)}`);
                        }
                    } else {
                        lrcLines.push(`${formatLrcTime(blankTime)}`);
                    }
                }
            }

            content = lrcLines.join("\n");
        } else if (format === 'lrc-enhanced') {
            // Enhanced LRC
            const lrcLines: string[] = [];
            const formatLrcTime = (sec: number) => {
                const mins = Math.floor(sec / 60).toString().padStart(2, '0');
                const secs = (sec % 60).toFixed(2).padStart(5, '0');
                return `[${mins}:${secs}]`;
            };
            const formatWordTime = (sec: number) => {
                const mins = Math.floor(sec / 60).toString().padStart(2, '0');
                const secs = (sec % 60).toFixed(2).padStart(5, '0');
                return `<${mins}:${secs}>`;
            };

            for (let i = 0; i < rawLyrics.length; i++) {
                const current = rawLyrics[i];
                const next = rawLyrics[i + 1];

                let lineContent = "";
                if (current.words && current.words.length > 0) {
                    current.words.forEach((w, idx) => {
                        const cleanText = w.text.replace(/[ \t]+/g, ' ').trim().replace(/\n/g, '\\n');
                        lineContent += `${formatWordTime(w.startTime)}${cleanText}`;
                        if (idx < current.words!.length - 1 && !cleanText.endsWith('-')) {
                            lineContent += " ";
                        }
                    });
                } else {
                    lineContent = current.text.replace(/-\s+/g, '-').replace(/[ \t]+/g, ' ').trim().replace(/\n/g, '\\n');
                }

                lrcLines.push(`${formatLrcTime(current.time)}${lineContent}`);

                const endTime = current.endTime ?? (current.time + 3);
                const blankTime = endTime + 4;
                const isWithinDuration = duration > 0 ? blankTime <= duration : true;

                if (isWithinDuration) {
                    if (next) {
                        if (next.time > blankTime) {
                            lrcLines.push(`${formatLrcTime(blankTime)}`);
                        }
                    } else {
                        lrcLines.push(`${formatLrcTime(blankTime)}`);
                    }
                }
            }
            content = lrcLines.join("\n");

        } else if (format === 'ttml') {
            // TTML Format: HH:MM:SS.mmm
            const toTTMLTime = (sec: number) => {
                const hrs = Math.floor(sec / 3600).toString().padStart(2, '0');
                const mins = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
                const secs = Math.floor(sec % 60).toString().padStart(2, '0');
                const ms = Math.floor((sec % 1) * 1000).toString().padStart(3, '0');
                return `${hrs}:${mins}:${secs}.${ms}`;
            };

            content = `<?xml version="1.0" encoding="UTF-8"?>\n<tt xml:lang="en" xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling">\n  <body>\n    <div>`;

            processedLyrics.forEach(l => {
                const begin = toTTMLTime(l.time);
                // Pre-processing ensures line.endTime is set to nextLine.startTime or duration
                const endVal = (l.endTime !== undefined && l.endTime > l.time) ? l.endTime : l.time + 3;
                const end = toTTMLTime(endVal);

                content += `\n      <p begin="${begin}" end="${end}">`;

                if (l.words && l.words.length > 0) {
                    l.words.forEach((w) => {
                        if (!w.text.trim()) return;

                        const wBegin = toTTMLTime(w.startTime);
                        // Pre-processing ensures word.endTime is set to nextWord.startTime or line.endTime
                        let wEndVal = w.endTime;
                        if (wEndVal === undefined || wEndVal <= w.startTime) {
                            wEndVal = w.startTime + 0.5; // Last resort fallback
                        }
                        const wEnd = toTTMLTime(wEndVal);

                        let cleanText = w.text.replace(/[ \t]+/g, ' ').trim();
                        if (!cleanText.endsWith('-')) {
                            cleanText += ' ';
                        }

                        content += `\n        <span begin="${wBegin}" end="${wEnd}">${cleanText}</span>`;
                    });
                } else {
                    content += `\n        <span begin="${begin}" end="${end}">${l.text.replace(/-\s+/g, '-').replace(/[ \t]+/g, ' ').trim()}</span>`;
                }
                content += `\n      </p>`;
            });
            content += `\n    </div>\n  </body>\n</tt>`;
        } else if (format === 'vtt') {
            // WebVTT Format
            const toVTTTime = (sec: number) => {
                const hrs = Math.floor(sec / 3600).toString().padStart(2, '0');
                const mins = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
                const secs = Math.floor(sec % 60).toString().padStart(2, '0');
                const ms = Math.floor((sec % 1) * 1000).toString().padStart(3, '0');
                return `${hrs}:${mins}:${secs}.${ms}`;
            };

            content = "WEBVTT\n\n";

            processedLyrics.forEach((l) => {
                const start = toVTTTime(l.time);
                // SRT-style fallback for end time: if missing or invalid, use start + 2s (or based on duration from pre-processing)
                const endVal = (l.endTime !== undefined && l.endTime > l.time) ? l.endTime : l.time + 2;
                const end = toVTTTime(endVal);

                let lineText = l.text.trim();

                // If word-level data exists (Enhanced LRC), generate karaoke-style VTT tags
                if (l.words && l.words.length > 0) {
                    const wordLine = l.words.map(w => {
                        const wStart = toVTTTime(w.startTime);
                        return `<${wStart}>${w.text.trim()}`;
                    }).join(' ');

                    if (wordLine.length > 0) {
                        lineText = wordLine;
                    }
                }

                content += `${start} --> ${end}\n${lineText}\n\n`;
            });
        }

        downloadFile(content, filename, 'application/octet-stream');
    };

    const handleClearLyrics = async (item: PlaylistItem) => {
        if (await confirm("Are you sure you want to clear the lyric timeline?", "Clear Lyrics")) {
            setPlaylist(prev => prev.map(p =>
                p.id === item.id ? {
                    ...p,
                    parsedLyrics: [],
                    lyricFile: undefined
                } : p
            ));
        }
    };

    const handleManualLyricUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !manualLyricTargetId) return;

        try {
            const text = await file.text();
            const ext = file.name.split('.').pop()?.toLowerCase();
            let parsed: LyricLine[] = [];

            if (ext === 'lrc') parsed = parseLRC(text);
            else if (ext === 'srt') parsed = parseSRT(text);
            else if (ext === 'ttml' || ext === 'xml') parsed = parseTTML(text);
            else if (ext === 'vtt') parsed = parseVTT(text);

            if (parsed.length > 0) {
                setPlaylist(prev => prev.map(p =>
                    p.id === manualLyricTargetId ? {
                        ...p,
                        lyricFile: file,
                        parsedLyrics: parsed
                    } : p
                ));
            } else {
                alert("Could not parse lyrics. Ensure file is .lrc, .srt, or .vtt");
            }
        } catch (err) {
            console.error("Failed to load lyrics", err);
            alert("Failed to load lyrics file.");
        }

        // Reset
        setManualLyricTargetId(null);
        e.target.value = '';
    };

    return (
        <div
            className={`w-full max-w-[100vw] h-64 flex flex-col bg-zinc-900/95 backdrop-blur-md border-t border-white/10 z-20 shadow-xl overflow-hidden outline-none relative transition-colors ${isDragging ? 'bg-zinc-800 border-orange-500' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDragging && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-900/90 backdrop-blur-sm pointer-events-none">
                    <div className="flex flex-col items-center gap-4 text-orange-500 animate-pulse">
                        <Upload size={48} />
                        <h3 className="text-xl font-bold">Drop Audio & Lyrics Here</h3>
                        <p className="text-sm text-zinc-400">Supported formats: MP3, WAV, FLAC, Video (MP4/WebM), LRC, SRT, VTT</p>
                    </div>
                </div>
            )}
            <input
                type="file"
                ref={lyricFileInputRef}
                className="hidden"
                accept=".lrc,.srt,.ttml,.xml,.vtt"
                onChange={handleManualLyricUpload}
            />
            {/* Header */}
            <div className="p-2 border-b border-white/10 flex items-center justify-between bg-zinc-900 z-30 shrink-0 h-12">
                <div className="flex items-center gap-4 shrink-0">
                    <h2 className="text-sm font-bold flex items-center gap-2 text-zinc-300 whitespace-nowrap">
                        <ListMusic size={16} className="text-orange-400" />
                        Playlist
                    </h2>
                    <div className="w-px h-4 bg-zinc-700"></div>
                    <div className="flex bg-orange-600 rounded overflow-hidden">
                        <label className="flex items-center gap-2 px-3 py-1 hover:bg-orange-500 cursor-pointer transition-colors text-white text-xs font-medium whitespace-nowrap border-r border-orange-700">
                            <Plus size={14} /> Add Files
                            <input type="file" className="hidden" accept="audio/*,video/*,.lrc,.srt,.ttml,.xml,.vtt" multiple onChange={handleFileUpload} />
                        </label>
                        <label className="flex items-center gap-2 px-2 py-1 hover:bg-orange-500 cursor-pointer transition-colors text-white text-xs whitespace-nowrap" title="Add Folder">
                            <Folder size={14} />
                            <input type="file" className="hidden" multiple {...({ webkitdirectory: "" } as any)} onChange={handleFileUpload} />
                        </label>
                    </div>
                    <div className="w-px h-4 bg-zinc-700"></div>
                    {/* Sort Icons */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleSort('filename')}
                            className={`p-1 rounded transition-colors ${sortConfig.key === 'filename' ? 'bg-zinc-700 text-white' : 'hover:bg-zinc-700 text-zinc-400 hover:text-white'}`}
                            title={`Sort by Filename ${sortConfig.key === 'filename' ? (sortConfig.direction === 'asc' ? '(A-Z)' : '(Z-A)') : ''}`}
                        >
                            <FileText size={14} className={sortConfig.key === 'filename' && sortConfig.direction === 'desc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                        </button>
                        <button
                            onClick={() => handleSort('artist')}
                            className={`p-1 rounded transition-colors ${sortConfig.key === 'artist' ? 'bg-zinc-700 text-white' : 'hover:bg-zinc-700 text-zinc-400 hover:text-white'}`}
                            title={`Sort by Artist ${sortConfig.key === 'artist' ? (sortConfig.direction === 'asc' ? '(A-Z)' : '(Z-A)') : ''}`}
                        >
                            <User size={14} className={sortConfig.key === 'artist' && sortConfig.direction === 'desc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                        </button>
                        <button
                            onClick={() => handleSort('title')}
                            className={`p-1 rounded transition-colors ${sortConfig.key === 'title' ? 'bg-zinc-700 text-white' : 'hover:bg-zinc-700 text-zinc-400 hover:text-white'}`}
                            title={`Sort by Title ${sortConfig.key === 'title' ? (sortConfig.direction === 'asc' ? '(A-Z)' : '(Z-A)') : ''}`}
                        >
                            <Music size={14} className={sortConfig.key === 'title' && sortConfig.direction === 'desc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                        </button>
                        <button
                            onClick={() => handleSort('album')}
                            className={`p-1 rounded transition-colors ${sortConfig.key === 'album' ? 'bg-zinc-700 text-white' : 'hover:bg-zinc-700 text-zinc-400 hover:text-white'}`}
                            title={`Sort by Album ${sortConfig.key === 'album' ? (sortConfig.direction === 'asc' ? '(A-Z)' : '(Z-A)') : ''}`}
                        >
                            <Disc size={14} className={sortConfig.key === 'album' && sortConfig.direction === 'desc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                        </button>
                        <button
                            onClick={() => handleSort('random')}
                            className={`p-1 rounded transition-colors ${sortConfig.key === 'random' ? 'bg-zinc-700 text-white' : 'hover:bg-zinc-700 text-zinc-400 hover:text-white'}`}
                            title="Shuffle"
                        >
                            <Shuffle size={14} />
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 shrink-0 items-center">
                    <div className="flex items-center gap-1 bg-zinc-800/50 rounded px-1">
                        <button
                            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                            className={`p-1 rounded transition-colors ${showApiKeyInput ? 'text-orange-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                            title="Gemini API Key"
                        >
                            <Key size={14} />
                        </button>
                        {showApiKeyInput && (
                            <input
                                type={apiKey ? "password" : "text"}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Paste API Key here"
                                className="bg-transparent border-none outline-none text-xs text-zinc-200 w-32 placeholder:text-zinc-600"
                                autoFocus
                                autoComplete="off"
                                spellCheck={false}
                            />
                        )}
                    </div>

                    {/* Model Dropdown */}
                    <div className="relative group">
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="bg-zinc-800 text-[10px] text-zinc-300 border border-zinc-700 rounded px-1 py-1 focus:outline-none focus:border-orange-500 appearance-none cursor-pointer hover:bg-zinc-700"
                            title="Select Gemini Model"
                        >
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                            <option value="gemini-3-flash-preview">Gemini 3.0 Flash Preview</option>
                        </select>
                    </div>

                    {/* Mode Dropdown */}
                    <div className="relative group">
                        <select
                            value={transcriptionGranularity}
                            onChange={(e) => setTranscriptionGranularity(e.target.value as 'word' | 'line')}
                            className="bg-zinc-800 text-[10px] text-zinc-300 border border-zinc-700 rounded px-1 py-1 focus:outline-none focus:border-orange-500 appearance-none cursor-pointer hover:bg-zinc-700 w-[60px]"
                            title="Transcription Mode (Line or Word Level)"
                        >
                            <option value="line">Line</option>
                            <option value="word">Word</option>
                        </select>
                    </div>

                    <button
                        onClick={async () => {
                            if (playlist.length > 0 && await confirm("Clear entire playlist?", "Clear Playlist")) {
                                onClearPlaylist();
                                setPlaylist([]);
                            }
                        }}
                        className="p-1 hover:bg-red-900/50 text-zinc-500 hover:text-red-200 rounded transition-colors"
                        title="Clear Playlist"
                    >
                        <Trash2 size={14} />
                    </button>

                    <div className="w-px h-4 bg-zinc-700 mx-1 self-center"></div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded transition-colors"
                        title="Close Playlist"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* List Container */}
            <div ref={containerRef} tabIndex={0} onMouseEnter={() => containerRef.current?.focus()} className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-zinc-950 p-1 space-y-1 focus:outline-none">
                {playlist.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs">
                        <ListMusic size={32} className="mb-2 opacity-50" />
                        <p>Playlist is empty</p>
                        <p className="opacity-50">Add audio files (matches .lrc/.srt/.ttml by name)</p>
                    </div>
                ) : (
                    playlist.map((item, idx) => {
                        const isCurrent = idx === currentTrackIndex;
                        const isSelected = idx === selectedIndex;
                        const lyrics = item.parsedLyrics || [];

                        // Determine active lyric index if this is the current track
                        const activeLyricIndex = isCurrent ? lyrics.findIndex((l, i) => {
                            if (l.endTime !== undefined) {
                                return currentTime >= l.time && currentTime < l.endTime;
                            }
                            const next = lyrics[i + 1];
                            return currentTime >= l.time && (!next || currentTime < next.time);
                        }) : -1;

                        return (
                            <div
                                key={item.id}
                                onClick={() => setSelectedIndex(idx)}
                                className={`group relative flex gap-2 p-1.5 rounded-md border transition-all cursor-pointer
                            ${isCurrent ? 'bg-zinc-800 border-orange-500/50 shadow-lg' : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'}
                            ${isSelected ? 'ring-2 ring-blue-500/70 ring-offset-1 ring-offset-zinc-950' : ''}
                        `}
                            >
                                {/* Left Column: Play Button + Info */}
                                <div className="flex flex-col gap-1 shrink-0 w-48">
                                    {/* Audio Row */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isCurrent) {
                                                    onTogglePlay();
                                                } else {
                                                    onPlayTrack(idx);
                                                }
                                            }}
                                            className={`p-1.5 rounded-full transition-colors flex-shrink-0
                                        ${isCurrent ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}
                                    `}
                                        >
                                            {isCurrent ? (
                                                isPlaying ? <Pause size={14} /> : <Play size={14} />
                                            ) : (
                                                <Play size={14} />
                                            )}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            <div
                                                className={`text-xs font-medium truncate ${isCurrent ? 'text-orange-100' : 'text-zinc-300'}`}
                                                title={item.audioFile.name}
                                            >
                                                {item.metadata.title}
                                            </div>
                                            <div
                                                className="text-[9px] text-zinc-500 truncate"
                                                title={item.metadata.artist}
                                            >
                                                {item.metadata.artist}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Row: Size + Lyric File */}
                                    <div className="ml-8 flex items-center gap-2">
                                        <span className="text-[8px] text-zinc-600">
                                            {(item.audioFile.size / 1024 / 1024).toFixed(1)}MB
                                        </span>
                                        {item.lyricFile ? (
                                            <div
                                                className="flex items-center gap-0.5 text-[8px] px-1 rounded bg-blue-900/30 text-blue-300/80"
                                                title={item.lyricFile.name}
                                            >
                                                <FileText size={7} />
                                                <span className="truncate max-w-[80px]">
                                                    {item.lyricFile.name}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[8px] text-zinc-700 italic">No Lyrics</span>
                                        )}
                                    </div>
                                </div>

                                {/* Right Column: Lyric Timeline */}
                                <div className="flex-1 min-w-0 h-12 bg-zinc-950/50 rounded border border-zinc-800/50 overflow-x-auto overflow-y-hidden custom-scrollbar">
                                    {lyrics.length > 0 ? (
                                        <div className="relative h-full min-w-max flex items-center px-1">
                                            {lyrics.map((line, lIdx) => {
                                                const isActive = lIdx === activeLyricIndex;
                                                return (
                                                    <div
                                                        key={lIdx}
                                                        id={isActive ? `lyric-active-${idx}` : undefined}
                                                        className={`flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded text-[9px] transition-colors whitespace-nowrap cursor-pointer
                                                        ${isActive
                                                                ? 'bg-orange-600 text-white border border-orange-400 shadow-[0_0_10px_rgba(234,88,12,0.3)]'
                                                                : 'bg-zinc-800/50 hover:bg-blue-900/50 border border-zinc-700/30 hover:border-blue-500/50 text-zinc-400'}
                                                    `}
                                                        title={`${formatLrcTimeDisplay(line.time)} - ${line.text}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // If this track is not the current one, play it first
                                                            if (idx !== currentTrackIndex) {
                                                                onPlayTrack(idx);
                                                                // Delay seek slightly to allow audio to load
                                                                setTimeout(() => onSeek(line.time), 150);
                                                            } else {
                                                                onSeek(line.time);
                                                            }
                                                        }}
                                                    >
                                                        <span className={`font-mono text-[8px] ${isActive ? 'text-orange-200' : 'text-zinc-500'}`}>{formatLrcTimeDisplay(line.time)}</span>
                                                        <span className={`truncate max-w-[120px] ${isActive ? 'text-white font-medium' : 'text-zinc-400'}`}>{line.text || '♪'}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-zinc-700 text-[9px] italic">
                                            No lyric timeline
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0 px-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setManualLyricTargetId(item.id);
                                            if (lyricFileInputRef.current) lyricFileInputRef.current.value = '';
                                            lyricFileInputRef.current?.click();
                                        }}
                                        className="p-1.5 rounded bg-blue-900/30 border border-blue-500/30 text-blue-400 hover:bg-blue-800/50 transition-colors"
                                        title="Load Lyrics Manually"
                                    >
                                        <Upload size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleSearchLyrics(item); }}
                                        className={`group/btn relative p-1.5 rounded bg-cyan-900/30 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-800/50 transition-colors ${searchingIds.has(item.id) ? 'animate-pulse' : ''}`}
                                        title="Search Lyrics (Online)"
                                        disabled={searchingIds.has(item.id)}
                                    >
                                        {searchingIds.has(item.id) ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <Search size={14} />
                                        )}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleTranscribe(item); }}
                                        className={`group/btn relative p-1.5 rounded bg-purple-900/30 border border-purple-500/30 text-purple-400 hover:bg-purple-800/50 transition-colors ${transcribingIds.has(item.id) ? 'text-red-400 border-red-500/50 hover:bg-red-900/30' : ''}`}
                                        title={transcribingIds.has(item.id) ? "Stop Transcription" : "AI Sync Transcribe"}
                                    >
                                        {transcribingIds.has(item.id) ? (
                                            <>
                                                <Loader2 size={14} className="animate-spin group-hover/btn:hidden" />
                                                <Square size={14} className="hidden group-hover/btn:block fill-current" />
                                            </>
                                        ) : (
                                            <Sparkles size={14} />
                                        )}
                                    </button>

                                    {lyrics.length > 0 && (
                                        <div className="flex items-center gap-0.5 bg-zinc-800/50 rounded p-0.5 border border-zinc-700/50">
                                            <button onClick={(e) => { e.stopPropagation(); exportLyrics(item, 'txt'); }} className="p-1 hover:bg-white/10 rounded text-[8px] text-zinc-400 font-bold" title="Download TXT">TXT</button>
                                            <button onClick={(e) => { e.stopPropagation(); exportLyrics(item, 'lrc'); }} className="p-1 hover:bg-white/10 rounded text-[8px] text-zinc-400 font-bold" title="Download LRC">LRC</button>
                                            <button onClick={(e) => { e.stopPropagation(); exportLyrics(item, 'lrc-enhanced'); }} className="p-1 hover:bg-white/10 rounded text-[8px] text-zinc-400 font-bold" title="Download Enhanced LRC (Word Level)">eLRC</button>
                                            <button onClick={(e) => { e.stopPropagation(); exportLyrics(item, 'srt'); }} className="p-1 hover:bg-white/10 rounded text-[8px] text-zinc-400 font-bold" title="Download SRT">SRT</button>
                                            <button onClick={(e) => { e.stopPropagation(); exportLyrics(item, 'vtt'); }} className="p-1 hover:bg-white/10 rounded text-[8px] text-zinc-400 font-bold" title="Download VTT">VTT</button>
                                            <button onClick={(e) => { e.stopPropagation(); exportLyrics(item, 'ttml'); }} className="p-1 hover:bg-white/10 rounded text-[8px] text-zinc-400 font-bold" title="Download TTML">TTML</button>
                                            <button onClick={(e) => { e.stopPropagation(); exportLyrics(item, 'json'); }} className="p-1 hover:bg-white/10 rounded text-[8px] text-zinc-400 font-bold" title="Download JSON">JSON</button>
                                            <div className="w-px h-3 bg-zinc-700 mx-0.5"></div>
                                            <button onClick={(e) => { e.stopPropagation(); handleClearLyrics(item); }} className="p-1 hover:bg-red-900/50 rounded text-[8px] text-red-500 hover:text-red-300 font-bold" title="Clear Lyrics">CLR</button>
                                        </div>
                                    )}
                                </div>

                                {/* Delete Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeTrack(idx); }}
                                    className="p-1 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded self-start"
                                    title="Remove Track"
                                >
                                    <Trash2 size={12} />
                                </button>

                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default PlaylistEditor;
