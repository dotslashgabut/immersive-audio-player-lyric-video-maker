import React, { useRef, useEffect, useState } from 'react';
import { X, Video, Settings, ImageIcon, Type, Layout, Palette, Music, FileText, Check, ListMusic, Bold, Italic, Underline, Strikethrough, AlignVerticalJustifyCenter, AlignVerticalJustifyStart, AlignVerticalJustifyEnd, Upload, Trash2, ChevronDown, Maximize, RotateCcw, Download, Keyboard as KeyboardIcon, Sparkles } from './Icons';
import { RenderConfig, VideoPreset, RenderEngine, FFmpegCodec } from '../types';
import { fontGroups, loadSingleGoogleFont } from '../utils/fonts';
import { PRESET_DEFINITIONS, videoPresetGroups } from '../utils/presets';
import { useUI } from '../contexts/UIContext';

const GoogleFontLoader: React.FC<{
    onApply: (fontName: string) => void;
    placeholder?: string;
}> = ({ onApply, placeholder = "Google Font Name" }) => {
    const { toast } = useUI();
    const [input, setInput] = useState('');

    const handleLoad = () => {
        if (!input.trim()) return;
        // Normalize: trim and replace multiple spaces with single space.
        // Google Fonts handles spaces as '+' in URL, so we keep single spaces.
        const fontName = input.trim().replace(/['"]/g, '').replace(/\s+/g, ' ');

        loadSingleGoogleFont(fontName);
        onApply(fontName);
        toast.success(`Loaded & Applied: ${fontName}`);
        setInput('');
    };

    return (
        <div className="flex gap-2 mt-2 items-center">
            <span className="text-[10px] text-zinc-500 font-bold uppercase whitespace-nowrap">Google Font:</span>
            <input
                type="text"
                name="google-font-name"
                aria-label="Google Font Name"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                className="flex-1 min-w-0 bg-zinc-900 border border-white/10 rounded-md px-2 py-1 text-[10px] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLoad();
                }}
            />
            <button
                onClick={handleLoad}
                disabled={!input.trim()}
                className="bg-zinc-700 hover:bg-zinc-600 text-white text-[10px] px-2 py-1 rounded-md font-medium disabled:opacity-50 transition-colors"
                title="Load and apply"
            >
                Load
            </button>
        </div>
    );
};

const DEFAULT_CONFIG: RenderConfig = {
    backgroundSource: 'custom',
    backgroundColor: '#581c87',
    backgroundGradient: 'linear-gradient(to bottom right, #312e81, #581c87, #000000)',
    renderMode: 'current',
    textAlign: 'center',
    contentPosition: 'center',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSizeScale: 1.0,
    lyricLineHeight: 1.3,
    fontColor: '#ffffff',
    textEffect: 'preset',
    textAnimation: 'none',
    transitionEffect: 'none',
    lyricDisplayMode: 'all',
    fontWeight: 'bold',
    fontStyle: 'normal',
    lyricStyleTarget: 'active-only',
    textDecoration: 'none',
    showTitle: true,
    showArtist: true,
    showCover: true,
    showIntro: true,
    showLyrics: true,
    infoPosition: 'top-left',
    infoStyle: 'classic',
    infoMarginScale: 1.0,
    infoSizeScale: 1.0,
    infoFontFamily: 'ui-sans-serif, system-ui, sans-serif',
    infoFontWeight: 'bold',
    infoFontStyle: 'normal',
    infoFontColor: '#ffffff',
    backgroundBlurStrength: 0,
    introMode: 'auto',
    introText: '',
    textCase: 'none',
    highlightEffect: 'karaoke',
    highlightColor: '#fb923c', // Default Orange
    highlightBackground: '#fb923c',
    showChannelInfo: false,
    channelInfoText: 'Music Channel',
    channelInfoPosition: 'bottom-right',
    channelInfoStyle: 'classic',
    channelInfoSizeScale: 1.0,
    channelInfoMarginScale: 1.0,
    channelInfoFontFamily: 'ui-sans-serif, system-ui, sans-serif',
    channelInfoFontWeight: 'bold',
    channelInfoFontStyle: 'normal',
    channelInfoFontColor: '#ffffff',
    channelInfoImage: undefined,
    useCustomHighlightColors: false,
    backgroundImage: undefined,
    visualTransitionType: 'none',
    visualTransitionDuration: 1.0,
    enableGradientOverlay: false,
    useRealColorMedia: false,
    marginTopScale: 1.0,
    marginBottomScale: 1.0,
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

const visualTransitionGroups = [
    {
        label: "Visual Transition",
        options: [
            { label: "None (Cut)", value: "none" },
            { label: "Crossfade", value: "crossfade" },
            { label: "Fade Through Black", value: "fade-to-black" }
        ]
    }
];

export const highlightEffectGroups = [
    {
        label: "Basic",
        options: [
            { label: "None", value: "none" },
            { label: "Simple Color", value: "color" },
            { label: "Scale Up", value: "scale" },
            { label: "Intense Glow", value: "glow" },
            { label: "Background Box", value: "background" }
        ]
    },
    {
        label: "Karaoke Standard",
        options: [
            { label: "Default (Line/Fill)", value: "karaoke" },
            { label: "Smooth Transition", value: "karaoke-smooth" },
            { label: "Smooth Transition White", value: "karaoke-smooth-white" },
            { label: "Smooth Transition Plus", value: "karaoke-smooth-plus" },
            { label: "Fill Background", value: "karaoke-fill" },
            { label: "Outline Only", value: "karaoke-outline" },
            { label: "Underline", value: "karaoke-underline" },
            { label: "Shadow", value: "karaoke-shadow" },
            { label: "Gradient", value: "karaoke-gradient" }
        ]
    },
    {
        label: "Animations",
        options: [
            { label: "Bounce", value: "karaoke-bounce" },
            { label: "Wave", value: "karaoke-wave" },
            { label: "Zoom In", value: "karaoke-scale" }
        ]
    },
    {
        label: "Neon & Glow",
        options: [
            { label: "Neon White", value: "karaoke-neon" },
            { label: "Glow Blue", value: "karaoke-glow-blue" },
            { label: "Glow Pink", value: "karaoke-glow-pink" },
            { label: "Multi-Color Neon", value: "karaoke-neon-multi" },
            { label: "Soft Glow", value: "karaoke-soft-glow" }
        ]
    },
    {
        label: "3D & Artistic",
        options: [
            { label: "3D Pop", value: "karaoke-3d" },
            { label: "Embossed", value: "karaoke-emboss" },
            { label: "Chrome Metallic", value: "karaoke-chrome" },
            { label: "Gold Foil", value: "karaoke-gold" },
            { label: "Glassmorphism", value: "karaoke-glass" },
            { label: "Gradient Fill", value: "karaoke-gradient-fill" },
            { label: "Fire", value: "karaoke-fire" },
            { label: "Frozen Ice", value: "karaoke-frozen" },
            { label: "Rainbow", value: "karaoke-rainbow" },
            { label: "Reflection", value: "karaoke-mirror" }
        ]
    },
    {
        label: "Retro & Stylized",
        options: [
            { label: "VHS Glitch", value: "karaoke-vhs" },
            { label: "Retro 80s", value: "karaoke-retro" },
            { label: "Cyberpunk", value: "karaoke-cyberpunk" },
            { label: "Hologram", value: "karaoke-hologram" },
            { label: "Comic Book", value: "karaoke-comic" },
            { label: "Digital Glitch", value: "karaoke-glitch-text" }
        ]
    },
    {
        label: "Detailed Animations",
        options: [
            { label: "Pulse", value: "karaoke-pulse" },
            { label: "Breathe", value: "karaoke-breathe" },
            { label: "Float", value: "karaoke-float" },
            { label: "Sway", value: "karaoke-sway" },
            { label: "Flicker", value: "karaoke-flicker" },
            { label: "Shake", value: "karaoke-shake" },
            { label: "Wobble", value: "karaoke-wobble" },
            { label: "Jello", value: "karaoke-jello" },
            { label: "Rubber Band", value: "karaoke-rubberband" },
            { label: "Heartbeat", value: "karaoke-heartbeat" },
            { label: "Flash", value: "karaoke-flash" },
            { label: "Tada!", value: "karaoke-tada" },
            { label: "Swing", value: "karaoke-swing" },
            { label: "Gentle Rotate", value: "karaoke-rotate" },
            { label: "Spin", value: "karaoke-spin" },
            { label: "Glitch Anim", value: "karaoke-glitch" },
            { label: "Typewriter", value: "karaoke-typewriter" }
        ]
    },
    {
        label: "Motion & Transitions",
        options: [
            { label: "Smooth Fade", value: "karaoke-fade" },
            { label: "Slide In", value: "karaoke-slide" },
            { label: "Drop In", value: "karaoke-drop" },
            { label: "Lightspeed", value: "karaoke-lightspeed" },
            { label: "Roll In", value: "karaoke-roll" },
            { label: "Zoom In", value: "karaoke-zoom" },
            { label: "Elastic Pop", value: "karaoke-elastic" },
            { label: "Scale + Rotate", value: "karaoke-scale-rotate" },
            { label: "Flip In", value: "karaoke-flip" },
            { label: "Rotate In", value: "karaoke-rotate-in" },
            { label: "Spiral In", value: "karaoke-spiral" },
            { label: "Motion Blur", value: "karaoke-blur" },
            { label: "Shatter", value: "karaoke-shatter" }
        ]
    },
    {
        label: "Solid Colors",
        options: [
            { label: "Blue", value: "karaoke-blue" },
            { label: "Purple", value: "karaoke-purple" },
            { label: "Green", value: "karaoke-green" },
            { label: "Pink", value: "karaoke-pink" },
            { label: "Cyan", value: "karaoke-cyan" }
        ]
    },
    {
        label: "Shapes",
        options: [
            { label: "Pill Shape", value: "karaoke-pill" },
            { label: "Square Box", value: "karaoke-box" },
            { label: "Rounded Box", value: "karaoke-rounded" }
        ]
    }
];

export const deriveHighlightColors = (effect: string): { color: string, bg: string } | null => {
    let color = '';
    let bg = '';

    if (effect.includes('blue') || effect.includes('cyan')) {
        color = effect.includes('cyan') ? '#06b6d4' : '#3b82f6';
        bg = color;
    } else if (effect.includes('purple')) {
        color = '#a855f7';
        bg = color;
    } else if (effect.includes('green')) {
        color = '#22c55e';
        bg = color;
    } else if (effect.includes('pink')) {
        color = '#ec4899';
        bg = color;
    } else if (effect === 'karaoke-pill' || effect === 'karaoke-box' || effect === 'karaoke-rounded') {
        color = '#fb923c';
        bg = '#fb923c';
    }

    if (color) {
        return { color, bg };
    }
    return null;
};

const backgroundSourceGroups = [
    {
        label: "Source",
        options: [
            { label: "From Timeline", value: "timeline" },
            { label: "Metadata / Default", value: "custom" },
            { label: "Smart Gradient", value: "smart-gradient" },
            { label: "Gradient (Manual)", value: "gradient" },
            { label: "Solid Color", value: "color" },
            { label: "Custom Image", value: "image" }
        ]
    }
];

export const lyricDisplayGroups = [
    {
        label: "Display Modes",
        options: [
            { label: "Show All (Default)", value: "all" },
            { label: "Prev & Next (Centered)", value: "previous-next" },
            { label: "Current & Next", value: "next-only" },
            { label: "Current Line Only", value: "active-only" }
        ]
    }
];

export const textCaseOptions = ['none', 'upper', 'lower', 'title', 'sentence', 'invert'];

const infoStyleGroups = [
    {
        label: "Layout Styles",
        options: [
            { label: "Classic (Detailed)", value: "classic" },
            { label: "Modern + Cover", value: "modern_art" },
            { label: "Circle Cover", value: "circle_art" },
            { label: "Modern (Text Only)", value: "modern" },
            { label: "Boxed Cover", value: "box" },
            { label: "Minimal (Text Only)", value: "minimal" }
        ]
    }
];

const channelInfoStyleGroups = [
    {
        label: "Layout Styles",
        options: [
            { label: "Classic (Row)", value: "classic" },
            { label: "Modern (Col)", value: "modern" },
            { label: "Minimal (Text Only)", value: "minimal" },
            { label: "Circle (Avatar)", value: "circle" },
            { label: "Logo Only", value: "logo" },
            { label: "Boxed", value: "box" }
        ]
    }
];

const fpsGroups = [
    {
        label: "Frame Rate",
        options: [
            { label: "24 FPS (Cinematic)", value: "24" },
            { label: "30 FPS (Standard)", value: "30" },
            { label: "60 FPS (Smooth)", value: "60" }
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

const FontSelector: React.FC<{ value: string; onChange: (val: string) => void; customFontName: string | null; groups?: typeof fontGroups }> = ({ value, onChange, customFontName, groups = fontGroups }) => {
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
                    {getFontLabel(value, groups, customFontName)}
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
    hasPlaylist: boolean;
    onRender: () => void;
    customFontName: string | null;
    onFontUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClearCustomFont: () => void;
    resolution: '720p' | '1080p';
    setResolution: (res: '720p' | '1080p') => void;
    aspectRatio: '16:9' | '9:16' | '3:4' | '1:1' | '1:2' | '2:1' | '2:3' | '3:2' | '20:9' | '21:9' | '4:5' | '4:3';
    setAspectRatio: (ratio: '16:9' | '9:16' | '3:4' | '1:1' | '1:2' | '2:1' | '2:3' | '3:2' | '20:9' | '21:9' | '4:5' | '4:3') => void;
    renderCodec: string;
    setRenderCodec: (codec: string) => void;
    supportedCodecs: { label: string; value: string }[];
    renderQuality: 'low' | 'med' | 'high';
    setRenderQuality: (q: 'low' | 'med' | 'high') => void;
    renderFps: number;
    setRenderFps: (fps: number) => void;
    // FFmpeg render engine options
    renderEngine: RenderEngine;
    setRenderEngine: (engine: RenderEngine) => void;
    ffmpegCodec: FFmpegCodec;
    setFfmpegCodec: (codec: FFmpegCodec) => void;
    customChannelFontName?: string | null;
    onChannelFontUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClearChannelCustomFont?: () => void;
    customInfoFontName?: string | null;
    onInfoFontUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClearInfoCustomFont?: () => void;
}

// Generate font options from presets
const presetFontOptions = Object.values(PRESET_DEFINITIONS)
    .filter(p => p.fontFamily)
    .reduce((acc, p) => {
        if (!acc.find(x => x.value === p.fontFamily)) {
            let label = p.fontFamily!.split(',')[0].replace(/['"]/g, '');
            if (label.includes('ui-serif')) label = "Classic Serif";
            else if (label.includes('ui-monospace')) label = "Monospace";
            else if (label === 'sans-serif') label = "Default Sans";

            acc.push({ label: `${label} (Preset)`, value: p.fontFamily! });
        }
        return acc;
    }, [] as { label: string; value: string }[]);

const fullFontGroups = [
    { label: "Visual Presets", options: presetFontOptions },
    ...fontGroups
];

const RenderSettings: React.FC<RenderSettingsProps> = ({
    config,
    setConfig,
    preset,
    setPreset,
    onClose,
    isPlaylistMode,
    hasPlaylist,
    onRender,
    customFontName,
    onFontUpload,
    onClearCustomFont,
    resolution,
    setResolution,
    aspectRatio,
    setAspectRatio,
    renderCodec,
    setRenderCodec,
    supportedCodecs,
    renderQuality,
    setRenderQuality,
    renderFps,
    setRenderFps,
    renderEngine,
    setRenderEngine,
    ffmpegCodec,
    setFfmpegCodec,
    customChannelFontName,
    onChannelFontUpload,
    onClearChannelCustomFont,
    customInfoFontName,
    onInfoFontUpload,
    onClearInfoCustomFont
}) => {
    const { toast, confirm } = useUI();
    const [loadedGoogleFonts, setLoadedGoogleFonts] = useState<string[]>([]);

    const handleGoogleFontApply = (fontName: string, targetKey: keyof RenderConfig) => {
        if (!loadedGoogleFonts.includes(fontName)) {
            setLoadedGoogleFonts(prev => [fontName, ...prev]);
        }
        // Save as quoted string if it contains spaces (CSS requirement safety)
        const formattedValue = fontName.includes(' ') ? `'${fontName}'` : fontName;
        handleChange(targetKey, formattedValue);
    };

    const dynamicFontGroups = React.useMemo(() => {
        const groups = [];

        // 1. Add "Same as Lyrics" option if valid
        const lyricFontName = config.fontFamily ? config.fontFamily.split(',')[0].replace(/['"]/g, '') : '';
        if (lyricFontName) {
            groups.push({
                label: "Matched",
                options: [{ label: `Use Lyric Font (${lyricFontName})`, value: config.fontFamily! }]
            });
        }

        // 2. Add Loaded Google Fonts
        if (loadedGoogleFonts.length > 0) {
            groups.push({
                label: "Loaded Google Fonts",
                options: loadedGoogleFonts.map(f => ({
                    label: f,
                    value: f.includes(' ') ? `'${f}'` : f
                }))
            });
        }

        // 3. Add Standard & Preset Groups
        return [...groups, ...fullFontGroups];
    }, [loadedGoogleFonts, config.fontFamily]);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const fontInputRef = useRef<HTMLInputElement>(null);
    const channelFontInputRef = useRef<HTMLInputElement>(null);
    const infoFontInputRef = useRef<HTMLInputElement>(null);
    const channelImageInputRef = useRef<HTMLInputElement>(null);
    const backgroundImageInputRef = useRef<HTMLInputElement>(null);
    const settingsInputRef = useRef<HTMLInputElement>(null);
    const [showShortcuts, setShowShortcuts] = useState(false);


    const handleChange = (key: keyof RenderConfig, value: any) => {
        // setPreset('custom'); // Disabled to allow customized base presets

        let newConfig = { ...config, [key]: value };

        // Logic to sync dependencies
        if (key === 'highlightEffect') {
            const effect = value as string;
            const derived = deriveHighlightColors(effect);

            // Automatically disable custom colors when switching effects
            // so the new effect's default colors (or derived ones) are visible
            newConfig.useCustomHighlightColors = false;

            if (derived) {
                newConfig.highlightColor = derived.color;
                newConfig.highlightBackground = derived.bg;
            } else {
                // Return to default orange if the effect doesn't enforce a color
                newConfig.highlightColor = '#fb923c';
                newConfig.highlightBackground = '#fb923c';
            }
        } else if (key === 'useCustomHighlightColors' && value === false) {
            // When turning off custom colors, revert to the effect's default colors
            const effect = config.highlightEffect;
            const derived = deriveHighlightColors(effect);

            if (derived) {
                newConfig.highlightColor = derived.color;
                newConfig.highlightBackground = derived.bg;
            } else {
                // Default fallback (Orange)
                newConfig.highlightColor = '#fb923c';
                newConfig.highlightBackground = '#fb923c';
            }
        }

        setConfig(newConfig);
    };

    const handlePresetSelect = (newPreset: VideoPreset) => {
        setPreset(newPreset);
        const presetConfig = PRESET_DEFINITIONS[newPreset];
        if (presetConfig) {
            // Define visual reset defaults (consistent with App.tsx shortcut 'j')
            const visualReset: Partial<RenderConfig> = {
                fontFamily: 'sans-serif',
                fontSizeScale: 1.0,
                fontColor: '#ffffff',
                fontWeight: 'bold',
                fontStyle: 'normal',
                textCase: 'none',
                textAlign: 'center',
                contentPosition: 'center',
                textDecoration: 'none',
                textEffect: 'preset',
                textAnimation: 'none',
                highlightEffect: 'karaoke',
                highlightColor: '#fb923c',
                highlightBackground: '#fb923c',
                useCustomHighlightColors: false,
                lyricStyleTarget: 'active-only',
                transitionEffect: 'none',
            };

            setConfig({ ...config, ...visualReset, ...presetConfig });
            // Note: No toast here to avoid notification spam during "Live Preview" (hover)
        }
    };

    const handleChannelImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    handleChange('channelInfoImage', event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    handleChange('backgroundImage', event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleReset = async () => {
        if (await confirm('Reset all render settings, including styles and watermark, to default values?', "Reset All Settings")) {
            setConfig(DEFAULT_CONFIG);
            setPreset('default');
            setResolution('1080p');
            setAspectRatio('16:9');
            setRenderCodec('auto');
            setRenderFps(30);
            setRenderQuality('med');
            setRenderEngine('mediarecorder');
            setFfmpegCodec('h264');

            // Reset File Inputs
            if (channelImageInputRef.current) channelImageInputRef.current.value = '';
            if (backgroundImageInputRef.current) backgroundImageInputRef.current.value = '';

            // Reset Custom Font
            onClearCustomFont();
            if (onClearChannelCustomFont) onClearChannelCustomFont();
            if (onClearInfoCustomFont) onClearInfoCustomFont();

            // Reset Font Inputs
            if (config.channelInfoFontFamily === 'ChannelFont' && channelFontInputRef.current) channelFontInputRef.current.value = '';
            if (config.infoFontFamily === 'InfoFont' && infoFontInputRef.current) infoFontInputRef.current.value = '';



            toast.success("All settings have been reset to default.");
        }
    };

    const handleExportSettings = () => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const exportData = {
            ...config,
            // Fix potential floating point precision issues in export
            fontSizeScale: typeof config.fontSizeScale === 'number' ? Number(config.fontSizeScale.toFixed(6)) : config.fontSizeScale,
            infoSizeScale: typeof config.infoSizeScale === 'number' ? Number(config.infoSizeScale.toFixed(6)) : config.infoSizeScale,
            infoMarginScale: typeof config.infoMarginScale === 'number' ? Number(config.infoMarginScale.toFixed(6)) : config.infoMarginScale,
            channelInfoSizeScale: typeof config.channelInfoSizeScale === 'number' ? Number(config.channelInfoSizeScale.toFixed(6)) : config.channelInfoSizeScale,
            channelInfoMarginScale: typeof config.channelInfoMarginScale === 'number' ? Number(config.channelInfoMarginScale.toFixed(6)) : config.channelInfoMarginScale,
            marginTopScale: typeof config.marginTopScale === 'number' ? Number(config.marginTopScale.toFixed(6)) : config.marginTopScale,
            marginBottomScale: typeof config.marginBottomScale === 'number' ? Number(config.marginBottomScale.toFixed(6)) : config.marginBottomScale,

            preset, // Include preset in export
            resolution,
            aspectRatio,
            renderCodec,
            renderFps,
            renderQuality,
            renderEngine,
            ffmpegCodec,
            customFontName, // Include custom font name meta-data
            customChannelFontName,
            customInfoFontName,
            // Explicitly ensure these are exported (though they are in config spread)
            channelInfoFontWeight: config.channelInfoFontWeight,
            channelInfoFontStyle: config.channelInfoFontStyle,
            infoFontWeight: config.infoFontWeight,
            infoFontStyle: config.infoFontStyle
        } as any;

        // Cleanup unused large data to keep file size down
        if (exportData.backgroundSource !== 'image') {
            exportData.backgroundImage = undefined;
        }
        if (!exportData.showChannelInfo) {
            exportData.channelInfoImage = undefined;
        }

        try {
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", url);
            downloadAnchorNode.setAttribute("download", `render_settings_${timestamp}.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export failed:", err);
            toast.error("Failed to export settings.");
        }
    };

    const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                if (json && typeof json === 'object') {
                    // Extract Output Settings and meta that are NOT part of RenderConfig
                    const {
                        resolution: importedResolution,
                        aspectRatio: importedAspectRatio,
                        renderCodec: importedRenderCodec,
                        renderFps: importedRenderFps,
                        renderQuality: importedRenderQuality,
                        renderEngine: importedRenderEngine,
                        ffmpegCodec: importedFfmpegCodec,
                        preset: importedPreset,
                        customFontName: importedCustomFontName,
                        customChannelFontName: importedCustomChannelFontName,
                        customInfoFontName: importedCustomInfoFontName,
                        channelInfoFontWeight: importedChannelInfoFontWeight,
                        channelInfoFontStyle: importedChannelInfoFontStyle,
                        infoFontWeight: importedInfoFontWeight,
                        infoFontStyle: importedInfoFontStyle,
                        ...importedConfig
                    } = json;

                    // Start with default config, overwrite with imported json
                    const newConfig = { ...DEFAULT_CONFIG, ...importedConfig };

                    // Restore explicitly extracted config fields if they exist
                    if (importedChannelInfoFontWeight) newConfig.channelInfoFontWeight = importedChannelInfoFontWeight;
                    if (importedChannelInfoFontStyle) newConfig.channelInfoFontStyle = importedChannelInfoFontStyle;
                    if (importedInfoFontWeight) newConfig.infoFontWeight = importedInfoFontWeight;
                    if (importedInfoFontStyle) newConfig.infoFontStyle = importedInfoFontStyle;

                    // Ensure numeric values are numbers
                    const numericFields: (keyof RenderConfig)[] = [
                        'backgroundBlurStrength',
                        'fontSizeScale',
                        'infoMarginScale',
                        'infoSizeScale',
                        'channelInfoSizeScale',
                        'channelInfoMarginScale',
                        'visualTransitionDuration',
                        'lyricLineHeight',
                        'marginTopScale',
                        'marginBottomScale'
                    ];

                    numericFields.forEach(field => {
                        if (newConfig[field] !== undefined) {
                            (newConfig as any)[field] = Number(newConfig[field]);
                        }
                    });

                    // Ensure boolean values
                    if (newConfig.useCustomHighlightColors !== undefined) {
                        newConfig.useCustomHighlightColors = Boolean(newConfig.useCustomHighlightColors);
                    }
                    if (newConfig.useRealColorMedia !== undefined) {
                        newConfig.useRealColorMedia = Boolean(newConfig.useRealColorMedia);
                    }
                    if (newConfig.showChannelInfo !== undefined) newConfig.showChannelInfo = Boolean(newConfig.showChannelInfo);
                    if (newConfig.showIntro !== undefined) newConfig.showIntro = Boolean(newConfig.showIntro);
                    if (newConfig.showTitle !== undefined) newConfig.showTitle = Boolean(newConfig.showTitle);
                    if (newConfig.showArtist !== undefined) newConfig.showArtist = Boolean(newConfig.showArtist);
                    if (newConfig.showCover !== undefined) newConfig.showCover = Boolean(newConfig.showCover);
                    if (newConfig.showLyrics !== undefined) newConfig.showLyrics = Boolean(newConfig.showLyrics);

                    // Restore Highlight Colors if missing but effect is present
                    if (newConfig.highlightEffect && (!newConfig.highlightColor || !newConfig.highlightBackground)) {
                        const derived = deriveHighlightColors(newConfig.highlightEffect);
                        if (derived) {
                            if (!newConfig.highlightColor) newConfig.highlightColor = derived.color;
                            if (!newConfig.highlightBackground) newConfig.highlightBackground = derived.bg;
                        }
                    }

                    // Helper for group validation
                    const isValidGroupOption = (val: string, groups: { options: { value: string }[] }[]) => {
                        return groups.some(g => g.options.some(o => o.value === val));
                    };

                    // Validate Text & Effects
                    if (newConfig.textEffect && !isValidGroupOption(newConfig.textEffect, textEffectGroups)) newConfig.textEffect = 'shadow';
                    if (newConfig.textAnimation && !isValidGroupOption(newConfig.textAnimation, textAnimationGroups)) newConfig.textAnimation = 'none';
                    if (newConfig.transitionEffect && !isValidGroupOption(newConfig.transitionEffect, transitionGroups)) newConfig.transitionEffect = 'none';
                    if (newConfig.visualTransitionType && !isValidGroupOption(newConfig.visualTransitionType, visualTransitionGroups)) newConfig.visualTransitionType = 'none';
                    if (newConfig.highlightEffect && !isValidGroupOption(newConfig.highlightEffect, highlightEffectGroups)) newConfig.highlightEffect = 'karaoke';

                    // Validate Background
                    if (newConfig.backgroundSource && !isValidGroupOption(newConfig.backgroundSource, backgroundSourceGroups)) newConfig.backgroundSource = 'custom';

                    // Validate Layout & Typography
                    if (!['current', 'playlist'].includes(newConfig.renderMode)) newConfig.renderMode = 'current';
                    if (!['left', 'center', 'right'].includes(newConfig.textAlign)) newConfig.textAlign = 'center';
                    if (!['top', 'center', 'bottom'].includes(newConfig.contentPosition)) newConfig.contentPosition = 'center';
                    if (newConfig.marginTopScale === undefined || isNaN(newConfig.marginTopScale)) newConfig.marginTopScale = 1.0;
                    else newConfig.marginTopScale = Math.max(0, Math.min(5, newConfig.marginTopScale));
                    if (newConfig.marginBottomScale === undefined || isNaN(newConfig.marginBottomScale)) newConfig.marginBottomScale = 1.0;
                    else newConfig.marginBottomScale = Math.max(0, Math.min(5, newConfig.marginBottomScale));
                    if (newConfig.lyricDisplayMode && !isValidGroupOption(newConfig.lyricDisplayMode, lyricDisplayGroups)) newConfig.lyricDisplayMode = 'all';

                    if (!['normal', 'bold'].includes(newConfig.fontWeight)) newConfig.fontWeight = 'bold';
                    if (!['normal', 'italic'].includes(newConfig.fontStyle)) newConfig.fontStyle = 'normal';
                    if (!['none', 'underline', 'line-through'].includes(newConfig.textDecoration)) newConfig.textDecoration = 'none';
                    if (!textCaseOptions.includes(newConfig.textCase)) newConfig.textCase = 'none';
                    if (!['auto', 'manual'].includes(newConfig.introMode)) newConfig.introMode = 'auto';
                    if (newConfig.lyricStyleTarget && !['active-only', 'all'].includes(newConfig.lyricStyleTarget)) newConfig.lyricStyleTarget = 'active-only';

                    // Validate Info & Channel
                    const validPositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center'];

                    if (newConfig.infoPosition && !validPositions.includes(newConfig.infoPosition)) newConfig.infoPosition = 'top-left';
                    if (newConfig.infoStyle && !isValidGroupOption(newConfig.infoStyle, infoStyleGroups)) newConfig.infoStyle = 'classic';

                    if (newConfig.channelInfoPosition && !validPositions.includes(newConfig.channelInfoPosition)) newConfig.channelInfoPosition = 'bottom-right';
                    if (newConfig.channelInfoStyle && !isValidGroupOption(newConfig.channelInfoStyle, channelInfoStyleGroups)) newConfig.channelInfoStyle = 'classic';

                    setConfig(newConfig);

                    // Update Output Settings if present
                    if (importedResolution) setResolution(importedResolution as any);
                    if (importedAspectRatio) setAspectRatio(importedAspectRatio as any);
                    if (importedRenderCodec) setRenderCodec(importedRenderCodec as string);
                    if (importedRenderFps) setRenderFps(Number(importedRenderFps));
                    if (importedRenderQuality) setRenderQuality(importedRenderQuality as any);
                    if (importedRenderEngine) setRenderEngine(importedRenderEngine as any);
                    if (importedFfmpegCodec) setFfmpegCodec(importedFfmpegCodec as any);

                    // Set Preset State (without overwriting config again)
                    if (importedPreset) {
                        setPreset(importedPreset as VideoPreset);
                    } else {
                        setPreset('custom');
                    }

                    if (importedCustomFontName && importedCustomFontName !== customFontName) {
                        toast.success(`Settings loaded. Note: Config used font "${importedCustomFontName}".`);
                    } else if (importedCustomChannelFontName || importedCustomInfoFontName) {
                        toast.success(`Settings loaded. Custom fonts referenced: ${[importedCustomChannelFontName, importedCustomInfoFontName].filter(Boolean).join(', ')}`);
                    } else {
                        toast.success('Settings loaded successfully!');
                    }
                }
            } catch (err) {
                console.error(err);
                toast.error('Failed to parse settings file. Please ensure it is a valid JSON file.');
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
            className="no-minimal-mode-toggle absolute right-0 top-0 bottom-0 w-full sm:w-80 bg-zinc-900/95 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
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
                        name="import-settings"
                        id="import-settings"
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

                {/* Visual Preset */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles size={14} /> Visual Preset
                    </h3>
                    <GroupedSelection
                        value={preset}
                        onChange={(val) => handlePresetSelect(val as VideoPreset)}
                        groups={videoPresetGroups}
                    />
                </section>

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
                            disabled={!hasPlaylist}
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
                    <GroupedSelection
                        value={config.backgroundSource}
                        onChange={(newSource) => {
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
                        groups={backgroundSourceGroups}
                    />

                    {config.backgroundSource === 'smart-gradient' && (
                        <div className="flex items-center gap-3 bg-zinc-800/30 p-2 rounded-lg border border-white/5">
                            <input
                                type="color"
                                name="smart-bg-color"
                                aria-label="Smart Gradient Base Color"
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
                                        name="smart-bg-hex"
                                        aria-label="Smart Gradient Base Color Hex"
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
                                name="solid-bg-color"
                                aria-label="Background Color"
                                value={config.backgroundColor}
                                onChange={(e) => handleChange('backgroundColor', e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none shrink-0"
                            />
                            <input
                                type="text"
                                name="solid-bg-hex"
                                aria-label="Background Color Hex"
                                value={config.backgroundColor}
                                onChange={(e) => handleChange('backgroundColor', e.target.value)}
                                className="bg-transparent border-b border-zinc-700 text-xs text-zinc-300 font-mono flex-1 focus:outline-none focus:border-purple-500 uppercase py-1"
                            />
                        </div>
                    )}

                    {config.backgroundSource === 'gradient' && (
                        <input
                            type="text"
                            name="custom-gradient"
                            aria-label="Custom CSS Gradient"
                            value={config.backgroundGradient}
                            onChange={(e) => handleChange('backgroundGradient', e.target.value)}
                            placeholder="linear-gradient(to bottom right, #312e81, #581c87, #000000)"
                            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                    )}

                    {config.backgroundSource === 'image' && (
                        <div className="space-y-3 animate-in slide-in-from-top-1 fade-in duration-200">
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Custom Background Image</label>
                                <input
                                    ref={backgroundImageInputRef}
                                    type="file"
                                    name="bg-image-upload"
                                    id="bg-image-upload"
                                    accept="image/*"
                                    onChange={handleBackgroundImageUpload}
                                    className="hidden"
                                />
                                {config.backgroundImage ? (
                                    <div className="flex items-center gap-3 bg-zinc-800 p-2 rounded-lg border border-white/10">
                                        <div className="w-10 h-10 rounded bg-zinc-700/50 flex items-center justify-center overflow-hidden border border-white/5">
                                            <img src={config.backgroundImage} alt="Background" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-zinc-300 truncate">Image Loaded</p>
                                            <button
                                                onClick={() => handleChange('backgroundImage', undefined)}
                                                className="text-[10px] text-red-400 hover:text-red-300"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => backgroundImageInputRef.current?.click()}
                                            className="p-1.5 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white"
                                        >
                                            <Settings size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => backgroundImageInputRef.current?.click()}
                                        className="w-full flex items-center justify-center gap-2 bg-zinc-800/50 border border-dashed border-white/10 hover:border-purple-500/50 rounded-lg px-3 py-3 text-zinc-400 hover:text-purple-300 transition-colors"
                                    >
                                        <Upload size={14} />
                                        <span className="text-xs">Upload Background</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </section>

                {/* Background Blur */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <Palette size={14} /> Background Effects
                    </h3>
                    <div className="space-y-3">
                        <div className="flex bg-zinc-800 p-1 rounded-lg border border-white/5">
                            <button
                                onClick={() => handleChange('backgroundBlurStrength', 0)}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${config.backgroundBlurStrength === 0
                                    ? 'bg-zinc-600 text-white shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                                    }`}
                            >
                                Sharp
                            </button>
                            <button
                                onClick={() => handleChange('backgroundBlurStrength', 12)}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${config.backgroundBlurStrength > 0
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                                    }`}
                            >
                                Blur
                            </button>
                        </div>

                        {config.backgroundBlurStrength > 0 && (
                            <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-200">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Blur Intensity</label>
                                    <span className="text-[10px] text-zinc-400 font-mono">{config.backgroundBlurStrength}px</span>
                                </div>
                                <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5">
                                    <input
                                        type="range"
                                        name="blur-strength"
                                        aria-label="Blur Intensity"
                                        min="1"
                                        max="64"
                                        step="1"
                                        value={config.backgroundBlurStrength}
                                        onChange={(e) => handleChange('backgroundBlurStrength', parseInt(e.target.value))}
                                        className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                    />
                                </div>
                            </div>
                        )}
                    </div>



                    {/* Real Color Media Source Toggle */}
                    <label className="bg-zinc-800/30 border border-white/5 rounded-lg p-2.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50 transition-colors">
                        <div className="flex flex-col">
                            <span className="text-xs text-zinc-300 font-medium">Real Color Media Source</span>
                            <span className="text-[10px] text-zinc-500">Disable dark dimming effect on background</span>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="real-color-media"
                                checked={config.useRealColorMedia ?? false}
                                onChange={(e) => handleChange('useRealColorMedia', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-8 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
                        </div>
                    </label>

                    {/* Gradient Overlay Toggle */}
                    <label className="bg-zinc-800/30 border border-white/5 rounded-lg p-2.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50 transition-colors">
                        <div className="flex flex-col">
                            <span className="text-xs text-zinc-300 font-medium">Black Gradient Overlay</span>
                            <span className="text-[10px] text-zinc-500">Fade bottom to top (readability)</span>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="gradient-overlay"
                                checked={config.enableGradientOverlay ?? false}
                                onChange={(e) => handleChange('enableGradientOverlay', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-8 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
                        </div>
                    </label>
                </section>

                {/* Lyric Display Mode */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <FileText size={14} /> Lyric Display Mode
                    </h3>
                    <GroupedSelection
                        value={config.lyricDisplayMode}
                        onChange={(val) => handleChange('lyricDisplayMode', val)}
                        groups={lyricDisplayGroups}
                    />
                </section>

                {/* Highlight Effect */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles size={14} /> Highlight Effect
                    </h3>
                    <GroupedSelection
                        value={config.highlightEffect || 'none'}
                        onChange={(val) => {
                            handleChange('highlightEffect', val);
                        }}
                        groups={highlightEffectGroups}
                    />

                    {/* Highlight Color Pickers */}
                    {(config.highlightEffect && config.highlightEffect !== 'none') && (
                        <div className="mt-2 space-y-2 animate-in slide-in-from-top-2">
                            <button
                                onClick={() => handleChange('useCustomHighlightColors', !config.useCustomHighlightColors)}
                                className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs font-medium transition-all ${config.useCustomHighlightColors
                                    ? 'bg-purple-900/30 border-purple-500/50 text-purple-200'
                                    : 'bg-zinc-800 border-white/5 text-zinc-400 hover:bg-zinc-700'
                                    }`}
                            >
                                <span>Custom Colors</span>
                                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${config.useCustomHighlightColors ? 'bg-purple-500' : 'bg-zinc-600'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${config.useCustomHighlightColors ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                            </button>

                            {config.useCustomHighlightColors && (
                                <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase">Text/Glow Color</label>
                                        <div className="flex items-center gap-2 bg-zinc-800 p-1.5 rounded-lg border border-white/5">
                                            <input
                                                type="color"
                                                name="highlight-color"
                                                aria-label="Highlight Text Color"
                                                value={config.highlightColor || '#fb923c'}
                                                onChange={(e) => handleChange('highlightColor', e.target.value)}
                                                className="w-8 h-6 rounded cursor-pointer bg-transparent border-none shrink-0"
                                            />
                                            <input
                                                type="text"
                                                name="highlight-color-hex"
                                                aria-label="Highlight Text Color Hex"
                                                value={config.highlightColor || '#fb923c'}
                                                onChange={(e) => handleChange('highlightColor', e.target.value)}
                                                className="bg-transparent border-none text-[10px] text-zinc-300 font-mono w-full focus:outline-none uppercase"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase">Back/Shape Color</label>
                                        <div className="flex items-center gap-2 bg-zinc-800 p-1.5 rounded-lg border border-white/5">
                                            <input
                                                type="color"
                                                name="highlight-bg-color"
                                                aria-label="Highlight Background Color"
                                                value={config.highlightBackground || '#fb923c'}
                                                onChange={(e) => handleChange('highlightBackground', e.target.value)}
                                                className="w-8 h-6 rounded cursor-pointer bg-transparent border-none shrink-0"
                                            />
                                            <input
                                                type="text"
                                                name="highlight-bg-hex"
                                                aria-label="Highlight Background Color Hex"
                                                value={config.highlightBackground || '#fb923c'}
                                                onChange={(e) => handleChange('highlightBackground', e.target.value)}
                                                className="bg-transparent border-none text-[10px] text-zinc-300 font-mono w-full focus:outline-none uppercase"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
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
                                        name={item.key}
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

                {/* Intro Settings */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <Type size={14} /> Intro Settings
                    </h3>

                    {/* Intro Settings */}
                    <div className="bg-zinc-800/30 border border-white/5 rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-300 font-medium">Intro Text</span>
                            <div className="flex items-center gap-2 bg-zinc-800 rounded-md p-1 border border-white/5">
                                <button
                                    onClick={() => handleChange('introMode', 'auto')}
                                    className={`px-2 py-1 text-[10px] font-medium rounded transition-all ${config.introMode === 'auto' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                                >
                                    Auto
                                </button>
                                <button
                                    onClick={() => handleChange('introMode', 'manual')}
                                    className={`px-2 py-1 text-[10px] font-medium rounded transition-all ${config.introMode === 'manual' ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                                >
                                    Manual
                                </button>
                            </div>
                        </div>

                        {config.introMode === 'manual' && (
                            <div className="space-y-1 animate-in slide-in-from-top-1 fade-in duration-200">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold">Custom Intro Content</label>
                                <textarea
                                    name="intro-text"
                                    aria-label="Intro Text"
                                    value={config.introText}
                                    onChange={(e) => handleChange('introText', e.target.value)}
                                    placeholder="Enter intro text..."
                                    className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 min-h-[60px]"
                                />
                            </div>
                        )}
                    </div>

                </section>

                {/* Channel Info / Watermark */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <ImageIcon size={14} /> Channel Info / Watermark
                    </h3>
                    <div className="bg-zinc-800/30 border border-white/5 rounded-lg p-3 space-y-3">
                        <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-xs text-zinc-300 font-medium">Show Channel Info</span>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="show-channel-info"
                                    checked={config.showChannelInfo ?? false}
                                    onChange={(e) => handleChange('showChannelInfo', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-8 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
                            </div>
                        </label>

                        {config.showChannelInfo && (
                            <div className="space-y-3 animate-in slide-in-from-top-1 fade-in duration-200 pt-2 border-t border-white/5">
                                {/* Image Upload */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Channel Logo / Image</label>
                                    <input
                                        ref={channelImageInputRef}
                                        type="file"
                                        name="channel-image-upload"
                                        id="channel-image-upload"
                                        accept="image/*"
                                        onChange={handleChannelImageUpload}
                                        className="hidden"
                                    />
                                    {config.channelInfoImage ? (
                                        <div className="flex items-center gap-3 bg-zinc-800 p-2 rounded-lg border border-white/10">
                                            <div className="w-10 h-10 rounded bg-zinc-700/50 flex items-center justify-center overflow-hidden border border-white/5">
                                                <img src={config.channelInfoImage} alt="Channel" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-zinc-300 truncate">Image Loaded</p>
                                                <button
                                                    onClick={() => handleChange('channelInfoImage', undefined)}
                                                    className="text-[10px] text-red-400 hover:text-red-300"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => channelImageInputRef.current?.click()}
                                                className="p-1.5 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white"
                                            >
                                                <Settings size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => channelImageInputRef.current?.click()}
                                            className="w-full flex items-center justify-center gap-2 bg-zinc-800/50 border border-dashed border-white/10 hover:border-purple-500/50 rounded-lg px-3 py-3 text-zinc-400 hover:text-purple-300 transition-colors"
                                        >
                                            <Upload size={14} />
                                            <span className="text-xs">Upload Image</span>
                                        </button>
                                    )}
                                </div>

                                {/* Text Input */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Channel Name / SVG Code</label>
                                    <textarea
                                        name="channel-info-text"
                                        aria-label="Channel Info Text"
                                        value={config.channelInfoText ?? ''}
                                        onChange={(e) => handleChange('channelInfoText', e.target.value)}
                                        placeholder="Display Name or <svg>...</svg>"
                                        className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 min-h-[40px] resize-y font-mono"
                                        rows={2}
                                    />
                                </div>

                                {/* Position */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Position</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button onClick={() => handleChange('channelInfoPosition', 'top-left')} className={`h-8 rounded-md border flex items-start justify-start p-1 transition-all ${config.channelInfoPosition === 'top-left' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Top Left"><div className="w-2 h-2 bg-current rounded-sm" /></button>
                                        <button onClick={() => handleChange('channelInfoPosition', 'top-center')} className={`h-8 rounded-md border flex items-start justify-center p-1 transition-all ${config.channelInfoPosition === 'top-center' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Top Center"><div className="w-2 h-2 bg-current rounded-sm" /></button>
                                        <button onClick={() => handleChange('channelInfoPosition', 'top-right')} className={`h-8 rounded-md border flex items-start justify-end p-1 transition-all ${config.channelInfoPosition === 'top-right' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Top Right"><div className="w-2 h-2 bg-current rounded-sm" /></button>

                                        <button onClick={() => handleChange('channelInfoPosition', 'bottom-left')} className={`h-8 rounded-md border flex items-end justify-start p-1 transition-all ${config.channelInfoPosition === 'bottom-left' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Bottom Left"><div className="w-2 h-2 bg-current rounded-sm" /></button>
                                        <button onClick={() => handleChange('channelInfoPosition', 'bottom-center')} className={`h-8 rounded-md border flex items-end justify-center p-1 transition-all ${config.channelInfoPosition === 'bottom-center' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Bottom Center"><div className="w-2 h-2 bg-current rounded-sm" /></button>
                                        <button onClick={() => handleChange('channelInfoPosition', 'bottom-right')} className={`h-8 rounded-md border flex items-end justify-end p-1 transition-all ${config.channelInfoPosition === 'bottom-right' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Bottom Right"><div className="w-2 h-2 bg-current rounded-sm" /></button>
                                    </div>
                                </div>

                                {/* Style */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Style</label>
                                    <GroupedSelection
                                        value={config.channelInfoStyle || 'classic'}
                                        onChange={(val) => handleChange('channelInfoStyle', val)}
                                        groups={channelInfoStyleGroups}
                                    />
                                </div>

                                {/* Margin Scale */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Edge Margin</label>
                                        <span className="text-[10px] text-zinc-400 font-mono">{(config.channelInfoMarginScale ?? 1.0).toFixed(1)}x</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5">
                                        <span className="text-zinc-500"><Maximize size={12} /></span>
                                        <input
                                            type="range"
                                            name="channel-margin"
                                            aria-label="Channel Info Margin"
                                            min="0.0"
                                            max="5.0"
                                            step="0.1"
                                            value={config.channelInfoMarginScale ?? 1.0}
                                            onChange={(e) => handleChange('channelInfoMarginScale', parseFloat(e.target.value))}
                                            className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Size Scale */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Size</label>
                                        <span className="text-[10px] text-zinc-400 font-mono">{(config.channelInfoSizeScale ?? 1.0).toFixed(1)}x</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5">
                                        <span className="text-zinc-500"><Maximize size={12} /></span>
                                        <input
                                            type="range"
                                            name="channel-size"
                                            aria-label="Channel Info Size"
                                            min="0.5"
                                            max="3.0"
                                            step="0.1"
                                            value={config.channelInfoSizeScale ?? 1.0}
                                            onChange={(e) => handleChange('channelInfoSizeScale', parseFloat(e.target.value))}
                                            className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                        />
                                    </div>
                                </div>


                                {/* Custom Font for Channel Info */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Font Family</label>
                                    <FontSelector
                                        value={config.channelInfoFontFamily || 'sans-serif'}
                                        onChange={(val) => handleChange('channelInfoFontFamily', val)}
                                        customFontName={customChannelFontName || null}
                                        groups={dynamicFontGroups}
                                    />
                                    <GoogleFontLoader
                                        onApply={(name) => handleGoogleFontApply(name, 'channelInfoFontFamily')}
                                        placeholder="Channel Font (e.g. Oswald)"
                                    />
                                    {/* Upload Button */}
                                    <input
                                        ref={channelFontInputRef}
                                        type="file"
                                        name="channel-font-upload"
                                        id="channel-font-upload"
                                        accept=".ttf,.otf,.woff,.woff2"
                                        onChange={onChannelFontUpload}
                                        className="hidden"
                                    />
                                    {customChannelFontName ? (
                                        <div className="flex items-center gap-2 bg-zinc-800/50 border border-purple-500/30 rounded-lg px-2 py-1.5 mt-1">
                                            <span className="text-[10px] text-purple-300 font-medium truncate flex-1">{customChannelFontName}</span>
                                            <button
                                                onClick={() => handleChange('channelInfoFontFamily', 'ChannelFont')}
                                                className={`text-[10px] px-2 py-0.5 rounded transition-colors ${config.channelInfoFontFamily === 'ChannelFont' ? 'bg-purple-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
                                            >
                                                Use
                                            </button>
                                            <button onClick={onClearChannelCustomFont} className="text-zinc-500 hover:text-red-400"><Trash2 size={12} /></button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => channelFontInputRef.current?.click()}
                                            className="w-full flex items-center justify-center gap-2 bg-zinc-800/30 border border-dashed border-white/10 hover:border-purple-500/50 rounded-lg px-2 py-1.5 text-zinc-500 hover:text-purple-300 transition-colors mt-1"
                                        >
                                            <Upload size={10} />
                                            <span className="text-[10px]">Upload Font</span>
                                        </button>
                                    )}
                                </div>

                                {/* Channel Info Font Style (Bold/Italic) */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Font Style</label>
                                    <div className="flex bg-zinc-800 rounded-lg p-1 gap-1">
                                        <button
                                            onClick={() => handleChange('channelInfoFontWeight', config.channelInfoFontWeight === 'bold' ? 'normal' : 'bold')}
                                            className={`flex-1 py-1.5 rounded-md flex items-center justify-center transition-all ${config.channelInfoFontWeight === 'bold' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            title="Bold"
                                        >
                                            <Bold size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleChange('channelInfoFontStyle', config.channelInfoFontStyle === 'italic' ? 'normal' : 'italic')}
                                            className={`flex-1 py-1.5 rounded-md flex items-center justify-center transition-all ${config.channelInfoFontStyle === 'italic' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            title="Italic"
                                        >
                                            <Italic size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Channel Info Color */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Text Color</label>
                                    <div className="flex items-center gap-3 bg-zinc-800/30 p-2 rounded-lg border border-white/5">
                                        <input
                                            type="color"
                                            name="channel-font-color"
                                            aria-label="Channel Font Color"
                                            value={config.channelInfoFontColor || '#ffffff'}
                                            onChange={(e) => handleChange('channelInfoFontColor', e.target.value)}
                                            className="w-6 h-6 rounded cursor-pointer bg-transparent border-none shrink-0"
                                        />
                                        <span className="text-[10px] text-zinc-400 font-mono uppercase">{config.channelInfoFontColor || '#ffffff'}</span>
                                    </div>
                                </div>
                            </div>
                        )}
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
                            <GroupedSelection
                                value={config.infoStyle || 'classic'}
                                onChange={(val) => handleChange('infoStyle', val)}
                                groups={infoStyleGroups}
                            />
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
                                    name="info-margin"
                                    aria-label="Song Info Margin"
                                    min="0.0"
                                    max="5.0"
                                    step="0.1"
                                    value={config.infoMarginScale ?? 1.0}
                                    onChange={(e) => handleChange('infoMarginScale', parseFloat(e.target.value))}
                                    className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Info Size</label>
                                <span className="text-[10px] text-zinc-400 font-mono">{(config.infoSizeScale ?? 1).toFixed(1)}x</span>
                            </div>
                            <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5">
                                <span className="text-zinc-500"><Type size={12} /></span>
                                <input
                                    type="range"
                                    name="info-size"
                                    aria-label="Song Info Size"
                                    min="0.5"
                                    max="3.0"
                                    step="0.1"
                                    value={config.infoSizeScale ?? 1.0}
                                    onChange={(e) => handleChange('infoSizeScale', parseFloat(e.target.value))}
                                    className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                />
                            </div>
                        </div>


                        {/* Custom Font for Song Info */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Font Family</label>
                            <FontSelector
                                value={config.infoFontFamily || 'sans-serif'}
                                onChange={(val) => handleChange('infoFontFamily', val)}
                                customFontName={customInfoFontName || null}
                                groups={dynamicFontGroups}
                            />
                            <GoogleFontLoader
                                onApply={(name) => handleGoogleFontApply(name, 'infoFontFamily')}
                                placeholder="Info Font (e.g. Roboto)"
                            />
                            <input
                                ref={infoFontInputRef}
                                type="file"
                                name="info-font-upload"
                                id="info-font-upload"
                                accept=".ttf,.otf,.woff,.woff2"
                                onChange={onInfoFontUpload}
                                className="hidden"
                            />
                            {customInfoFontName ? (
                                <div className="flex items-center gap-2 bg-zinc-800/50 border border-purple-500/30 rounded-lg px-2 py-1.5 mt-1">
                                    <span className="text-[10px] text-purple-300 font-medium truncate flex-1">{customInfoFontName}</span>
                                    <button
                                        onClick={() => handleChange('infoFontFamily', 'InfoFont')}
                                        className={`text-[10px] px-2 py-0.5 rounded transition-colors ${config.infoFontFamily === 'InfoFont' ? 'bg-purple-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
                                    >
                                        Use
                                    </button>
                                    <button onClick={onClearInfoCustomFont} className="text-zinc-500 hover:text-red-400"><Trash2 size={12} /></button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => infoFontInputRef.current?.click()}
                                    className="w-full flex items-center justify-center gap-2 bg-zinc-800/30 border border-dashed border-white/10 hover:border-purple-500/50 rounded-lg px-2 py-1.5 text-zinc-500 hover:text-purple-300 transition-colors mt-1"
                                >
                                    <Upload size={10} />
                                    <span className="text-[10px]">Upload Font</span>
                                </button>
                            )}
                        </div>

                        {/* Song Info Font Style (Bold/Italic) */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Font Style</label>
                            <div className="flex bg-zinc-800 rounded-lg p-1 gap-1">
                                <button
                                    onClick={() => handleChange('infoFontWeight', config.infoFontWeight === 'bold' ? 'normal' : 'bold')}
                                    className={`flex-1 py-1.5 rounded-md flex items-center justify-center transition-all ${config.infoFontWeight === 'bold' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Bold"
                                >
                                    <Bold size={14} />
                                </button>
                                <button
                                    onClick={() => handleChange('infoFontStyle', config.infoFontStyle === 'italic' ? 'normal' : 'italic')}
                                    className={`flex-1 py-1.5 rounded-md flex items-center justify-center transition-all ${config.infoFontStyle === 'italic' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Italic"
                                >
                                    <Italic size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Song Info Color */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Text Color</label>
                            <div className="flex items-center gap-3 bg-zinc-800/30 p-2 rounded-lg border border-white/5">
                                <input
                                    type="color"
                                    name="info-font-color"
                                    aria-label="Song Info Text Color"
                                    value={config.infoFontColor || '#ffffff'}
                                    onChange={(e) => handleChange('infoFontColor', e.target.value)}
                                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-none shrink-0"
                                />
                                <span className="text-[10px] text-zinc-400 font-mono uppercase">{config.infoFontColor || '#ffffff'}</span>
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

                            {/* Edge Margins */}
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Top Margin</label>
                                        <span className="text-[10px] text-zinc-400 font-mono">{(config.marginTopScale ?? 1.0).toFixed(1)}x</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5">
                                        <input
                                            type="range"
                                            name="margin-top"
                                            aria-label="Lyrics Top Margin"
                                            min="0.0"
                                            max="5.0"
                                            step="0.1"
                                            value={config.marginTopScale ?? 1.0}
                                            onChange={(e) => handleChange('marginTopScale', parseFloat(e.target.value))}
                                            className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Bottom Margin</label>
                                        <span className="text-[10px] text-zinc-400 font-mono">{(config.marginBottomScale ?? 1.0).toFixed(1)}x</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5">
                                        <input
                                            type="range"
                                            name="margin-bottom"
                                            aria-label="Lyrics Bottom Margin"
                                            min="0.0"
                                            max="5.0"
                                            step="0.1"
                                            value={config.marginBottomScale ?? 1.0}
                                            onChange={(e) => handleChange('marginBottomScale', parseFloat(e.target.value))}
                                            className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                        />
                                    </div>
                                </div>
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
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Apply Style To</label>
                            <div className="flex bg-zinc-800 rounded-lg p-1 gap-1">
                                <button
                                    onClick={() => handleChange('lyricStyleTarget', 'active-only')}
                                    className={`flex-1 py-1.5 rounded-md text-[10px] transition-all ${config.lyricStyleTarget === 'active-only' || !config.lyricStyleTarget ? 'bg-zinc-600 text-white shadow-sm font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Apply style to current line only (others normal)"
                                >
                                    Current Only
                                </button>
                                <button
                                    onClick={() => handleChange('lyricStyleTarget', 'all')}
                                    className={`flex-1 py-1.5 rounded-md text-[10px] transition-all ${config.lyricStyleTarget === 'all' ? 'bg-zinc-600 text-white shadow-sm font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Apply style to all lines (previous, current, next)"
                                >
                                    All Lines
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Text Case</label>
                            <div className="grid grid-cols-3 gap-1 bg-zinc-800 rounded-lg p-1">
                                <button
                                    onClick={() => handleChange('textCase', 'none')}
                                    className={`py-1.5 rounded-md text-[10px] transition-all ${config.textCase === 'none' ? 'bg-zinc-600 text-white shadow-sm font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    Normal
                                </button>
                                <button
                                    onClick={() => handleChange('textCase', 'upper')}
                                    className={`py-1.5 rounded-md text-[10px] uppercase transition-all ${config.textCase === 'upper' ? 'bg-zinc-600 text-white shadow-sm font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    Upper
                                </button>
                                <button
                                    onClick={() => handleChange('textCase', 'lower')}
                                    className={`py-1.5 rounded-md text-[10px] lowercase transition-all ${config.textCase === 'lower' ? 'bg-zinc-600 text-white shadow-sm font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    Lower
                                </button>
                                <button
                                    onClick={() => handleChange('textCase', 'title')}
                                    className={`py-1.5 rounded-md text-[10px] capitalize transition-all ${config.textCase === 'title' ? 'bg-zinc-600 text-white shadow-sm font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    Title Case
                                </button>
                                <button
                                    onClick={() => handleChange('textCase', 'sentence')}
                                    className={`py-1.5 rounded-md text-[10px] transition-all ${config.textCase === 'sentence' ? 'bg-zinc-600 text-white shadow-sm font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    Sentence case
                                </button>
                                <button
                                    onClick={() => handleChange('textCase', 'invert')}
                                    className={`py-1.5 rounded-md text-[10px] transition-all ${config.textCase === 'invert' ? 'bg-zinc-600 text-white shadow-sm font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    Invert Case
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Font Family</label>
                            <FontSelector
                                value={config.fontFamily}
                                onChange={(val) => handleChange('fontFamily', val)}
                                customFontName={customFontName}
                                groups={dynamicFontGroups}
                            />
                            <GoogleFontLoader
                                onApply={(name) => handleGoogleFontApply(name, 'fontFamily')}
                                placeholder="Lyrics Font (e.g. Pacifico)"
                            />
                        </div>

                        {/* Custom Font Upload */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Custom Font File</label>
                            <input
                                ref={fontInputRef}
                                type="file"
                                name="main-font-upload"
                                id="main-font-upload"
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
                                    name="font-size"
                                    aria-label="Font Size"
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
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Current Line Height</label>
                                <span className="text-[10px] text-zinc-400 font-mono">{(config.lyricLineHeight || 1.3).toFixed(1)}x</span>
                            </div>
                            <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5">
                                <span className="text-zinc-500"><AlignVerticalJustifyCenter size={12} /></span>
                                <input
                                    type="range"
                                    name="line-height"
                                    aria-label="Line Height"
                                    min="1.0"
                                    max="3.0"
                                    step="0.1"
                                    value={config.lyricLineHeight || 1.3}
                                    onChange={(e) => handleChange('lyricLineHeight', parseFloat(e.target.value))}
                                    className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                />
                            </div>
                        </div>

                        {/* Font Style Warning */}
                        {config.fontFamily !== 'sans-serif' && config.fontFamily !== 'CustomFont' && (
                            <div className="text-[10px] text-zinc-500 bg-zinc-800/30 p-2 rounded border border-white/5">
                                Some presets like Gothic, Metal, or Tech use specific fonts. Changing Font Family here might override that look.
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Color</label>
                            <div className="flex items-center gap-3 bg-zinc-800/30 p-2 rounded-lg border border-white/5">
                                <input
                                    type="color"
                                    name="main-font-color"
                                    aria-label="Main Font Color"
                                    value={config.fontColor}
                                    onChange={(e) => handleChange('fontColor', e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-none shrink-0"
                                />
                                <input
                                    type="text"
                                    name="main-font-hex"
                                    aria-label="Main Font Color Hex"
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

                    {/* Visual Transition (New) */}
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Visual Transition (Images/Video)</label>
                            {config.visualTransitionDuration && (
                                <span className="text-[10px] text-zinc-400 font-mono">{config.visualTransitionDuration.toFixed(1)}s</span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <GroupedSelection
                                    value={config.visualTransitionType || 'none'}
                                    onChange={(val) => handleChange('visualTransitionType', val)}
                                    groups={visualTransitionGroups}
                                />
                            </div>
                            {(config.visualTransitionType && config.visualTransitionType !== 'none') && (
                                <div className="w-1/3 flex items-center bg-zinc-800 border border-white/10 rounded-lg px-2">
                                    <input
                                        type="range"
                                        name="transition-duration"
                                        aria-label="Transition Duration"
                                        min="0.1"
                                        max="5.0"
                                        step="0.1"
                                        value={config.visualTransitionDuration || 1.0}
                                        onChange={(e) => handleChange('visualTransitionDuration', parseFloat(e.target.value))}
                                        className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Output Settings (New) */}
                    <div className="pt-2 border-t border-white/5 space-y-3">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <Video size={14} /> Output Settings
                        </h3>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Resolution</label>
                                <div className="flex bg-zinc-800 rounded-lg p-1">
                                    <button
                                        onClick={() => setResolution('720p')}
                                        className={`flex-1 py-1 px-2 rounded-md text-[10px] font-bold transition-all ${resolution === '720p' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        720p
                                    </button>
                                    <button
                                        onClick={() => setResolution('1080p')}
                                        className={`flex-1 py-1 px-2 rounded-md text-[10px] font-bold transition-all ${resolution === '1080p' ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        1080p
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">FPS</label>
                                <GroupedSelection
                                    value={String(renderFps)}
                                    onChange={(val) => setRenderFps(parseInt(val))}
                                    groups={fpsGroups}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Aspect Ratio</label>
                            <div className="grid grid-cols-4 gap-1">
                                {['16:9', '9:16', '1:1', '4:5', '3:4', '4:3', '2:3', '3:2', '1:2', '2:1', '20:9', '21:9'].map((ratio) => (
                                    <button
                                        key={ratio}
                                        onClick={() => setAspectRatio(ratio as any)}
                                        className={`py-1.5 rounded-md text-[10px] font-mono transition-all border ${aspectRatio === ratio
                                            ? 'bg-purple-600 border-purple-500 text-white'
                                            : 'bg-zinc-800 border-white/5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300'
                                            }`}
                                    >
                                        {ratio}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Render Engine Selection */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Render Engine</label>
                            <div className="flex bg-zinc-800 rounded-lg p-1 gap-1">
                                <button
                                    onClick={() => setRenderEngine('mediarecorder')}
                                    className={`flex-1 py-2 rounded-md text-[10px] font-bold uppercase transition-all ${renderEngine === 'mediarecorder' ? 'bg-purple-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Uses browser's MediaRecorder API. Renders in realtime while playing audio."
                                >
                                    Realtime
                                </button>
                                <button
                                    onClick={() => setRenderEngine('webcodecs')}
                                    className={`flex-1 py-2 rounded-md text-[10px] font-bold uppercase transition-all ${renderEngine === 'webcodecs' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Uses WebCodecs API. Hardware accelerated rendering. Fastest option."
                                >
                                    WebCodecs 🚀
                                </button>
                                <button
                                    onClick={() => setRenderEngine('ffmpeg')}
                                    className={`flex-1 py-2 rounded-md text-[10px] font-bold uppercase transition-all ${renderEngine === 'ffmpeg' ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Uses FFmpeg WASM. Frame-by-frame rendering with professional codecs."
                                >
                                    FFmpeg ⚡
                                </button>
                            </div>
                            <p className="text-[9px] text-zinc-600 ml-1 leading-tight">
                                {renderEngine === 'mediarecorder'
                                    ? 'Realtime recording. Fast but quality depends on browser.'
                                    : renderEngine === 'webcodecs'
                                        ? 'Hardware accelerated (GPU). Very fast export with simple MP4.'
                                        : 'Software rendering. High compatiblity but slower.'}
                            </p>
                        </div>

                        {/* Video Codec - Conditional based on engine */}
                        {renderEngine === 'mediarecorder' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Video Codec</label>
                                <GroupedSelection
                                    value={renderCodec}
                                    onChange={(val) => setRenderCodec(val)}
                                    groups={[
                                        {
                                            label: "Format",
                                            options: [
                                                { label: "Auto Select (Best)", value: "auto" },
                                                ...supportedCodecs
                                            ]
                                        }
                                    ]}
                                />
                            </div>
                        )}

                        {renderEngine === 'ffmpeg' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">FFmpeg Codec</label>
                                <div className="grid grid-cols-2 gap-1">
                                    {[
                                        { label: 'H.264', value: 'h264', desc: 'Best Compatibility' },
                                        { label: 'H.265', value: 'h265', desc: 'Higher Quality' },
                                        // { label: 'VP9', value: 'vp9', desc: 'Open Format' },
                                        // { label: 'AV1', value: 'av1', desc: 'Best Compression' },
                                    ].map((codec) => (
                                        <button
                                            key={codec.value}
                                            onClick={() => setFfmpegCodec(codec.value as any)}
                                            className={`py-2 px-2 rounded-md text-[10px] font-medium transition-all border text-left ${ffmpegCodec === codec.value
                                                ? 'bg-orange-500 border-orange-400 text-white'
                                                : 'bg-zinc-800 border-white/5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                                                }`}
                                            title={codec.desc}
                                        >
                                            <div className="font-bold">{codec.label}</div>
                                            <div className="text-[8px] opacity-75">{codec.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {renderEngine === 'webcodecs' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Video Codec</label>
                                <div className="p-2 bg-zinc-800/50 rounded border border-white/5 text-[10px] text-zinc-400">
                                    H.264 / AAC (Hardware Accelerated)
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Render Quality (Bitrate)</label>
                            <div className="flex bg-zinc-800 rounded-lg p-1">
                                <button
                                    onClick={() => setRenderQuality('low')}
                                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${renderQuality === 'low' ? 'bg-zinc-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    Low
                                </button>
                                <button
                                    onClick={() => setRenderQuality('med')}
                                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${renderQuality === 'med' ? 'bg-zinc-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    Medium
                                </button>
                                <button
                                    onClick={() => setRenderQuality('high')}
                                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${renderQuality === 'high' ? 'bg-purple-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    High
                                </button>
                            </div>
                        </div>

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

                {
                    showShortcuts && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in cursor-default" onClick={() => setShowShortcuts(false)}>
                            <div className="no-minimal-mode-toggle bg-zinc-900 border border-white/10 rounded-xl shadow-2xl w-[480px] max-w-[90vw] overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-5" onClick={(e) => e.stopPropagation()}>
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
                                            <div className="flex justify-between items-center"><span className="text-zinc-300">Minimal Mode</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">O</kbd></div>
                                            <div className="flex justify-between items-center"><span className="text-zinc-300">Lyric Display Mode</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">G</kbd></div>
                                            <div className="flex justify-between items-center"><span className="text-zinc-300">Text Case</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">C</kbd></div>
                                            <div className="flex justify-between items-center"><span className="text-zinc-300">Render Settings</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">D</kbd></div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Visual Effects</h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="flex justify-between items-center"><span className="text-zinc-300">Toggle Highlight On/Off</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">X</kbd></div>
                                            <div className="flex justify-between items-center"><span className="text-zinc-300">Cycle Next Highlight Effect</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px] border border-white/10">Z</kbd></div>
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
                    )
                }

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
