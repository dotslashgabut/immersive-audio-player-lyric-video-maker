import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { PlaylistItem, LyricLine } from '../types';
import { Plus, Trash2, Play, Volume2, FileText, ListMusic, Shuffle, User, Disc, Music, X, Sparkles, Loader2, FileJson, FileType, FileDown, Key } from './Icons';
import { formatTime, parseLRC, parseSRT } from '../utils/parsers';
// Use correct import for GoogleGenAI and Type
import { GoogleGenAI, Type } from "@google/genai";

interface PlaylistEditorProps {
    playlist: PlaylistItem[];
    setPlaylist: React.Dispatch<React.SetStateAction<PlaylistItem[]>>;
    currentTrackIndex: number;
    setCurrentTrackIndex: React.Dispatch<React.SetStateAction<number>>;
    onPlayTrack: (index: number) => void;
    onSeek: (time: number) => void;
    onClearPlaylist: () => void;
    currentTime: number;
    onClose: () => void;
}

const PlaylistEditor: React.FC<PlaylistEditorProps> = ({ playlist, setPlaylist, currentTrackIndex, setCurrentTrackIndex, onPlayTrack, onSeek, onClearPlaylist, currentTime, onClose }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
    const [transcribingIds, setTranscribingIds] = useState<Set<string>>(new Set());
    const [apiKey, setApiKey] = useState<string>(localStorage.getItem('gemini_api_key') || '');
    const [showApiKeyInput, setShowApiKeyInput] = useState(false);

    useEffect(() => {
        if (apiKey) {
            localStorage.setItem('gemini_api_key', apiKey);
        }
    }, [apiKey]);

    const handleSort = (type: 'filename' | 'artist' | 'title' | 'album' | 'random') => {
        if (playlist.length === 0) return;
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
            if (sortConfig.key === type && sortConfig.direction === 'asc') {
                direction = 'desc';
            }
            setSortConfig({ key: type, direction });
            const multiplier = direction === 'asc' ? 1 : -1;
            if (type === 'filename') sorted.sort((a, b) => multiplier * a.audioFile.name.localeCompare(b.audioFile.name));
            else if (type === 'artist') sorted.sort((a, b) => multiplier * (a.metadata.artist || '').localeCompare(b.metadata.artist || ''));
            else if (type === 'title') sorted.sort((a, b) => multiplier * (a.metadata.title || '').localeCompare(b.metadata.title || ''));
            else if (type === 'album') sorted.sort((a, b) => multiplier * (a.metadata.album || '').localeCompare(b.metadata.album || ''));
        }
        setPlaylist(sorted);
        if (currentItem) {
            const newIndex = sorted.findIndex(i => i.id === currentItem.id);
            if (newIndex !== -1) setCurrentTrackIndex(newIndex);
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
        if (transcribingIds.has(item.id)) return;
        setTranscribingIds(prev => new Set(prev).add(item.id));

        try {
            const base64Data = await fileToBase64(item.audioFile);

            const keyToUse = apiKey || process.env.API_KEY;
            if (!keyToUse) {
                alert("Please set your Gemini API Key first!");
                setTranscribingIds(prev => {
                    const next = new Set(prev);
                    next.delete(item.id);
                    return next;
                });
                setShowApiKeyInput(true);
                return;
            }

            const ai = new GoogleGenAI({ apiKey: keyToUse });

            // Use ai.models.generateContent with proper configuration for JSON output and Type from @google/genai
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        {
                            inlineData: {
                                mimeType: item.audioFile.type,
                                data: base64Data,
                            },
                        },
                        {
                            text: "Transcribe this audio precisely into synchronized lyrics. Return a JSON array of objects representing synchronized lyrics. Each object MUST have a 'time' property (start time in seconds as a number) and a 'text' property (the spoken words)."
                        }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                time: {
                                    type: Type.NUMBER,
                                    description: 'The start time in seconds.',
                                },
                                text: {
                                    type: Type.STRING,
                                    description: 'The lyric text.',
                                },
                            },
                            required: ["time", "text"],
                        },
                    },
                },
            });

            // Access response text directly as property per guidelines
            const rawText = response.text || "[]";
            const transcribedLyrics: LyricLine[] = JSON.parse(rawText);

            setPlaylist(prev => prev.map(p =>
                p.id === item.id ? { ...p, parsedLyrics: transcribedLyrics.sort((a, b) => a.time - b.time) } : p
            ));
        } catch (err) {
            console.error("Transcription failed:", err);
            alert("Transcription failed. Please check your API key or file format.");
        } finally {
            setTranscribingIds(prev => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
            });
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

    const exportLyrics = (item: PlaylistItem, format: 'txt' | 'json' | 'srt' | 'lrc') => {
        const rawLyrics = item.parsedLyrics || [];
        if (rawLyrics.length === 0) return;

        let content = "";
        const filename = `${item.metadata.title || 'lyrics'}.${format}`;

        if (format === 'txt') {
            content = rawLyrics.map(l => l.text).join("\n");
        } else if (format === 'json') {
            content = JSON.stringify(rawLyrics, null, 2);
        } else if (format === 'srt') {
            content = rawLyrics.map((l, i) => {
                const nextTime = rawLyrics[i + 1]?.time || l.time + 3;
                const toTimestamp = (sec: number) => {
                    const hrs = Math.floor(sec / 3600).toString().padStart(2, '0');
                    const mins = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
                    const secs = Math.floor(sec % 60).toString().padStart(2, '0');
                    const ms = Math.floor((sec % 1) * 1000).toString().padStart(3, '0');
                    return `${hrs}:${mins}:${secs},${ms}`;
                };
                return `${i + 1}\n${toTimestamp(l.time)} --> ${toTimestamp(nextTime)}\n${l.text}\n`;
            }).join("\n");
        } else if (format === 'lrc') {
            const lrcLines: string[] = [];

            const formatLrcTime = (sec: number) => {
                const mins = Math.floor(sec / 60).toString().padStart(2, '0');
                const secs = (sec % 60).toFixed(2).padStart(5, '0');
                return `[${mins}:${secs}]`;
            };

            for (let i = 0; i < rawLyrics.length; i++) {
                const current = rawLyrics[i];
                const next = rawLyrics[i + 1];

                lrcLines.push(`${formatLrcTime(current.time)}${current.text}`);

                if (next && (next.time - current.time) > 4) {
                    lrcLines.push(`${formatLrcTime(current.time + 3)}`);
                }
            }

            const lastLine = rawLyrics[rawLyrics.length - 1];
            if (lastLine) {
                lrcLines.push(`${formatLrcTime(lastLine.time + 3)}`);
            }

            content = lrcLines.join("\n");
        }

        downloadFile(content, filename, 'application/octet-stream');
    };

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (selectedIndex !== null && e.key === 'Delete') {
            e.preventDefault(); e.stopPropagation();
            setPlaylist(prev => {
                const newList = [...prev];
                newList.splice(selectedIndex, 1);
                return newList;
            });
        } else if (e.key === 'ArrowDown' && playlist.length > 0) {
            e.preventDefault(); e.stopPropagation();
            setSelectedIndex(prev => prev === null ? 0 : Math.min(prev + 1, playlist.length - 1));
        } else if (e.key === 'ArrowUp' && playlist.length > 0) {
            e.preventDefault(); e.stopPropagation();
            setSelectedIndex(prev => prev === null ? 0 : Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && selectedIndex !== null) {
            e.preventDefault(); e.stopPropagation();
            onPlayTrack(selectedIndex);
        }
    }, [selectedIndex, playlist.length, setPlaylist, onPlayTrack]);

    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.addEventListener('keydown', handleKeyDown);
            return () => container.removeEventListener('keydown', handleKeyDown);
        }
    }, [handleKeyDown]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files: File[] = Array.from(e.target.files);
            const fileGroups = new Map<string, { audio?: File; lyric?: File }>();

            files.forEach(file => {
                const ext = file.name.split('.').pop()?.toLowerCase();
                const basename = file.name.replace(/\.[^/.]+$/, "");
                if (!fileGroups.has(basename)) fileGroups.set(basename, {});
                const group = fileGroups.get(basename)!;
                if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext || '')) group.audio = file;
                else if (['lrc', 'srt'].includes(ext || '')) group.lyric = file;
            });

            const newItems: PlaylistItem[] = [];
            const extractMetadata = async (file: File, fallbackTitle: string): Promise<{ title: string; artist: string; album?: string; coverUrl: string | null }> => {
                return new Promise((resolve) => {
                    const jsmediatags = (window as any).jsmediatags;
                    if (!jsmediatags) { resolve({ title: fallbackTitle, artist: 'Unknown Artist', coverUrl: null }); return; }
                    jsmediatags.read(file, {
                        onSuccess: (tag: any) => {
                            const { title, artist, album, picture } = tag.tags;
                            let coverUrl: string | null = null;
                            if (picture) {
                                const { data, format } = picture;
                                let base64String = "";
                                for (let i = 0; i < data.length; i++) base64String += String.fromCharCode(data[i]);
                                coverUrl = `data:${format};base64,${window.btoa(base64String)}`;
                            }
                            resolve({ title: title || fallbackTitle, artist: artist || 'Unknown Artist', album: album || undefined, coverUrl });
                        },
                        onError: () => resolve({ title: fallbackTitle, artist: 'Unknown Artist', coverUrl: null })
                    });
                });
            };

            for (const [basename, group] of fileGroups.entries()) {
                if (group.audio) {
                    const metadata = await extractMetadata(group.audio, basename);
                    const id = Math.random().toString(36).substr(2, 9);
                    let itemParsedLyrics: LyricLine[] = [];
                    if (group.lyric) {
                        const text = await group.lyric.text();
                        const ext = group.lyric.name.split('.').pop()?.toLowerCase();
                        if (ext === 'lrc') itemParsedLyrics = parseLRC(text);
                        else if (ext === 'srt') itemParsedLyrics = parseSRT(text);
                    }
                    newItems.push({ id, audioFile: group.audio, lyricFile: group.lyric, parsedLyrics: itemParsedLyrics, metadata, duration: 0 });
                }
            }
            if (newItems.length > 0) setPlaylist(prev => [...prev, ...newItems]);
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
            <div className="p-2 border-b border-white/10 flex items-center justify-between bg-zinc-900 z-30 shrink-0 h-12">
                <div className="flex items-center gap-4 shrink-0">
                    <h2 className="text-sm font-bold flex items-center gap-2 text-zinc-300 whitespace-nowrap">
                        <ListMusic size={16} className="text-orange-400" />
                        Playlist
                    </h2>
                    <div className="w-px h-4 bg-zinc-700"></div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => handleSort('filename')} className={`p-1 rounded transition-colors ${sortConfig.key === 'filename' ? 'bg-zinc-700 text-white' : 'hover:bg-zinc-700 text-zinc-400 hover:text-white'}`} title="Sort by Filename"><FileText size={14} /></button>
                        <button onClick={() => handleSort('artist')} className={`p-1 rounded transition-colors ${sortConfig.key === 'artist' ? 'bg-zinc-700 text-white' : 'hover:bg-zinc-700 text-zinc-400 hover:text-white'}`} title="Sort by Artist"><User size={14} /></button>
                        <button onClick={() => handleSort('title')} className={`p-1 rounded transition-colors ${sortConfig.key === 'title' ? 'bg-zinc-700 text-white' : 'hover:bg-zinc-700 text-zinc-400 hover:text-white'}`} title="Sort by Title"><Music size={14} /></button>
                        <button onClick={() => handleSort('random')} className={`p-1 rounded transition-colors ${sortConfig.key === 'random' ? 'bg-zinc-700 text-white' : 'hover:bg-zinc-700 text-zinc-400 hover:text-white'}`} title="Shuffle"><Shuffle size={14} /></button>
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
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Paste API Key here"
                                className="bg-transparent border-none outline-none text-xs text-zinc-200 w-32 placeholder:text-zinc-600"
                                autoFocus
                            />
                        )}
                    </div>
                    <button onClick={() => { if (playlist.length > 0) { onClearPlaylist(); setPlaylist([]); } }} className="p-1 hover:bg-red-900/50 text-zinc-500 hover:text-red-200 rounded transition-colors" title="Clear Playlist"><Trash2 size={14} /></button>
                    <label className="flex items-center gap-2 px-3 py-1 bg-orange-600 hover:bg-orange-500 rounded text-xs font-medium cursor-pointer transition-colors text-white whitespace-nowrap">
                        <Plus size={14} /> Add Audio & Lyrics
                        <input type="file" className="hidden" accept="audio/*,.lrc,.srt" multiple onChange={handleFileUpload} />
                    </label>
                    <div className="w-px h-4 bg-zinc-700 mx-1 self-center"></div>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded transition-colors" title="Close Playlist"><X size={14} /></button>
                </div>
            </div>

            <div ref={containerRef} tabIndex={0} onMouseEnter={() => containerRef.current?.focus()} className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-zinc-950 p-1 space-y-1 focus:outline-none">
                {playlist.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs">
                        <ListMusic size={32} className="mb-2 opacity-50" />
                        <p>Playlist is empty</p>
                    </div>
                ) : (
                    playlist.map((item, idx) => {
                        const isCurrent = idx === currentTrackIndex;
                        const isSelected = idx === selectedIndex;
                        const isTranscribing = transcribingIds.has(item.id);
                        const lyrics = item.parsedLyrics || [];
                        const activeLyricIndex = isCurrent ? lyrics.findIndex((l, i) => {
                            if (l.endTime !== undefined) return currentTime >= l.time && currentTime < l.endTime;
                            const next = lyrics[i + 1];
                            return currentTime >= l.time && (!next || currentTime < next.time);
                        }) : -1;

                        return (
                            <div key={item.id} onClick={() => setSelectedIndex(idx)} className={`group relative flex gap-2 p-1.5 rounded-md border transition-all cursor-pointer ${isCurrent ? 'bg-zinc-800 border-orange-500/50 shadow-lg' : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'} ${isSelected ? 'ring-2 ring-blue-500/70 ring-offset-1 ring-offset-zinc-950' : ''}`}>
                                <div className="flex flex-col gap-1 shrink-0 w-44">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => onPlayTrack(idx)} className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${isCurrent ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
                                            {isCurrent ? <Volume2 size={14} /> : <Play size={14} />}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-xs font-medium truncate ${isCurrent ? 'text-orange-100' : 'text-zinc-300'}`}>{item.metadata.title}</div>
                                            <div className="text-[9px] text-zinc-500 truncate">{item.metadata.artist}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 h-12 bg-zinc-950/50 rounded border border-zinc-800/50 overflow-x-auto overflow-y-hidden custom-scrollbar flex items-center">
                                    {lyrics.length > 0 ? (
                                        <div className="relative h-full min-w-max flex items-center px-1">
                                            {lyrics.map((line, lIdx) => {
                                                const isActive = lIdx === activeLyricIndex;
                                                return (
                                                    <div key={lIdx} id={isActive ? `lyric-active-${idx}` : undefined} className={`flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded text-[9px] transition-colors whitespace-nowrap cursor-pointer ${isActive ? 'bg-orange-600 text-white border border-orange-400' : 'bg-zinc-800/50 hover:bg-blue-900/50 border border-zinc-700/30 hover:border-blue-500/50 text-zinc-400'}`} onClick={(e) => { e.stopPropagation(); if (idx !== currentTrackIndex) onPlayTrack(idx); setTimeout(() => onSeek(line.time), 150); }}>
                                                        <span className={`font-mono text-[8px] ${isActive ? 'text-orange-200' : 'text-zinc-500'}`}>{formatTime(line.time)}</span>
                                                        <span className="truncate max-w-[120px]">{line.text || '♪'}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center gap-2">
                                            <span className="text-zinc-700 text-[9px] italic">No lyric timeline</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleTranscribe(item); }}
                                        className={`p-1.5 rounded bg-purple-900/30 border border-purple-500/30 text-purple-400 hover:bg-purple-800/50 transition-colors ${isTranscribing ? 'animate-pulse pointer-events-none' : ''}`}
                                        title="AI Sync Transcribe"
                                    >
                                        {isTranscribing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    </button>

                                    {lyrics.length > 0 && (
                                        <div className="flex items-center gap-0.5 bg-zinc-800/50 rounded p-0.5 border border-zinc-700/50">
                                            <button onClick={(e) => { e.stopPropagation(); exportLyrics(item, 'txt'); }} className="p-1 hover:bg-white/10 rounded text-[8px] text-zinc-400 font-bold" title="Download TXT">TXT</button>
                                            <button onClick={(e) => { e.stopPropagation(); exportLyrics(item, 'lrc'); }} className="p-1 hover:bg-white/10 rounded text-[8px] text-zinc-400 font-bold" title="Download LRC">LRC</button>
                                            <button onClick={(e) => { e.stopPropagation(); exportLyrics(item, 'srt'); }} className="p-1 hover:bg-white/10 rounded text-[8px] text-zinc-400 font-bold" title="Download SRT">SRT</button>
                                            <button onClick={(e) => { e.stopPropagation(); exportLyrics(item, 'json'); }} className="p-1 hover:bg-white/10 rounded text-[8px] text-zinc-400 font-bold" title="Download JSON">JSON</button>
                                        </div>
                                    )}

                                    <button onClick={(e) => { e.stopPropagation(); removeTrack(idx); }} className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default PlaylistEditor;