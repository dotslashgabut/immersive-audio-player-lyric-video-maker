import React, { useRef, useEffect, useState } from 'react';
import { X, Video, Settings, ImageIcon, Type, Layout, Palette, Music, FileText, Check, ListMusic, Bold, Italic, Underline, Strikethrough, AlignVerticalJustifyCenter, AlignVerticalJustifyStart, AlignVerticalJustifyEnd, Upload, Trash2, ChevronDown, Maximize, RotateCcw, Download, Keyboard as KeyboardIcon } from './Icons';
import { RenderConfig, VideoPreset } from '../types';
import { fontGroups } from '../utils/fonts';

const DEFAULT_CONFIG: RenderConfig = {
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
};

const textEffectGroups = [
    {
        label: "Basic",
        options: [
            { label: "Use Preset Default", value: "preset" },
            { label: "None", value: "none" },
            { label: "Drop Shadow", value: "shadow" },
            { label: "Outline", value: "outline" }
        ]
    },
    {
        label: "Glow Effects",
        options: [
            { label: "Soft Glow", value: "glow" },
            { label: "Neon Glow", value: "neon" },
            { label: "Multi-Color Neon", value: "neon-multi" }
        ]
    },
    {
        label: "3D & Pop",
        options: [
            { label: "3D Pop", value: "3d" },
            { label: "Embossed", value: "emboss" },
            { label: "Chrome Metallic", value: "chrome" },
            { label: "Gold Foil", value: "gold" }
        ]
    },
    {
        label: "Artistic",
        options: [
            { label: "Glassmorphism", value: "glass" },
            { label: "Gradient Fill", value: "gradient" },
            { label: "Fire", value: "fire" },
            { label: "Frozen Ice", value: "frozen" },
            { label: "Rainbow", value: "rainbow" },
            { label: "Reflection", value: "mirror" }
        ]
    },
    {
        label: "Retro & Stylized",
        options: [
            { label: "VHS Glitch", value: "vhs" },
            { label: "Retro 80s", value: "retro" },
            { label: "Cyberpunk", value: "cyberpunk" },
            { label: "Hologram", value: "hologram" },
            { label: "Comic Book", value: "comic" },
            { label: "Digital Glitch", value: "glitch-text" }
        ]
    }
];

const textAnimationGroups = [
    {
        label: "Static",
        options: [
            { label: "None (Static)", value: "none" }
        ]
    },
    {
        label: "Subtle",
        options: [
            { label: "Pulse", value: "pulse" },
            { label: "Breathe", value: "breathe" },
            { label: "Float", value: "float" },
            { label: "Sway", value: "sway" },
            { label: "Flicker", value: "flicker" }
        ]
    },
    {
        label: "Energetic",
        options: [
            { label: "Bounce", value: "bounce" },
            { label: "Shake", value: "shake" },
            { label: "Wave", value: "wave" },
            { label: "Wobble", value: "wobble" },
            { label: "Jello", value: "jello" },
            { label: "Rubber Band", value: "rubberband" }
        ]
    },
    {
        label: "Attention",
        options: [
            { label: "Heartbeat", value: "heartbeat" },
            { label: "Flash", value: "flash" },
            { label: "Tada!", value: "tada" },
            { label: "Swing", value: "swing" }
        ]
    },
    {
        label: "Rotation",
        options: [
            { label: "Gentle Rotate", value: "rotate" },
            { label: "Spin", value: "spin" }
        ]
    },
    {
        label: "Special",
        options: [
            { label: "Glitch", value: "glitch" },
            { label: "Typewriter", value: "typewriter" }
        ]
    }
];

const transitionGroups = [
    {
        label: "Basic",
        options: [
            { label: "Instant", value: "none" },
            { label: "Smooth Fade", value: "fade" }
        ]
    },
    {
        label: "Slide & Move",
        options: [
            { label: "Slide In", value: "slide" },
            { label: "Float Up", value: "float" },
            { label: "Drop In", value: "drop" },
            { label: "Lightspeed", value: "lightspeed" },
            { label: "Roll In", value: "roll" }
        ]
    },
    {
        label: "Scale & Transform",
        options: [
            { label: "Zoom In", value: "zoom" },
            { label: "Bounce In", value: "bounce" },
            { label: "Elastic Pop", value: "elastic" },
            { label: "Scale + Rotate", value: "scale-rotate" }
        ]
    },
    {
        label: "Rotation",
        options: [
            { label: "Flip In", value: "flip" },
            { label: "Rotate In", value: "rotate-in" },
            { label: "Spiral In", value: "spiral" },
            { label: "Swing In", value: "swing" }
        ]
    },
    {
        label: "Special",
        options: [
            { label: "Motion Blur", value: "blur" },
            { label: "Shatter In", value: "shatter" },
            { label: "Typewriter", value: "typewriter" }
        ]
    }
];

const GroupedSelection: React.FC<{
    value: string;
    onChange: (val: string) => void;
    groups: { label: string; options: { label: string; value: string }[] }[];
}> = ({ value, onChange, groups }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [originalValue, setOriginalValue] = useState(value);

    // Sync original value if it changes externally
    useEffect(() => {
        if (!isExpanded) setOriginalValue(value);
    }, [value, isExpanded]);

    const getLabel = (val: string) => {
        for (const g of groups) {
            const found = g.options.find(o => o.value === val);
            if (found) return found.label;
        }
        return val;
    };

    const handleMouseEnter = (val: string) => {
        onChange(val);
    };

    const handleContainerMouseLeave = () => {
        if (isExpanded) {
            onChange(originalValue);
        }
        setIsExpanded(false);
    };

    const handleSelect = (val: string) => {
        onChange(val);
        setOriginalValue(val);
        setIsExpanded(false);
    };

    return (
        <div className="space-y-2 relative" onMouseLeave={handleContainerMouseLeave}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-purple-500 hover:bg-zinc-700/50 transition-colors"
                title={isExpanded ? "Close List" : "Expand List"}
            >
                <span className="truncate">{getLabel(value)}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {isExpanded && (
                <div className="bg-zinc-900/50 border border-white/10 rounded-lg overflow-hidden transition-all animate-in fade-in slide-in-from-top-2 z-10">
                    {groups.map((group) => (
                        <div key={group.label} className="px-2 py-1.5 border-b border-white/5 last:border-0">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1 px-2">{group.label}</div>
                            <div className="grid grid-cols-1 gap-0.5">
                                {group.options.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onMouseEnter={() => handleMouseEnter(opt.value)}
                                        onClick={() => handleSelect(opt.value)}
                                        className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${value === opt.value ? 'bg-purple-600/50 text-white' : 'text-zinc-300 hover:bg-white/10'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};



const getFontLabel = (value: string, groups: typeof fontGroups, customName: string | null) => {
    if (value === 'CustomFont' && customName) return customName;
    for (const group of groups) {
        const found = group.options.find(o => o.value === value);
        if (found) return found.label;
    }
    return 'Select Font';
};

const FontSelector: React.FC<{ value: string; onChange: (val: string) => void; customFontName: string | null }> = ({ value, onChange, customFontName }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [originalValue, setOriginalValue] = useState(value);

    // Sync original value if it changes externally
    useEffect(() => {
        if (!isExpanded) setOriginalValue(value);
    }, [value, isExpanded]);

    const handleMouseEnter = (fontValue: string) => {
        onChange(fontValue);
    };

    const handleContainerMouseLeave = () => {
        if (isExpanded) {
            onChange(originalValue);
        }
    };

    const handleSelect = (fontValue: string) => {
        onChange(fontValue);
        setOriginalValue(fontValue);
        setIsExpanded(false);
    };

    return (
        <div className="space-y-2" onMouseLeave={handleContainerMouseLeave}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-purple-500 hover:bg-zinc-700/50 transition-colors"
                title={isExpanded ? "Close Font List" : "Expand Font List"}
            >
                <span className="truncate" style={{ fontFamily: value }}>
                    {getFontLabel(value, fontGroups, customFontName)}
                </span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {isExpanded && (
                <div className="bg-zinc-900/50 border border-white/10 rounded-lg overflow-hidden transition-all animate-in fade-in slide-in-from-top-2">
                    {customFontName && (
                        <div className="px-2 py-1.5 border-b border-white/5">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1 px-2">Custom</div>
                            <button
                                onMouseEnter={() => handleMouseEnter('CustomFont')}
                                onClick={() => handleSelect('CustomFont')}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${value === 'CustomFont' ? 'bg-purple-600 text-white' : 'text-zinc-300 hover:bg-white/10'}`}
                            >
                                <span style={{ fontFamily: 'CustomFont' }}>✨ {customFontName}</span>
                            </button>
                        </div>
                    )}
                    {fontGroups.map((group) => (
                        <div key={group.label} className="px-2 py-1.5 border-b border-white/5 last:border-0">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1 px-2">{group.label}</div>
                            <div className="grid grid-cols-1 gap-0.5">
                                {group.options.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onMouseEnter={() => handleMouseEnter(opt.value)}
                                        onClick={() => handleSelect(opt.value)}
                                        className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${value === opt.value ? 'bg-purple-600/50 text-white' : 'text-zinc-300 hover:bg-white/10'}`}
                                        title={opt.label}
                                    >
                                        <span style={{ fontFamily: opt.value }}>{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

interface RenderSettingsProps {
    config: RenderConfig;
    setConfig: (config: RenderConfig) => void;
    preset: VideoPreset;
    setPreset: (preset: VideoPreset) => void;
    onClose: () => void;
    isPlaylistMode: boolean;
    onRender: () => void;
    customFontName: string | null;
    onFontUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClearCustomFont: () => void;
}

const RenderSettings: React.FC<RenderSettingsProps> = ({
    config,
    setConfig,
    preset,
    setPreset,
    onClose,
    isPlaylistMode,
    onRender,
    customFontName,
    onFontUpload,
    onClearCustomFont
}) => {
    const sidebarRef = useRef<HTMLDivElement>(null);
    const fontInputRef = useRef<HTMLInputElement>(null);
    const settingsInputRef = useRef<HTMLInputElement>(null);
    const [showShortcuts, setShowShortcuts] = useState(false);


    const handleChange = (key: keyof RenderConfig, value: any) => {
        setPreset('custom');
        setConfig({ ...config, [key]: value });
    };

    const handleReset = () => {
        if (window.confirm('Reset all render settings to default?')) {
            setConfig(DEFAULT_CONFIG);
            setPreset('default');
        }
    };

    const handleExportSettings = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "render_settings.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                if (json && typeof json === 'object') {
                    // Start with default config, overwrite with imported json, preserve validity
                    // In a real app we might want to validate schema using zod or similar
                    setConfig({ ...DEFAULT_CONFIG, ...json });
                    setPreset('custom');
                    alert('Settings loaded successfully!');
                }
            } catch (err) {
                console.error(err);
                alert('Failed to parse settings file. Please ensure it is a valid JSON file.');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // Add event listener
        document.addEventListener('mousedown', handleClickOutside);

        // Cleanup the event listener on unmount
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    return (
        <div
            ref={sidebarRef}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 bottom-0 w-full sm:w-80 bg-zinc-900/95 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
        >
            {/* Header */}
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-3 md:px-4 bg-zinc-900/50">
                <div className="flex items-center gap-2">
                    <Settings size={18} className="text-purple-400" />
                    <h2 className="font-bold text-zinc-200">Render Settings</h2>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        ref={settingsInputRef}
                        type="file"
                        accept=".json,.txt"
                        className="hidden"
                        onChange={handleImportSettings}
                    />
                    <button
                        onClick={() => settingsInputRef.current?.click()}
                        className="p-1.5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
                        title="Import Settings"
                    >
                        <Upload size={16} />
                    </button>
                    <button
                        onClick={handleExportSettings}
                        className="p-1.5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
                        title="Export Settings"
                    >
                        <Download size={16} />
                    </button>
                    <div className="w-px h-4 bg-white/10 mx-1"></div>
                    <button
                        onClick={handleReset}
                        className="p-1.5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
                        title="Reset to Default"
                    >
                        <RotateCcw size={16} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-6 custom-scrollbar">

                {/* Render Mode */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <Video size={14} /> Render Scope
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => handleChange('renderMode', 'current')}
                            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${config.renderMode === 'current'
                                ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_10px_rgba(147,51,234,0.3)]'
                                : 'bg-zinc-800/50 border-white/5 text-zinc-400 hover:border-white/20'
                                }`}
                        >
                            Current Song
                        </button>
                        <button
                            onClick={() => handleChange('renderMode', 'playlist')}
                            disabled={!isPlaylistMode}
                            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${config.renderMode === 'playlist'
                                ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_10px_rgba(147,51,234,0.3)]'
                                : 'bg-zinc-800/50 border-white/5 text-zinc-400 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed'
                                }`}
                        >
                            All Playlist
                        </button>
                    </div>
                </section>

                {/* Background Source */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <ImageIcon size={14} /> Background Source
                    </h3>
                    <select
                        value={config.backgroundSource}
                        onChange={(e) => {
                            const newSource = e.target.value;
                            if (newSource === 'gradient' && !config.backgroundGradient) {
                                setPreset('custom');
                                setConfig({
                                    ...config,
                                    backgroundSource: 'gradient',
                                    backgroundGradient: 'linear-gradient(to bottom right, #312e81, #581c87, #000000)'
                                });
                            } else if (newSource === 'smart-gradient' && (!config.backgroundColor || config.backgroundColor === '#000000')) {
                                setPreset('custom');
                                setConfig({
                                    ...config,
                                    backgroundSource: 'smart-gradient',
                                    backgroundColor: '#581c87' // Default for smart gradient
                                });
                            } else if (newSource === 'color' && !config.backgroundColor) {
                                setPreset('custom');
                                setConfig({
                                    ...config,
                                    backgroundSource: 'color',
                                    backgroundColor: '#000000' // Default for solid color
                                });
                            } else {
                                handleChange('backgroundSource', newSource);
                            }
                        }}
                        className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                        <option value="timeline">From Timeline</option>
                        <option value="custom">Metadata / Default</option>
                        <option value="smart-gradient">Smart Gradient</option>
                        <option value="gradient">Gradient (Manual)</option>
                        <option value="color">Solid Color</option>
                    </select>

                    {config.backgroundSource === 'smart-gradient' && (
                        <div className="flex items-center gap-3 bg-zinc-800/30 p-2 rounded-lg border border-white/5">
                            <input
                                type="color"
                                value={config.backgroundColor}
                                onChange={(e) => handleChange('backgroundColor', e.target.value)}
                                className="w-10 h-10 rounded cursor-pointer bg-transparent border-none shrink-0"
                            />
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-xs text-zinc-300 font-medium">Pick Base Color</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-500">Hex:</span>
                                    <input
                                        type="text"
                                        value={config.backgroundColor}
                                        onChange={(e) => handleChange('backgroundColor', e.target.value)}
                                        className="bg-transparent border-b border-zinc-700 focus:border-purple-500 text-[10px] text-zinc-300 font-mono focus:outline-none p-0 w-20 uppercase"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {config.backgroundSource === 'color' && (
                        <div className="flex items-center gap-3 bg-zinc-800/30 p-2 rounded-lg border border-white/5">
                            <input
                                type="color"
                                value={config.backgroundColor}
                                onChange={(e) => handleChange('backgroundColor', e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none shrink-0"
                            />
                            <input
                                type="text"
                                value={config.backgroundColor}
                                onChange={(e) => handleChange('backgroundColor', e.target.value)}
                                className="bg-transparent border-b border-zinc-700 text-xs text-zinc-300 font-mono flex-1 focus:outline-none focus:border-purple-500 uppercase py-1"
                            />
                        </div>
                    )}

                    {config.backgroundSource === 'gradient' && (
                        <input
                            type="text"
                            value={config.backgroundGradient}
                            onChange={(e) => handleChange('backgroundGradient', e.target.value)}
                            placeholder="linear-gradient(to bottom right, #312e81, #581c87, #000000)"
                            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                    )}
                </section>

                {/* Lyric Display Mode */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <FileText size={14} /> Lyric Display Mode
                    </h3>
                    <select
                        value={config.lyricDisplayMode}
                        onChange={(e) => handleChange('lyricDisplayMode', e.target.value)}
                        className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                        <option value="all">Show All (Default)</option>
                        <option value="previous-next">Prev & Next (Centered)</option>
                        <option value="next-only">Current & Next</option>
                        <option value="active-only">Current Line Only</option>
                    </select>
                </section>

                {/* Elements Visibility */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <Layout size={14} /> Visible Elements
                    </h3>
                    <div className="space-y-2">
                        {[
                            { label: 'Lyrics / Subtitles', key: 'showLyrics' },
                            { label: 'Song Title', key: 'showTitle' },
                            { label: 'Artist Name', key: 'showArtist' },
                            { label: 'Cover Art', key: 'showCover' },
                            { label: 'Intro Info', key: 'showIntro' },
                        ].map((item) => (
                            <label key={item.key} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/30 border border-white/5 hover:bg-zinc-800/50 cursor-pointer transition-colors">
                                <span className="text-xs text-zinc-300">{item.label}</span>
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={(config as any)[item.key]}
                                        onChange={(e) => handleChange(item.key as keyof RenderConfig, e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-8 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
                                </div>
                            </label>
                        ))}
                    </div>
                </section>

                {/* Song Info Design */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <Music size={14} /> Song Info Design
                    </h3>

                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Position</label>
                            <div className="grid grid-cols-3 gap-2">
                                {/* Top Row */}
                                <button
                                    onClick={() => handleChange('infoPosition', 'top-left')}
                                    className={`h-8 rounded-md border flex items-start justify-start p-1 transition-all ${config.infoPosition === 'top-left' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`}
                                >
                                    <div className="w-2 h-2 bg-current rounded-sm" />
                                </button>
                                <button
                                    onClick={() => handleChange('infoPosition', 'top-center')}
                                    className={`h-8 rounded-md border flex items-start justify-center p-1 transition-all ${config.infoPosition === 'top-center' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`}
                                >
                                    <div className="w-2 h-2 bg-current rounded-sm" />
                                </button>
                                <button
                                    onClick={() => handleChange('infoPosition', 'top-right')}
                                    className={`h-8 rounded-md border flex items-start justify-end p-1 transition-all ${config.infoPosition === 'top-right' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`}
                                >
                                    <div className="w-2 h-2 bg-current rounded-sm" />
                                </button>

                                {/* Bottom Row */}
                                <button
                                    onClick={() => handleChange('infoPosition', 'bottom-left')}
                                    className={`h-8 rounded-md border flex items-end justify-start p-1 transition-all ${config.infoPosition === 'bottom-left' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`}
                                >
                                    <div className="w-2 h-2 bg-current rounded-sm" />
                                </button>
                                <button
                                    onClick={() => handleChange('infoPosition', 'bottom-center')}
                                    className={`h-8 rounded-md border flex items-end justify-center p-1 transition-all ${config.infoPosition === 'bottom-center' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`}
                                >
                                    <div className="w-2 h-2 bg-current rounded-sm" />
                                </button>
                                <button
                                    onClick={() => handleChange('infoPosition', 'bottom-right')}
                                    className={`h-8 rounded-md border flex items-end justify-end p-1 transition-all ${config.infoPosition === 'bottom-right' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`}
                                >
                                    <div className="w-2 h-2 bg-current rounded-sm" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Style</label>
                            <select
                                value={config.infoStyle}
                                onChange={(e) => handleChange('infoStyle', e.target.value)}
                                className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                                <option value="classic">Classic (Detailed)</option>
                                <option value="modern_art">Modern + Cover</option>
                                <option value="circle_art">Circle Cover</option>
                                <option value="modern">Modern (Text Only)</option>
                                <option value="box">Boxed Cover</option>
                                <option value="minimal">Minimal (Text Only)</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Edge Margin</label>
                                <span className="text-[10px] text-zinc-400 font-mono">{(config.infoMarginScale ?? 1).toFixed(1)}x</span>
                            </div>
                            <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5">
                                <span className="text-zinc-500"><Maximize size={12} /></span>
                                <input
                                    type="range"
                                    min="0.0"
                                    max="5.0"
                                    step="0.1"
                                    value={config.infoMarginScale ?? 1.0}
                                    onChange={(e) => handleChange('infoMarginScale', parseFloat(e.target.value))}
                                    className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Text Presets & Styling */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <Type size={14} /> Typography & Style
                    </h3>

                    <div className="space-y-4 pt-1">
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Alignment</label>
                            <div className="flex bg-zinc-800 rounded-lg p-1">
                                {['left', 'center', 'right'].map((align) => (
                                    <button
                                        key={align}
                                        onClick={() => handleChange('textAlign', align)}
                                        className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${config.textAlign === align ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                                            }`}
                                    >
                                        {align}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Vertical Position</label>
                            <div className="flex bg-zinc-800 rounded-lg p-1 gap-1">
                                <button
                                    onClick={() => handleChange('contentPosition', 'top')}
                                    className={`flex-1 py-1.5 rounded-md flex items-center justify-center transition-all ${config.contentPosition === 'top' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Top"
                                >
                                    <AlignVerticalJustifyStart size={14} />
                                </button>
                                <button
                                    onClick={() => handleChange('contentPosition', 'center')}
                                    className={`flex-1 py-1.5 rounded-md flex items-center justify-center transition-all ${config.contentPosition === 'center' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Center"
                                >
                                    <AlignVerticalJustifyCenter size={14} />
                                </button>
                                <button
                                    onClick={() => handleChange('contentPosition', 'bottom')}
                                    className={`flex-1 py-1.5 rounded-md flex items-center justify-center transition-all ${config.contentPosition === 'bottom' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Bottom"
                                >
                                    <AlignVerticalJustifyEnd size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Style</label>
                            <div className="flex bg-zinc-800 rounded-lg p-1 gap-1">
                                <button
                                    onClick={() => handleChange('fontWeight', config.fontWeight === 'bold' ? 'normal' : 'bold')}
                                    className={`flex-1 py-1.5 rounded-md flex items-center justify-center transition-all ${config.fontWeight === 'bold' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Bold"
                                >
                                    <Bold size={14} />
                                </button>
                                <button
                                    onClick={() => handleChange('fontStyle', config.fontStyle === 'italic' ? 'normal' : 'italic')}
                                    className={`flex-1 py-1.5 rounded-md flex items-center justify-center transition-all ${config.fontStyle === 'italic' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Italic"
                                >
                                    <Italic size={14} />
                                </button>
                                <button
                                    onClick={() => handleChange('textDecoration', config.textDecoration === 'underline' ? 'none' : 'underline')}
                                    className={`flex-1 py-1.5 rounded-md flex items-center justify-center transition-all ${config.textDecoration === 'underline' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Underline"
                                >
                                    <Underline size={14} />
                                </button>
                                <button
                                    onClick={() => handleChange('textDecoration', config.textDecoration === 'line-through' ? 'none' : 'line-through')}
                                    className={`flex-1 py-1.5 rounded-md flex items-center justify-center transition-all ${config.textDecoration === 'line-through' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Strikethrough"
                                >
                                    <Strikethrough size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Font Family</label>
                            <FontSelector
                                value={config.fontFamily}
                                onChange={(val) => handleChange('fontFamily', val)}
                                customFontName={customFontName}
                            />
                        </div>

                        {/* Custom Font Upload */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Custom Font File</label>
                            <input
                                ref={fontInputRef}
                                type="file"
                                accept=".ttf,.otf,.woff,.woff2"
                                onChange={onFontUpload}
                                className="hidden"
                            />
                            {customFontName ? (
                                <div className="flex items-center gap-2 bg-zinc-800/50 border border-purple-500/30 rounded-lg px-3 py-2">
                                    <Type size={14} className="text-purple-400 shrink-0" />
                                    <span className="text-xs text-purple-300 font-medium truncate flex-1">{customFontName}</span>
                                    <button
                                        onClick={() => {
                                            handleChange('fontFamily', 'CustomFont');
                                        }}
                                        className={`text-[10px] px-2 py-1 rounded transition-colors ${config.fontFamily === 'CustomFont' ? 'bg-purple-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
                                    >
                                        {config.fontFamily === 'CustomFont' ? 'Active' : 'Use'}
                                    </button>
                                    <button
                                        onClick={onClearCustomFont}
                                        className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                                        title="Remove custom font"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => fontInputRef.current?.click()}
                                    className="w-full flex items-center justify-center gap-2 bg-zinc-800/50 border border-dashed border-white/10 hover:border-purple-500/50 rounded-lg px-3 py-2.5 text-zinc-400 hover:text-purple-300 transition-colors"
                                >
                                    <Upload size={14} />
                                    <span className="text-xs">Upload Custom Font (.ttf, .otf, .woff2)</span>
                                </button>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Font Size</label>
                                <span className="text-[10px] text-zinc-400 font-mono">{(config.fontSizeScale * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5">
                                <span className="text-zinc-500"><Type size={12} /></span>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="3.0"
                                    step="0.1"
                                    value={config.fontSizeScale}
                                    onChange={(e) => handleChange('fontSizeScale', parseFloat(e.target.value))}
                                    className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                />
                                <span className="text-zinc-300"><Type size={16} /></span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Color</label>
                            <div className="flex items-center gap-3 bg-zinc-800/30 p-2 rounded-lg border border-white/5">
                                <input
                                    type="color"
                                    value={config.fontColor}
                                    onChange={(e) => handleChange('fontColor', e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-none shrink-0"
                                />
                                <input
                                    type="text"
                                    value={config.fontColor}
                                    onChange={(e) => handleChange('fontColor', e.target.value)}
                                    className="bg-transparent border-b border-zinc-700 text-xs text-zinc-300 font-mono flex-1 focus:outline-none focus:border-purple-500 uppercase py-1"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Text Effect</label>
                            <GroupedSelection
                                value={config.textEffect}
                                onChange={(val) => handleChange('textEffect', val)}
                                groups={textEffectGroups}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Text Animation</label>
                            <GroupedSelection
                                value={config.textAnimation}
                                onChange={(val) => handleChange('textAnimation', val)}
                                groups={textAnimationGroups}
                            />
                        </div>

                    </div>



                    <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Transition</label>
                        <GroupedSelection
                            value={config.transitionEffect}
                            onChange={(val) => handleChange('transitionEffect', val)}
                            groups={transitionGroups}
                        />
                    </div>

                    <div className="pt-2 border-t border-white/5 space-y-2">
                        <p className="text-[10px] text-zinc-500 italic leading-relaxed">
                            <span className="text-purple-400 font-bold">*Tip:</span> You can backup your current configuration using the <span className="text-zinc-300">Export</span> button above.
                        </p>
                        <button
                            onClick={() => setShowShortcuts(true)}
                            className="w-full flex items-center justify-center gap-2 bg-zinc-800/30 border border-white/5 hover:bg-zinc-800 hover:border-white/20 text-xs text-zinc-400 hover:text-white py-2 rounded-lg transition-all"
                        >
                            <KeyboardIcon size={14} /> View Keyboard Shortcuts
                        </button>
                    </div>
                </section>

                {showShortcuts && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in cursor-default" onClick={() => setShowShortcuts(false)}>
                        <div className="bg-zinc-900 border border-white/10 rounded-xl shadow-2xl w-[480px] max-w-[90vw] overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-800/50">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <KeyboardIcon size={18} className="text-purple-400" />
                                    Keyboard Shortcuts
                                </h3>
                                <button
                                    onClick={() => setShowShortcuts(false)}
                                    className="p-1.5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto space-y-6 custom-scrollbar">
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Media Controls</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="flex justify-between items-center"><span className="text-zinc-300">Play / Pause</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">Space</kbd></div>
                                        <div className="flex justify-between items-center"><span className="text-zinc-300">Stop</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">S</kbd></div>
                                        <div className="flex justify-between items-center"><span className="text-zinc-300">Next Song</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">N</kbd></div>
                                        <div className="flex justify-between items-center"><span className="text-zinc-300">Prev Song</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">B</kbd></div>
                                        <div className="flex justify-between items-center"><span className="text-zinc-300">Repeat Mode</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">R</kbd></div>
                                        <div className="flex justify-between items-center"><span className="text-zinc-300">Mute / Unmute</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">M</kbd></div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">View & Appearance</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="flex justify-between items-center"><span className="text-zinc-300">Fullscreen</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">F</kbd></div>
                                        <div className="flex justify-between items-center"><span className="text-zinc-300">Playlist Mode</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">L</kbd></div>
                                        <div className="flex justify-between items-center"><span className="text-zinc-300">Timeline / Edit</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">T</kbd></div>
                                        <div className="flex justify-between items-center"><span className="text-zinc-300">Toggle Info</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">I</kbd></div>
                                        <div className="flex justify-between items-center"><span className="text-zinc-300">Toggle Player</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">P</kbd></div>
                                        <div className="flex justify-between items-center"><span className="text-zinc-300">Auto-Hide HUD</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">H</kbd></div>
                                        <div className="flex justify-between items-center"><span className="text-zinc-300">Render Settings</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">D</kbd></div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Adjustment & Export</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="flex justify-between items-center"><span className="text-zinc-300">Cycle Presets</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">J</kbd></div>
                                        <div className="flex justify-between items-center"><span className="text-zinc-300">Font Size</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">+ / -</kbd></div>
                                        <div className="flex justify-between items-center"><span className="text-zinc-300">Seek +/- 5s</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">Arrows</kbd></div>
                                        <div className="flex justify-between items-center"><span className="text-zinc-300">Scroll Lyrics</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">Up/Down</kbd></div>
                                        <div className="flex justify-between col-span-2 items-center bg-purple-900/20 p-2 rounded-lg border border-purple-500/20">
                                            <span className="text-purple-300 font-medium">Quick Export</span>
                                            <div className="flex gap-1 items-center">
                                                <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-mono text-[10px] border border-white/10">Ctrl</kbd>
                                                <span className="text-zinc-500 text-[10px]">+</span>
                                                <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-mono text-[10px] border border-white/10">Shift</kbd>
                                                <span className="text-zinc-500 text-[10px]">+</span>
                                                <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-mono text-[10px] border border-white/10">E</kbd>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-white/10 bg-zinc-900/50 text-center">
                                <p className="text-[10px] text-zinc-500">Press <kbd className="font-mono text-zinc-400">Esc</kbd> to close</p>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Footer / Info */}
            <div className="p-4 border-t border-white/10 bg-zinc-900/50 space-y-3">
                <button
                    onClick={onRender}
                    className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <Video size={16} /> Start Render
                </button>
                <p className="text-[10px] text-zinc-500 text-center leading-relaxed italic">
                    These settings will be applied to the final video. Ensure all sources are loaded correctly.
                </p>
            </div>
        </div>
    );
};

export default RenderSettings;
