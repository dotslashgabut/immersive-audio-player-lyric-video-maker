import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { PlaylistItem, LyricLine } from '../types';
import { Plus, Trash2, Play, Volume2, FileText, ListMusic, Shuffle, User, Disc, Music } from './Icons';
import { formatTime, parseLRC, parseSRT } from '../utils/parsers';

interface PlaylistEditorProps {
    playlist: PlaylistItem[];
    setPlaylist: React.Dispatch<React.SetStateAction<PlaylistItem[]>>;
    currentTrackIndex: number;
    setCurrentTrackIndex: React.Dispatch<React.SetStateAction<number>>;
    onPlayTrack: (index: number) => void;
    onSeek: (time: number) => void;
    onClearPlaylist: () => void;
    currentTime: number;
}

const PlaylistEditor: React.FC<PlaylistEditorProps> = ({ playlist, setPlaylist, currentTrackIndex, setCurrentTrackIndex, onPlayTrack, onSeek, onClearPlaylist, currentTime }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

    // Auto-scroll active lyric
    const currentItem = currentTrackIndex >= 0 ? playlist[currentTrackIndex] : null;
    const currentLyrics = currentItem?.parsedLyrics || [];

    const activeLyricIndex = useMemo(() => {
        if (!currentItem) return -1;
        return currentLyrics.findIndex((l, i) => {
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


    // Handle keyboard shortcuts
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (selectedIndex !== null && e.key === 'Delete') {
            e.preventDefault();
            e.stopPropagation();
            setPlaylist(prev => {
                const newList = [...prev];
                newList.splice(selectedIndex, 1);
                return newList;
            });
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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            // @ts-ignore
            const files: File[] = Array.from(e.target.files);
            const fileGroups = new Map<string, { audio?: File; lyric?: File }>();

            files.forEach(file => {
                const ext = file.name.split('.').pop()?.toLowerCase();
                const basename = file.name.replace(/\.[^/.]+$/, "");

                if (!fileGroups.has(basename)) {
                    fileGroups.set(basename, {});
                }
                const group = fileGroups.get(basename)!;

                // Simple extension check
                if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext || '')) {
                    group.audio = file;
                } else if (['lrc', 'srt'].includes(ext || '')) {
                    group.lyric = file;
                }
            });

            const newItems: PlaylistItem[] = [];

            // Helper function to extract metadata using jsmediatags
            const extractMetadata = async (file: File, fallbackTitle: string): Promise<{ title: string; artist: string; album?: string; coverUrl: string | null }> => {
                return new Promise((resolve) => {
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

            // Helper function to parse lyrics from file
            const parseLyrics = async (file: File): Promise<LyricLine[]> => {
                try {
                    const text = await file.text();
                    const ext = file.name.split('.').pop()?.toLowerCase();
                    if (ext === 'lrc') return parseLRC(text);
                    if (ext === 'srt') return parseSRT(text);
                } catch (e) {
                    console.error("Failed to parse lyrics", e);
                }
                return [];
            };

            // Process all audio files and extract metadata
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
                setPlaylist(prev => [...prev, ...newItems]);
            }

            // Allow re-upload
            e.target.value = '';
        }
    };

    const removeTrack = (index: number) => {
        setPlaylist(prev => {
            const newList = [...prev];
            newList.splice(index, 1);
            return newList;
        });
    };

    return (
        <div className="w-full max-w-[100vw] h-64 flex flex-col bg-zinc-900/95 backdrop-blur-md border-t border-white/10 z-20 shadow-xl overflow-hidden outline-none">
            {/* Header */}
            <div className="p-2 border-b border-white/10 flex items-center justify-between bg-zinc-900 z-30 shrink-0 h-12">
                <div className="flex items-center gap-4 shrink-0">
                    <h2 className="text-sm font-bold flex items-center gap-2 text-zinc-300 whitespace-nowrap">
                        <ListMusic size={16} className="text-orange-400" />
                        Playlist
                    </h2>
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

                <div className="flex gap-2 shrink-0">
                    <label className="flex items-center gap-2 px-3 py-1 bg-orange-600 hover:bg-orange-500 rounded text-xs font-medium cursor-pointer transition-colors text-white whitespace-nowrap">
                        <Plus size={14} /> Add Audio & Lyrics
                        <input type="file" className="hidden" accept="audio/*,.lrc,.srt" multiple onChange={handleFileUpload} />
                    </label>
                    <button
                        onClick={() => {
                            if (playlist.length > 0 && window.confirm("Clear entire playlist?")) {
                                onClearPlaylist();
                                setPlaylist([]);
                            }
                        }}
                        className="p-1 hover:bg-red-900/50 text-zinc-500 hover:text-red-200 rounded transition-colors"
                        title="Clear Playlist"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* List Container */}
            <div ref={containerRef} tabIndex={0} onMouseEnter={() => containerRef.current?.focus()} className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-zinc-950 p-1 space-y-1 focus:outline-none">
                {playlist.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs">
                        <ListMusic size={32} className="mb-2 opacity-50" />
                        <p>Playlist is empty</p>
                        <p className="opacity-50">Add audio files (matches .lrc/.srt by name)</p>
                    </div>
                ) : (
                    playlist.map((item, idx) => {
                        const isCurrent = idx === currentTrackIndex;
                        const isSelected = idx === selectedIndex;
                        const lyrics = item.parsedLyrics || [];

                        // Determine active lyric index if this is the current track
                        const activeLyricIndex = isCurrent ? lyrics.findIndex((l, i) => {
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
                                            onClick={() => onPlayTrack(idx)}
                                            className={`p-1.5 rounded-full transition-colors flex-shrink-0
                                        ${isCurrent ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}
                                    `}
                                        >
                                            {isCurrent ? <Volume2 size={14} /> : <Play size={14} />}
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
                                                        title={`${formatTime(line.time)} - ${line.text}`}
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
                                                        <span className={`font-mono text-[8px] ${isActive ? 'text-orange-200' : 'text-zinc-500'}`}>{formatTime(line.time)}</span>
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

                                {/* Delete Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeTrack(idx); }}
                                    className="p-1 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-opacity self-start"
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
