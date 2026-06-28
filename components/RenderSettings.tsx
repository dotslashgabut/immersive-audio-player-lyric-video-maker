import React, { useRef, useEffect, useState } from 'react';
import { X, Video, Settings, ImageIcon, Type, Layout, Palette, Music, FileText, Check, ListMusic, Bold, Italic, Underline, Strikethrough, AlignVerticalJustifyCenter, AlignVerticalJustifyStart, AlignVerticalJustifyEnd, Upload, Trash2, ChevronDown, Maximize, RotateCcw, Download, Sparkles, Activity, Shuffle, Sliders } from './Icons';
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
    lyricVisibilityMode: 'default',
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
    showVisualization: false,
    visualizationType: 'bars',
    visualizationColorMode: 'gradient',
    visualizationColor1: '#a855f7',
    visualizationColor2: '#6366f1',
    visualizationOpacity: 0.6,
    visualizationPosition: 'bottom',
    visualizationSensitivity: 1.5,
    visualizationBarCount: 48,
    showFloatingNotes: false,
    floatingNotesLayout: 'text-only',
    floatingNotesMedia: undefined,
    floatingNotesMediaType: 'image',
    floatingNotesText: 'Floating Notes',
    floatingNotesPosition: 'bottom-left',
    floatingNotesShape: 'rounded',
    floatingNotesFillColor: '#000000',
    floatingNotesOutlineColor: '#ffffff',
    floatingNotesOutlineSize: 1,
    floatingNotesOpacity: 0.8,
    floatingNotesMarginScale: 1.0,
    floatingNotesWidth: 300,
    floatingNotesHeight: 150,
    floatingNotesMediaSizeScale: 0.4,
    floatingNotesFontSizeScale: 1.0,
    floatingNotesFontFamily: 'ui-sans-serif, system-ui, sans-serif',
    floatingNotesFontStyle: 'normal',
    floatingNotesFontWeight: 'normal',
    floatingNotesFontColor: '#ffffff',
    floatingNotesTextAlign: 'left',
    floatingNotesVisibilityMode: 'all',
    floatingNotesFromStartDuration: 10,
    floatingNotesFromEndDuration: 10,
    floatingNotesSpecificStart: '0:00',
    floatingNotesSpecificEnd: '0:30',
    randomizeBackgroundSource: true,
    randomizeBackgroundEffects: true,
    randomizeAudioVisualizer: true,
    randomizeLyricDisplayMode: true,
    randomizeHighlightEffect: true,
    randomizeVisibleElements: true,
    randomizeIntroSettings: true,
    randomizeTypographyStyle: true,
    randomizeTextEffect: true,
    randomizeTextAnimation: true,
    randomizeTransitionEffect: true,
    randomizeVisualTransition: true,
    randomizeChannelInfo: true,
    randomizeFloatingNotes: true,
    randomizeSongInfoDesign: true,
};

type RandomizeToggleKey =
    | 'randomizeBackgroundSource'
    | 'randomizeBackgroundEffects'
    | 'randomizeAudioVisualizer'
    | 'randomizeLyricDisplayMode'
    | 'randomizeHighlightEffect'
    | 'randomizeVisibleElements'
    | 'randomizeIntroSettings'
    | 'randomizeTypographyStyle'
    | 'randomizeTextEffect'
    | 'randomizeTextAnimation'
    | 'randomizeTransitionEffect'
    | 'randomizeVisualTransition'
    | 'randomizeChannelInfo'
    | 'randomizeFloatingNotes'
    | 'randomizeSongInfoDesign';

const RANDOMIZE_TOGGLE_KEYS: RandomizeToggleKey[] = [
    'randomizeBackgroundSource',
    'randomizeBackgroundEffects',
    'randomizeAudioVisualizer',
    'randomizeLyricDisplayMode',
    'randomizeHighlightEffect',
    'randomizeVisibleElements',
    'randomizeIntroSettings',
    'randomizeTypographyStyle',
    'randomizeTextEffect',
    'randomizeTextAnimation',
    'randomizeTransitionEffect',
    'randomizeVisualTransition',
    'randomizeChannelInfo',
    'randomizeFloatingNotes',
    'randomizeSongInfoDesign',
];

const RANDOMIZE_TYPOGRAPHY_STYLE_KEYS: RandomizeToggleKey[] = [
    'randomizeTypographyStyle',
    'randomizeTextEffect',
    'randomizeTextAnimation',
    'randomizeTransitionEffect',
    'randomizeVisualTransition',
];

const RANDOMIZE_STYLE_EFFECT_KEYS: RandomizeToggleKey[] = [
    'randomizeBackgroundSource',
    'randomizeBackgroundEffects',
    'randomizeAudioVisualizer',
    'randomizeHighlightEffect',
    'randomizeVisibleElements',
    'randomizeTextEffect',
    'randomizeTextAnimation',
    'randomizeTransitionEffect',
    'randomizeVisualTransition',
];

const DEPRECATED_RANDOMIZE_KEYS = [
    'randomizePreset',
    'randomizeRenderScope',
    'randomizeLyricVisibility',
    'randomizeOutputSettings',
] as const;

function buildRandomizeTogglePatch(
    keys: RandomizeToggleKey[],
    enabled: boolean,
): Partial<Record<RandomizeToggleKey, boolean>> {
    return Object.fromEntries(keys.map((key) => [key, enabled])) as Partial<Record<RandomizeToggleKey, boolean>>;
}

function buildRandomizeSelectionPatch(
    enabledKeys: RandomizeToggleKey[],
): Partial<Record<RandomizeToggleKey, boolean>> {
    const enabledSet = new Set(enabledKeys);
    return Object.fromEntries(
        RANDOMIZE_TOGGLE_KEYS.map((key) => [key, enabledSet.has(key)]),
    ) as Partial<Record<RandomizeToggleKey, boolean>>;
}



export const textEffectGroups = [
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

export const textAnimationGroups = [
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

export const transitionGroups = [
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
            { label: "Custom Image", value: "image" },
            { label: "Custom Video (Loops)", value: "video" },
            { label: "Three.js 3D Background", value: "threejs" }
        ]
    }
];

export const threejsSceneGroups = [
    {
        label: "Classic",
        options: [
            { label: "✦ Stars", value: "stars" },
            { label: "◇ Rotating Cubes", value: "cubes" },
            { label: "≈ Wireframe Waves", value: "waves" },
            { label: "● Particle Flow", value: "particles" }
        ]
    },
    {
        label: "Cosmic",
        options: [
            { label: "🌀 Spiral Galaxy", value: "galaxy" },
            { label: "☁ Cosmic Nebula", value: "nebula" },
            { label: "🌌 Aurora Borealis", value: "aurora" },
            { label: "🚀 Warp Speed", value: "warp" },
            { label: "🌪 Particle Vortex", value: "vortex" }
        ]
    },
    {
        label: "Sci-Fi",
        options: [
            { label: "🧬 DNA Helix", value: "dna" },
            { label: "▓ Matrix Rain", value: "matrix" },
            { label: "◎ Saturn Rings", value: "rings" },
            { label: "🚇 Infinity Tunnel", value: "tunnel" },
            { label: "🌐 Cyber Grid", value: "cybergrid" },
            { label: "💎 Geometric Crystals", value: "crystals" }
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
    },
    {
        label: "Unsynchronized / Static",
        options: [
            { label: "Static Full Text", value: "static-all" },
            { label: "Compact ( / line, // verse )", value: "static-compact" },
            { label: "Compact ( , line, . verse + newline )", value: "static-compact-comma" },
            { label: "Compact ( no symbol, . verse + newline )", value: "static-compact-clean" }
        ]
    }
];

export const textCaseOptions = ['none', 'upper', 'lower', 'title', 'sentence', 'invert'];

export const infoStyleGroups = [
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

export const channelInfoStyleGroups = [
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

const floatingNotesLayoutGroups = [
    {
        label: "Content Layout",
        options: [
            { label: "Text Only", value: "text-only" },
            { label: "Media Only", value: "media-only" },
            { label: "Media (Left) + Text", value: "media-left-text" },
            { label: "Media (Right) + Text", value: "media-right-text" },
            { label: "Media (Top) + Text", value: "media-top-text" },
            { label: "Media (Bottom) + Text", value: "media-bottom-text" },
        ]
    }
];

const floatingNotesVisibilityGroups = [
    {
        label: "When To Show",
        options: [
            { label: "All Duration", value: "all" },
            { label: "Follow Lyrics Settings", value: "follow-lyrics" },
            { label: "Duration From Start of Audio", value: "from-start" },
            { label: "Duration Before End of Audio", value: "from-end" },
            { label: "From Start + Before End of Audio", value: "from-start-and-end" },
            { label: "Specific Time Range", value: "specific" },
        ]
    }
];

const floatingNotesShapeGroups = [
    {
        label: "Background Shape",
        options: [
            { label: "None (Transparent)", value: "none" },
            { label: "Sharp Corner", value: "sharp" },
            { label: "Rounded Corner", value: "rounded" },
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

export const fullFontGroups = [
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
    const backgroundVideoInputRef = useRef<HTMLInputElement>(null);
    const floatingNotesMediaInputRef = useRef<HTMLInputElement>(null);
    const settingsInputRef = useRef<HTMLInputElement>(null);
    const [importedFileName, setImportedFileName] = useState<string | null>(null);


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

    const applyRandomizeTogglePatch = (patch: Partial<Record<RandomizeToggleKey, boolean>>) => {
        setConfig({ ...config, ...patch });
    };

    const handleRandomizeSelectAll = () => {
        applyRandomizeTogglePatch(buildRandomizeTogglePatch(RANDOMIZE_TOGGLE_KEYS, true));
    };

    const handleRandomizeSelectNone = () => {
        applyRandomizeTogglePatch(buildRandomizeTogglePatch(RANDOMIZE_TOGGLE_KEYS, false));
    };

    const handleRandomizeSelectTypography = () => {
        applyRandomizeTogglePatch(buildRandomizeSelectionPatch(RANDOMIZE_TYPOGRAPHY_STYLE_KEYS));
    };

    const handleRandomizeSelectStyleEffect = () => {
        applyRandomizeTogglePatch(buildRandomizeSelectionPatch(RANDOMIZE_STYLE_EFFECT_KEYS));
    };

    const handleRandomizeInvertSelection = () => {
        const patch = Object.fromEntries(
            RANDOMIZE_TOGGLE_KEYS.map((key) => [key, config[key] === false]),
        ) as Partial<Record<RandomizeToggleKey, boolean>>;
        applyRandomizeTogglePatch(patch);
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

    const handleFloatingNotesMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const isVideo = file.type.startsWith('video/');
            const isImage = file.type.startsWith('image/');
            if (!isVideo && !isImage) {
                toast.error('Please upload a valid image or video file.');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setConfig({
                        ...config,
                        floatingNotesMedia: event.target.result as string,
                        floatingNotesMediaType: isVideo ? 'video' : 'image',
                    });
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

    const handleBackgroundVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check if file is video
            if (!file.type.startsWith('video/')) {
                toast.error('Please upload a valid video file.');
                return;
            }

            // For videos, we use object URLs to avoid massive base64 strings
            // However, this means they won't persist across reloads unless handled specifically
            // For now, we'll try data URL for small videos, but warn for large ones?
            // Actually, for render settings persistence, data URL is safer but slower. 
            // Given "Loops", they should be short.

            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    handleChange('backgroundVideo', event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleRandomSettings = () => {
        // Helper: pick a random item from an array
        const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
        // Helper: collect all option values from grouped option arrays
        const allValues = (groups: { options: { value: string }[] }[]): string[] =>
            groups.flatMap(g => g.options.map(o => o.value));
        // Helper: random float between min/max, rounded to decimals
        const randFloat = (min: number, max: number, decimals = 2) =>
            Number((min + Math.random() * (max - min)).toFixed(decimals));
        // Helper: random hex color
        const randColor = () => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
        // Helper: random gradient
        const directions = ['to right', 'to left', 'to bottom', 'to top', 'to bottom right', 'to bottom left', 'to top right', 'to top left'];
        const randGradient = () => `linear-gradient(${pick(directions)}, ${randColor()}, ${randColor()}, ${randColor()})`;

        // Collect all option values from each group
        const textEffects = allValues(textEffectGroups).filter(v => v !== 'preset');
        const textAnimations = allValues(textAnimationGroups);
        const transitions = allValues(transitionGroups);
        const highlights = allValues(highlightEffectGroups);
        const bgSources = ['custom', 'color', 'gradient', 'smart-gradient']; // Skip image/video/threejs/timeline (require uploads)
        const displayModes = allValues(lyricDisplayGroups).filter(v => !v.startsWith('static-')); // Skip static modes
        const infoStyles = allValues(infoStyleGroups);
        const channelStyles = allValues(channelInfoStyleGroups);
        const textCases: string[] = [...textCaseOptions];
        const positions: ('top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center' | 'left-middle' | 'center-middle' | 'right-middle')[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center', 'left-middle', 'center-middle', 'right-middle'];
        const contentPositions: ('top' | 'center' | 'bottom')[] = ['top', 'center', 'bottom'];
        const textAligns: ('left' | 'center' | 'right')[] = ['left', 'center', 'right'];
        const vizTypes = ['bars', 'wave', 'circular', 'particles', 'pulse-ring', 'waveform', 'spectrogram', 'spectrum', 'stereo-field'];
        const vizColorModes = ['accent', 'gradient', 'custom', 'rainbow'];
        const vizPositions = ['bottom', 'top', 'full', 'center'];

        // Collect all built-in font values (skip custom/uploaded)
        const fontValues = fullFontGroups.flatMap(g => g.options.map(o => o.value));

        // Pick random highlight + derive colors
        const randomHighlight = pick(highlights);
        const derivedColors = deriveHighlightColors(randomHighlight);
        const highlightColor = derivedColors?.color ?? randColor();
        const highlightBg = derivedColors?.bg ?? randColor();

        // Random background source
        const randomBgSource = pick(bgSources);

        // Random booleans
        const randomBool = () => Math.random() > 0.5;

        // Build the random config
        // Build the random config
        const randomConfig: RenderConfig = {
            ...config,
        };

        // Background
        if (config.randomizeBackgroundSource !== false) {
            randomConfig.backgroundSource = randomBgSource as RenderConfig['backgroundSource'];
            randomConfig.backgroundColor = randColor();
            randomConfig.backgroundGradient = randGradient();
        }
        if (config.randomizeBackgroundEffects !== false) {
            randomConfig.backgroundBlurStrength = Math.random() > 0.6 ? Math.floor(Math.random() * 25) : 0;
            randomConfig.enableGradientOverlay = randomBool();
        }
        // Typography
        if (config.randomizeTypographyStyle !== false) {
            randomConfig.fontFamily = pick(fontValues);
            randomConfig.fontSizeScale = randFloat(0.6, 2.0);
            randomConfig.fontColor = randColor();
            randomConfig.fontWeight = pick(['normal', 'bold']) as 'normal' | 'bold';
            randomConfig.fontStyle = pick(['normal', 'italic']) as 'normal' | 'italic';
            randomConfig.textDecoration = pick(['none', 'none', 'none', 'underline', 'line-through']) as 'none' | 'underline' | 'line-through';
            randomConfig.textCase = pick(textCases) as RenderConfig['textCase'];
            randomConfig.lyricLineHeight = randFloat(1.0, 2.0);
            randomConfig.lyricStyleTarget = pick(['active-only', 'all']) as 'active-only' | 'all';
            randomConfig.textAlign = pick(textAligns);
            randomConfig.contentPosition = pick(contentPositions);
            randomConfig.marginTopScale = randFloat(0.5, 2.5);
            randomConfig.marginBottomScale = randFloat(0.5, 2.5);
        }
        // Lyric Display Mode
        if (config.randomizeLyricDisplayMode !== false) {
            randomConfig.lyricDisplayMode = pick(displayModes) as RenderConfig['lyricDisplayMode'];
        }
        // Text Effect
        if (config.randomizeTextEffect !== false) {
            randomConfig.textEffect = pick(textEffects) as RenderConfig['textEffect'];
        }
        // Text Animation
        if (config.randomizeTextAnimation !== false) {
            randomConfig.textAnimation = pick(textAnimations) as RenderConfig['textAnimation'];
        }
        // Transition
        if (config.randomizeTransitionEffect !== false) {
            randomConfig.transitionEffect = pick(transitions) as RenderConfig['transitionEffect'];
        }
        // Highlight Effect
        if (config.randomizeHighlightEffect !== false) {
            randomConfig.highlightEffect = randomHighlight as RenderConfig['highlightEffect'];
            randomConfig.highlightColor = highlightColor;
            randomConfig.highlightBackground = highlightBg;
            randomConfig.useCustomHighlightColors = false;
        }
        // Visible Elements
        if (config.randomizeVisibleElements !== false) {
            randomConfig.showTitle = randomBool();
            randomConfig.showArtist = randomBool();
            randomConfig.showCover = randomBool();
            randomConfig.showIntro = randomBool();
            randomConfig.showLyrics = true;
        }
        // Intro Settings
        if (config.randomizeIntroSettings !== false) {
            randomConfig.introMode = pick(['auto', 'manual']) as 'auto' | 'manual';
        }
        // Channel / Watermark
        if (config.randomizeChannelInfo !== false) {
            randomConfig.showChannelInfo = Math.random() > 0.7; // 30% chance
            randomConfig.channelInfoPosition = pick(positions);
            randomConfig.channelInfoStyle = pick(channelStyles) as RenderConfig['channelInfoStyle'];
            randomConfig.channelInfoSizeScale = randFloat(0.6, 1.6);
            randomConfig.channelInfoMarginScale = randFloat(0.5, 2.0);
            randomConfig.channelInfoFontFamily = pick(fontValues);
            randomConfig.channelInfoFontWeight = pick(['normal', 'bold']) as 'normal' | 'bold';
            randomConfig.channelInfoFontStyle = pick(['normal', 'italic']) as 'normal' | 'italic';
            randomConfig.channelInfoFontColor = randColor();
        }
        // Floating Notes / Media
        if (config.randomizeFloatingNotes !== false) {
            randomConfig.showFloatingNotes = Math.random() > 0.7; // 30% chance
            randomConfig.floatingNotesLayout = pick(['text-only', 'media-only', 'media-left-text', 'media-right-text', 'media-top-text', 'media-bottom-text']) as any;
            randomConfig.floatingNotesPosition = pick(positions) as any;
            randomConfig.floatingNotesShape = pick(['none', 'sharp', 'rounded']) as any;
            randomConfig.floatingNotesFillColor = randColor();
            randomConfig.floatingNotesOutlineColor = randColor();
            randomConfig.floatingNotesOutlineSize = Math.floor(Math.random() * 5);
            randomConfig.floatingNotesOpacity = randFloat(0.3, 1.0);
            randomConfig.floatingNotesMarginScale = randFloat(0.5, 2.0);
            randomConfig.floatingNotesWidth = Math.floor(150 + Math.random() * 300);
            randomConfig.floatingNotesHeight = Math.floor(100 + Math.random() * 200);
            randomConfig.floatingNotesMediaSizeScale = randFloat(0.2, 0.7);
            randomConfig.floatingNotesFontSizeScale = randFloat(0.8, 1.8);
            randomConfig.floatingNotesFontFamily = pick(fontValues);
            randomConfig.floatingNotesFontStyle = pick(['normal', 'italic']) as any;
            randomConfig.floatingNotesFontWeight = pick(['normal', 'bold']) as any;
            randomConfig.floatingNotesFontColor = randColor();
            randomConfig.floatingNotesTextAlign = pick(['left', 'center', 'right']) as any;
        }
        // Song Info Design
        if (config.randomizeSongInfoDesign !== false) {
            randomConfig.infoPosition = pick(positions);
            randomConfig.infoStyle = pick(infoStyles) as RenderConfig['infoStyle'];
            randomConfig.infoMarginScale = randFloat(0.5, 2.0);
            randomConfig.infoSizeScale = randFloat(0.6, 1.6);
            randomConfig.infoFontFamily = pick(fontValues);
            randomConfig.infoFontWeight = pick(['normal', 'bold']) as 'normal' | 'bold';
            randomConfig.infoFontStyle = pick(['normal', 'italic']) as 'normal' | 'italic';
            randomConfig.infoFontColor = randColor();
        }
        // Visual Transition
        if (config.randomizeVisualTransition !== false) {
            randomConfig.visualTransitionType = pick(['none', 'crossfade', 'fade-to-black']) as RenderConfig['visualTransitionType'];
            randomConfig.visualTransitionDuration = randFloat(0.5, 2.0);
        }
        // Audio Visualizer
        if (config.randomizeAudioVisualizer !== false) {
            randomConfig.showVisualization = Math.random() > 0.6; // 40% chance
            randomConfig.visualizationType = pick(vizTypes) as RenderConfig['visualizationType'];
            randomConfig.visualizationColorMode = pick(vizColorModes) as RenderConfig['visualizationColorMode'];
            randomConfig.visualizationColor1 = randColor();
            randomConfig.visualizationColor2 = randColor();
            randomConfig.visualizationOpacity = randFloat(0.3, 1.0);
            randomConfig.visualizationPosition = pick(vizPositions) as RenderConfig['visualizationPosition'];
            randomConfig.visualizationSensitivity = randFloat(0.5, 3.0);
            randomConfig.visualizationBarCount = Math.floor(16 + Math.random() * 112); // 16-128
        }
        // Keep render mode unchanged
        randomConfig.renderMode = config.renderMode;
        // Intro
        randomConfig.introText = config.introText;
        randomConfig.introMode = config.introMode;

        setConfig(randomConfig);
        setPreset('custom');
        toast.success('🎲 Random settings generated!');
    };

    const handleReset = async () => {
        const confirmed = await confirm(
            'This will reset ALL settings to factory defaults:\n\n• Visual preset → Default\n• Background, fonts & colors\n• Text effects, animations & transitions\n• Song info, watermark & visualization\n• Output: 1080p, 30fps, WebCodecs\n\nThis cannot be undone.',
            'Reset All Settings to Default'
        );
        if (confirmed) {
            setConfig(DEFAULT_CONFIG);
            setPreset('default');
            setResolution('1080p');
            setAspectRatio('16:9');
            setRenderCodec('auto');
            setRenderFps(30);
            setRenderQuality('med');
            setRenderEngine('webcodecs');
            setFfmpegCodec('h264');

            // Reset File Inputs
            if (channelImageInputRef.current) channelImageInputRef.current.value = '';
            if (backgroundImageInputRef.current) backgroundImageInputRef.current.value = '';
            if (backgroundVideoInputRef.current) backgroundVideoInputRef.current.value = '';
            if (settingsInputRef.current) settingsInputRef.current.value = '';

            // Reset Custom Font
            onClearCustomFont();
            if (onClearChannelCustomFont) onClearChannelCustomFont();
            if (onClearInfoCustomFont) onClearInfoCustomFont();

            // Reset Font File Inputs
            if (fontInputRef.current) fontInputRef.current.value = '';
            if (channelFontInputRef.current) channelFontInputRef.current.value = '';
            if (infoFontInputRef.current) infoFontInputRef.current.value = '';

            setImportedFileName(null);
            toast.success('All settings have been reset to default.');
        }
    };

    const handleExportSettings = () => {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

        const fix = (v: unknown, digits = 6) =>
            typeof v === 'number' ? Number(v.toFixed(digits)) : v;

        // ── Resolve real font name + source type for each slot ───────────────
        // fontFamily / channelInfoFontFamily / infoFontFamily store a CSS
        // placeholder name when a custom file font is used:
        //   'CustomFont'  → uploaded file for lyrics     (real name = customFontName)
        //   'ChannelFont' → uploaded file for watermark  (real name = customChannelFontName)
        //   'InfoFont'    → uploaded file for song-info  (real name = customInfoFontName)
        // For Google Fonts loaded in-session, fontFamily IS the real name but
        // requires an internet connection on the target machine.
        type FontNote = {
            slot: string;
            cssValue: string;
            realName: string;
            source: 'uploaded-file' | 'google-font' | 'built-in';
            warning: string;
        };
        const resolveFontNote = (
            cssValue: string | undefined,
            uploadedName: string | null | undefined,
            placeholder: string,
            slotLabel: string,
        ): FontNote => {
            if (cssValue === placeholder && uploadedName) {
                return {
                    slot: slotLabel,
                    cssValue: placeholder,
                    realName: uploadedName,
                    source: 'uploaded-file',
                    warning: `Re-upload font file "${uploadedName}" after importing this config.`,
                };
            }
            if (cssValue && loadedGoogleFonts.some(f => cssValue.includes(f))) {
                const gName = cssValue.replace(/['"]/g, '').trim();
                return {
                    slot: slotLabel,
                    cssValue: cssValue,
                    realName: gName,
                    source: 'google-font',
                    warning: `Google Font "${gName}" – internet connection required on target machine.`,
                };
            }
            return {
                slot: slotLabel,
                cssValue: cssValue ?? 'sans-serif',
                realName: cssValue ?? 'sans-serif',
                source: 'built-in',
                warning: '',
            };
        };

        const fnLyrics = resolveFontNote(config.fontFamily, customFontName, 'CustomFont', 'lyrics');
        const fnChannel = resolveFontNote(config.channelInfoFontFamily, customChannelFontName, 'ChannelFont', 'channel-watermark');
        const fnInfo = resolveFontNote(config.infoFontFamily, customInfoFontName, 'InfoFont', 'song-info');

        const fontNotes = [fnLyrics, fnChannel, fnInfo].filter(n => n.source !== 'built-in');

        const exportData: Record<string, unknown> = {
            // ── Meta block ────────────────────────────────────────────────────
            _meta: {
                exportedAt: now.toISOString(),
                appVersion: '1.0',
                schema: 'render-settings-v1',
                // _fontNotes documents every non-built-in font in this config.
                // It tells you the real font name and what to do after importing.
                _fontNotes: fontNotes.length > 0 ? fontNotes : 'all fonts are built-in system fonts',
            },
            // ── Visual config ─────────────────────────────────────────────────
            ...config,
            // Fix floating-point noise in scale fields
            fontSizeScale: fix(config.fontSizeScale),
            infoSizeScale: fix(config.infoSizeScale),
            infoMarginScale: fix(config.infoMarginScale),
            channelInfoSizeScale: fix(config.channelInfoSizeScale),
            channelInfoMarginScale: fix(config.channelInfoMarginScale),
            marginTopScale: fix(config.marginTopScale),
            marginBottomScale: fix(config.marginBottomScale),
            visualizationOpacity: fix(config.visualizationOpacity, 4),
            visualizationSensitivity: fix(config.visualizationSensitivity, 4),
            // ── Font family keys with inline "comment" companions ─────────────
            // __note_ fields are JSON pseudo-comments (stripped on import).
            // They make the file self-explanatory when opened in a text editor.
            fontFamily: config.fontFamily,
            ...(fnLyrics.source !== 'built-in' && {
                __note_fontFamily: `Real name: "${fnLyrics.realName}" [${fnLyrics.source}]` +
                    (fnLyrics.source === 'uploaded-file' ? ' – re-upload required after import' : ''),
            }),
            channelInfoFontFamily: config.channelInfoFontFamily,
            ...(fnChannel.source !== 'built-in' && config.channelInfoFontFamily && {
                __note_channelInfoFontFamily: `Real name: "${fnChannel.realName}" [${fnChannel.source}]` +
                    (fnChannel.source === 'uploaded-file' ? ' – re-upload required after import' : ''),
            }),
            infoFontFamily: config.infoFontFamily,
            ...(fnInfo.source !== 'built-in' && config.infoFontFamily && {
                __note_infoFontFamily: `Real name: "${fnInfo.realName}" [${fnInfo.source}]` +
                    (fnInfo.source === 'uploaded-file' ? ' – re-upload required after import' : ''),
            }),
            // ── Output / render settings ──────────────────────────────────────
            preset,
            resolution,
            aspectRatio,
            renderCodec,
            renderFps,
            renderQuality,
            renderEngine,
            ffmpegCodec,
            // ── Font file name metadata ───────────────────────────────────────
            // Human-readable names for 'CustomFont' / 'ChannelFont' / 'InfoFont'.
            // The actual font data is NOT exported (binary); re-upload is required.
            customFontName,
            customChannelFontName,
            customInfoFontName,
            // Guarantee these are present even though they live in config spread
            channelInfoFontWeight: config.channelInfoFontWeight,
            channelInfoFontStyle: config.channelInfoFontStyle,
            infoFontWeight: config.infoFontWeight,
            infoFontStyle: config.infoFontStyle,
        };

        // Strip large binary fields that don't belong to the current source
        if (exportData.backgroundSource !== 'image') delete exportData.backgroundImage;
        if (exportData.backgroundSource !== 'video') delete exportData.backgroundVideo;
        if (!exportData.showChannelInfo) delete exportData.channelInfoImage;
        DEPRECATED_RANDOMIZE_KEYS.forEach((key) => {
            delete exportData[key];
        });

        try {
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `render_settings_${timestamp}.json`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            toast.success(`Settings exported as render_settings_${timestamp}.json`, 3000);
        } catch (err) {
            console.error('Export failed:', err);
            toast.error('Failed to export settings.', 3000);
        }
    };

    const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setImportedFileName(file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                if (json && typeof json === 'object') {
                    // Extract Output Settings and meta that are NOT part of RenderConfig
                    const {
                        // ── Top-level meta / pseudo-comment fields (strip on import) ──
                        _meta: _metaIgnored,               // meta block added by export
                        __note_fontFamily: _nf,            // pseudo-comment field
                        __note_channelInfoFontFamily: _nc, // pseudo-comment field
                        __note_infoFontFamily: _ni,        // pseudo-comment field
                        // ── Output settings (state outside RenderConfig) ──
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

                    DEPRECATED_RANDOMIZE_KEYS.forEach((key) => {
                        delete (newConfig as Record<string, unknown>)[key];
                    });

                    RANDOMIZE_TOGGLE_KEYS.forEach((key) => {
                        if (newConfig[key] !== undefined) {
                            newConfig[key] = Boolean(newConfig[key]);
                        }
                    });

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
                        'marginBottomScale',
                        'visualizationOpacity',
                        'visualizationSensitivity',
                        'visualizationBarCount'
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
                    if (newConfig.showVisualization !== undefined) newConfig.showVisualization = Boolean(newConfig.showVisualization);
                    if (newConfig.enableGradientOverlay !== undefined) newConfig.enableGradientOverlay = Boolean(newConfig.enableGradientOverlay);
                    // Three.js boolean fields
                    if (newConfig.threejsCameraMovement !== undefined) newConfig.threejsCameraMovement = Boolean(newConfig.threejsCameraMovement);

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
                    if (newConfig.lyricVisibilityMode && !['default', 'auto'].includes(newConfig.lyricVisibilityMode)) {
                        newConfig.lyricVisibilityMode = 'default';
                    }
                    if (!newConfig.lyricVisibilityMode) newConfig.lyricVisibilityMode = 'default';

                    if (!['normal', 'bold'].includes(newConfig.fontWeight)) newConfig.fontWeight = 'bold';
                    if (!['normal', 'italic'].includes(newConfig.fontStyle)) newConfig.fontStyle = 'normal';
                    if (!['none', 'underline', 'line-through'].includes(newConfig.textDecoration)) newConfig.textDecoration = 'none';
                    if (!textCaseOptions.includes(newConfig.textCase)) newConfig.textCase = 'none';
                    if (!['auto', 'manual'].includes(newConfig.introMode)) newConfig.introMode = 'auto';
                    if (newConfig.lyricStyleTarget && !['active-only', 'all'].includes(newConfig.lyricStyleTarget)) newConfig.lyricStyleTarget = 'active-only';

                    // Validate Info & Channel
                    const validPositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center', 'left-middle', 'center-middle', 'right-middle'];

                    if (newConfig.infoPosition && !validPositions.includes(newConfig.infoPosition)) newConfig.infoPosition = 'top-left';
                    if (newConfig.infoStyle && !isValidGroupOption(newConfig.infoStyle, infoStyleGroups)) newConfig.infoStyle = 'classic';

                    if (newConfig.channelInfoPosition && !validPositions.includes(newConfig.channelInfoPosition)) newConfig.channelInfoPosition = 'bottom-right';
                    if (newConfig.channelInfoStyle && !isValidGroupOption(newConfig.channelInfoStyle, channelInfoStyleGroups)) newConfig.channelInfoStyle = 'classic';

                    // Validate Floating Notes
                    if (newConfig.floatingNotesPosition && !validPositions.includes(newConfig.floatingNotesPosition)) newConfig.floatingNotesPosition = 'bottom-left';
                    if (newConfig.floatingNotesLayout && !['text-only', 'media-only', 'media-left-text', 'media-right-text', 'media-top-text', 'media-bottom-text'].includes(newConfig.floatingNotesLayout)) {
                        newConfig.floatingNotesLayout = 'text-only';
                    }
                    if (newConfig.floatingNotesShape && !['none', 'sharp', 'rounded'].includes(newConfig.floatingNotesShape)) {
                        newConfig.floatingNotesShape = 'rounded';
                    }
                    if (newConfig.floatingNotesTextAlign && !['left', 'center', 'right'].includes(newConfig.floatingNotesTextAlign)) {
                        newConfig.floatingNotesTextAlign = 'left';
                    }
                    if (newConfig.floatingNotesMediaSizeScale !== undefined) {
                        newConfig.floatingNotesMediaSizeScale = Math.min(0.9, Math.max(0.1, Number(newConfig.floatingNotesMediaSizeScale) || 0.4));
                    }
                    if (newConfig.floatingNotesFontSizeScale !== undefined) {
                        newConfig.floatingNotesFontSizeScale = Math.min(3.0, Math.max(0.5, Number(newConfig.floatingNotesFontSizeScale) || 1.0));
                    }
                    if (newConfig.floatingNotesOutlineSize !== undefined) {
                        newConfig.floatingNotesOutlineSize = Math.max(0, Number(newConfig.floatingNotesOutlineSize) || 0);
                    }
                    const validFloatingNotesVisibility = ['all', 'follow-lyrics', 'from-start', 'from-end', 'from-start-and-end', 'specific'];
                    if (newConfig.floatingNotesVisibilityMode && !validFloatingNotesVisibility.includes(newConfig.floatingNotesVisibilityMode)) {
                        newConfig.floatingNotesVisibilityMode = 'all';
                    }
                    if (newConfig.floatingNotesFromStartDuration !== undefined) {
                        newConfig.floatingNotesFromStartDuration = Math.max(0, Number(newConfig.floatingNotesFromStartDuration) || 0);
                    }
                    if (newConfig.floatingNotesFromEndDuration !== undefined) {
                        newConfig.floatingNotesFromEndDuration = Math.max(0, Number(newConfig.floatingNotesFromEndDuration) || 0);
                    }

                    // Validate Visualization Settings
                    const validVizTypes = ['bars', 'wave', 'circular', 'particles', 'pulse-ring', 'waveform', 'spectrogram', 'spectrum', 'stereo-field'];
                    if (newConfig.visualizationType && !validVizTypes.includes(newConfig.visualizationType)) newConfig.visualizationType = 'bars';
                    const validColorModes = ['accent', 'gradient', 'custom', 'rainbow'];
                    if (newConfig.visualizationColorMode && !validColorModes.includes(newConfig.visualizationColorMode)) newConfig.visualizationColorMode = 'gradient';
                    const validVizPositions = ['bottom', 'top', 'full', 'center'];
                    if (newConfig.visualizationPosition && !validVizPositions.includes(newConfig.visualizationPosition)) newConfig.visualizationPosition = 'bottom';
                    if (newConfig.visualizationOpacity !== undefined) newConfig.visualizationOpacity = Math.max(0, Math.min(1, newConfig.visualizationOpacity));
                    if (newConfig.visualizationSensitivity !== undefined) newConfig.visualizationSensitivity = Math.max(0.5, Math.min(3, newConfig.visualizationSensitivity));
                    if (newConfig.visualizationBarCount !== undefined) newConfig.visualizationBarCount = Math.max(16, Math.min(128, Math.round(newConfig.visualizationBarCount)));

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
                        toast.success(`Settings loaded. Note: Config used font "${importedCustomFontName}".`, 4000);
                    } else if (importedCustomChannelFontName || importedCustomInfoFontName) {
                        toast.success(`Settings loaded. Custom fonts referenced: ${[importedCustomChannelFontName, importedCustomInfoFontName].filter(Boolean).join(', ')}`, 4000);
                    } else {
                        toast.success('Settings loaded successfully!', 3000);
                    }
                }
            } catch (err) {
                console.error(err);
                toast.error('Failed to parse settings file. Please ensure it is a valid JSON file.', 4000);
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
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-3 md:px-4 bg-zinc-900/50 overflow-hidden">
                <div className="flex items-center gap-2 min-w-0">
                    <Settings size={18} className="text-purple-400 shrink-0" />
                    <h2 className="font-bold text-zinc-200 truncate">Render Settings</h2>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                    <input
                        ref={settingsInputRef}
                        type="file"
                        name="import-settings"
                        id="import-settings"
                        aria-label="Import Settings JSON"
                        accept=".json"
                        className="hidden"
                        onChange={handleImportSettings}
                    />
                    {/* Import */}
                    <button
                        onClick={() => settingsInputRef.current?.click()}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all"
                        title="Import settings (.json)"
                    >
                        <Upload size={15} />
                    </button>
                    {/* Export */}
                    <button
                        onClick={handleExportSettings}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-300 hover:bg-blue-500/10 transition-all"
                        title="Export settings (.json)"
                    >
                        <Download size={15} />
                    </button>
                    {/* Reset */}
                    <button
                        onClick={handleReset}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Reset all settings to defaults"
                    >
                        <RotateCcw size={15} />
                    </button>
                    <div className="w-px h-4 bg-white/10 mx-0.5" />
                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-6 custom-scrollbar">

                {/* ── Settings Management Card ─────────────────────────────── */}
                <section className="space-y-2">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <Settings size={14} /> Settings Management
                    </h3>
                    <div className="rounded-xl border border-white/10 bg-zinc-800/40 overflow-hidden">
                        {/* Import row */}
                        <div className="flex items-center gap-3 px-3 py-2.5 border-b border-white/5">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-zinc-200">Import Settings</p>
                                <p className="text-[10px] text-zinc-500 truncate">
                                    {importedFileName
                                        ? <span className="text-emerald-400 font-mono">✓ {importedFileName}</span>
                                        : 'Load a previously exported .json file'}
                                </p>
                            </div>
                            <button
                                onClick={() => settingsInputRef.current?.click()}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-300 hover:text-emerald-100 text-xs font-semibold transition-all active:scale-95 shrink-0"
                                title="Import settings from a .json file"
                            >
                                <Upload size={13} /> Import
                            </button>
                        </div>
                        {/* Export row */}
                        <div className="flex items-center gap-3 px-3 py-2.5 border-b border-white/5">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-zinc-200">Export Settings</p>
                                <p className="text-[10px] text-zinc-500">Save current config as a .json file</p>
                            </div>
                            <button
                                onClick={handleExportSettings}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 hover:text-blue-100 text-xs font-semibold transition-all active:scale-95 shrink-0"
                                title="Export current settings as a .json file"
                            >
                                <Download size={13} /> Export
                            </button>
                        </div>
                        {/* Random Settings row */}
                        <div className="px-3 py-2.5 border-b border-white/5 space-y-2.5">
                            <div className="flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-zinc-200">Random Settings</p>
                                    <p className="text-[10px] text-zinc-500">Generate random visual settings</p>
                                </div>
                                <button
                                    onClick={handleRandomSettings}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-300 hover:text-purple-100 text-xs font-semibold transition-all active:scale-95 shrink-0"
                                    title="Generate random visual settings"
                                >
                                    <Shuffle size={13} /> Randomize
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                <button
                                    onClick={handleRandomizeSelectAll}
                                    className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-[10px] text-zinc-300 hover:text-white transition-colors"
                                    title="Check all random toggles"
                                >
                                    All
                                </button>
                                <button
                                    onClick={handleRandomizeSelectNone}
                                    className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-[10px] text-zinc-300 hover:text-white transition-colors"
                                    title="Uncheck all random toggles"
                                >
                                    None
                                </button>
                                <button
                                    onClick={handleRandomizeSelectTypography}
                                    className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-[10px] text-zinc-300 hover:text-white transition-colors"
                                    title="Typography & style + text/visual effects only"
                                >
                                    Lyrics
                                </button>
                                <button
                                    onClick={handleRandomizeSelectStyleEffect}
                                    className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-[10px] text-zinc-300 hover:text-white transition-colors"
                                    title="Background, visualizer, highlight, visible elements, text & transition effects"
                                >
                                    Style | FX
                                </button>
                                <button
                                    onClick={handleRandomizeInvertSelection}
                                    className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-[10px] text-zinc-300 hover:text-white transition-colors"
                                    title="Invert current checkbox selection"
                                >
                                    Invert
                                </button>
                            </div>
                        </div>
                        {/* Reset row */}
                        <div className="flex items-center gap-3 px-3 py-2.5">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-zinc-200">Reset to Default</p>
                                <p className="text-[10px] text-zinc-500">Restore all settings to factory defaults</p>
                            </div>
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/30 border border-red-500/20 hover:border-red-500/50 text-red-400 hover:text-red-200 text-xs font-semibold transition-all active:scale-95 shrink-0"
                                title="Reset all settings to factory defaults"
                            >
                                <RotateCcw size={13} /> Reset
                            </button>
                        </div>
                    </div>
                </section>

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
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <ImageIcon size={14} /> Background Source
                        </h3>
                        <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={config.randomizeBackgroundSource !== false}
                                onChange={(e) => handleChange('randomizeBackgroundSource', e.target.checked)}
                                className="w-3 h-3 rounded border-white/10 bg-zinc-800 text-purple-600 focus:ring-0 cursor-pointer"
                            />
                            <span>Random</span>
                        </label>
                    </div>
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
                                id="solid-bg-color"
                                type="color"
                                name="solid-bg-color"
                                aria-label="Background Color"
                                value={config.backgroundColor}
                                onChange={(e) => handleChange('backgroundColor', e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none shrink-0"
                            />
                            <input
                                id="solid-bg-hex"
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
                                <label htmlFor="bg-image-upload" className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Custom Background Image</label>
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

                    {config.backgroundSource === 'video' && (
                        <div className="space-y-3 animate-in slide-in-from-top-1 fade-in duration-200">
                            <div className="space-y-1.5">
                                <label htmlFor="bg-video-upload" className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Custom Background Video</label>
                                <input
                                    ref={backgroundVideoInputRef}
                                    type="file"
                                    name="bg-video-upload"
                                    id="bg-video-upload"
                                    accept="video/*"
                                    onChange={handleBackgroundVideoUpload}
                                    className="hidden"
                                />
                                {config.backgroundVideo ? (
                                    <div className="flex items-center gap-3 bg-zinc-800 p-2 rounded-lg border border-white/10">
                                        <div className="w-10 h-10 rounded bg-zinc-700/50 flex items-center justify-center overflow-hidden border border-white/5">
                                            <video src={config.backgroundVideo} className="w-full h-full object-cover" muted autoPlay loop />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-zinc-300 truncate">Video Loaded</p>
                                            <button
                                                onClick={() => handleChange('backgroundVideo', undefined)}
                                                className="text-[10px] text-red-400 hover:text-red-300"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => backgroundVideoInputRef.current?.click()}
                                            className="p-1.5 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white"
                                        >
                                            <Settings size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => backgroundVideoInputRef.current?.click()}
                                        className="w-full flex items-center justify-center gap-2 bg-zinc-800/50 border border-dashed border-white/10 hover:border-purple-500/50 rounded-lg px-3 py-3 text-zinc-400 hover:text-purple-300 transition-colors"
                                    >
                                        <Upload size={14} />
                                        <span className="text-xs">Upload Video Loop</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {config.backgroundSource === 'threejs' && (
                        <div className="space-y-3 animate-in slide-in-from-top-1 fade-in duration-200">
                            <div className="space-y-1.5">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Three.js Scene Effect</span>
                                <GroupedSelection
                                    value={config.threejsScene || 'stars'}
                                    onChange={(val) => handleChange('threejsScene', val)}
                                    groups={threejsSceneGroups}
                                />
                            </div>
                            <div className="space-y-1.5 flex flex-col gap-1">
                                <label htmlFor="threejs-speed" className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Speed: {config.threejsSpeed || 1}x</label>
                                <input
                                    id="threejs-speed"
                                    type="range"
                                    min="0.1"
                                    max="5"
                                    step="0.1"
                                    value={config.threejsSpeed || 1}
                                    onChange={(e) => handleChange('threejsSpeed', parseFloat(e.target.value))}
                                    className="w-full accent-purple-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label htmlFor="threejs-color" className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Theme Color</label>
                                    <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5 h-9">
                                        <input
                                            id="threejs-color"
                                            name="threejs-color"
                                            type="color"
                                            value={config.threejsColor || '#a855f7'}
                                            onChange={(e) => handleChange('threejsColor', e.target.value)}
                                            className="w-6 h-6 bg-transparent cursor-pointer border-none shrink-0"
                                        />
                                        <input
                                            id="threejs-color-hex"
                                            name="threejs-color-hex"
                                            type="text"
                                            aria-label="Theme Color Hex"
                                            value={config.threejsColor || '#a855f7'}
                                            onChange={(e) => handleChange('threejsColor', e.target.value)}
                                            className="w-full bg-transparent border-none text-xs items-center flex text-zinc-200 focus:outline-none font-mono"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="threejs-bg-color" className="text-[10px] text-zinc-500 font-bold uppercase ml-1" title="Leave empty for transparent (uses app background)">Bg Color</label>
                                    <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5 h-9">
                                        <input
                                            id="threejs-bg-color"
                                            name="threejs-bg-color"
                                            type="color"
                                            value={config.threejsBgColor || '#000000'}
                                            onChange={(e) => handleChange('threejsBgColor', e.target.value)}
                                            className="w-6 h-6 bg-transparent cursor-pointer border-none shrink-0"
                                        />
                                        <input
                                            id="threejs-bg-color-hex"
                                            name="threejs-bg-color-hex"
                                            type="text"
                                            placeholder="None"
                                            aria-label="Background Color Hex"
                                            value={config.threejsBgColor || ''}
                                            onChange={(e) => handleChange('threejsBgColor', e.target.value)}
                                            className="w-full bg-transparent border-none text-xs items-center flex text-zinc-200 focus:outline-none placeholder:text-zinc-600 font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-1">
                                <label htmlFor="threejs-camera-movement" className="flex items-center gap-2 cursor-pointer group">
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            id="threejs-camera-movement"
                                            name="threejs-camera-movement"
                                            type="checkbox"
                                            checked={config.threejsCameraMovement || false}
                                            onChange={(e) => handleChange('threejsCameraMovement', e.target.checked)}
                                            className="peer sr-only"
                                        />
                                        <div className="w-5 h-5 bg-zinc-800 border border-white/20 rounded-md peer-checked:bg-purple-500 peer-checked:border-purple-500 transition-colors"></div>
                                        <Check size={12} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                    </div>
                                    <span className="text-xs text-zinc-300 font-medium group-hover:text-purple-300 transition-colors">Auto Camera Movement</span>
                                </label>
                            </div>
                        </div>
                    )}
                </section>

                {/* Background Blur */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <Palette size={14} /> Background Effects
                        </h3>
                        <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={config.randomizeBackgroundEffects !== false}
                                onChange={(e) => handleChange('randomizeBackgroundEffects', e.target.checked)}
                                className="w-3 h-3 rounded border-white/10 bg-zinc-800 text-purple-600 focus:ring-0 cursor-pointer"
                            />
                            <span>Random</span>
                        </label>
                    </div>
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
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Blur Intensity</span>
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
                    <div className="bg-zinc-800/30 border border-white/5 rounded-lg p-2.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50 transition-colors">
                        <div className="flex flex-col">
                            <label htmlFor="real-color-media" className="text-xs text-zinc-300 font-medium cursor-pointer">Real Color Media Source</label>
                            <span className="text-[10px] text-zinc-500">Disable dark dimming effect on background</span>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                id="real-color-media"
                                name="real-color-media"
                                aria-label="Real Color Media"
                                checked={config.useRealColorMedia ?? false}
                                onChange={(e) => handleChange('useRealColorMedia', e.target.checked)}
                                className="sr-only peer"
                            />
                            <label htmlFor="real-color-media" className="w-8 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600 block cursor-pointer"></label>
                        </div>
                    </div>

                    {/* Gradient Overlay Toggle */}
                    <div className="bg-zinc-800/30 border border-white/5 rounded-lg p-2.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50 transition-colors">
                        <div className="flex flex-col">
                            <label htmlFor="gradient-overlay" className="text-xs text-zinc-300 font-medium cursor-pointer">Black Gradient Overlay</label>
                            <span className="text-[10px] text-zinc-500">Fade bottom to top (readability)</span>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                id="gradient-overlay"
                                name="gradient-overlay"
                                aria-label="Gradient Overlay"
                                checked={config.enableGradientOverlay ?? false}
                                onChange={(e) => handleChange('enableGradientOverlay', e.target.checked)}
                                className="sr-only peer"
                            />
                            <label htmlFor="gradient-overlay" className="w-8 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600 block cursor-pointer"></label>
                        </div>
                    </div>
                </section>

                {/* Audio Visualization (Web View Only) */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <Activity size={14} /> Audio Visualizer
                        </h3>
                        <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={config.randomizeAudioVisualizer !== false}
                                onChange={(e) => handleChange('randomizeAudioVisualizer', e.target.checked)}
                                className="w-3 h-3 rounded border-white/10 bg-zinc-800 text-purple-600 focus:ring-0 cursor-pointer"
                            />
                            <span>Random</span>
                        </label>
                    </div>

                    {/* Enable Toggle */}
                    <div className="bg-zinc-800/30 border border-white/5 rounded-lg p-2.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50 transition-colors">
                        <div className="flex flex-col">
                            <label htmlFor="show-visualization" className="text-xs text-zinc-300 font-medium cursor-pointer">Show Visualization</label>
                            <span className="text-[10px] text-zinc-500">Real-time audio reactive visuals</span>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                id="show-visualization"
                                name="show-visualization"
                                aria-label="Show Visualization"
                                checked={config.showVisualization ?? false}
                                onChange={(e) => handleChange('showVisualization', e.target.checked)}
                                className="sr-only peer"
                            />
                            <label htmlFor="show-visualization" className="w-8 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600 block cursor-pointer"></label>
                        </div>
                    </div>

                    {config.showVisualization && (
                        <div className="space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">

                            {/* Visualization Type */}
                            <div className="space-y-1.5">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Visualization Type</span>
                                <GroupedSelection
                                    value={config.visualizationType || 'bars'}
                                    onChange={(val) => handleChange('visualizationType', val)}
                                    groups={[{
                                        label: "Minimalist",
                                        options: [
                                            { label: "Bars", value: "bars" },
                                            { label: "Wave", value: "wave" },
                                            { label: "Waveform (Filled)", value: "waveform" },
                                            { label: "Spectrum", value: "spectrum" },
                                        ]
                                    }, {
                                        label: "Advanced",
                                        options: [
                                            { label: "Spectrogram", value: "spectrogram" },
                                            { label: "Stereo Field", value: "stereo-field" },
                                        ]
                                    }, {
                                        label: "Dynamic",
                                        options: [
                                            { label: "Circular", value: "circular" },
                                            { label: "Particles", value: "particles" },
                                            { label: "Pulse Ring", value: "pulse-ring" },
                                        ]
                                    }]}
                                />
                            </div>

                            {/* Color Mode */}
                            <div className="space-y-1.5">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Color Mode</span>
                                <div className="grid grid-cols-4 gap-1">
                                    {(['accent', 'gradient', 'rainbow', 'custom'] as const).map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => handleChange('visualizationColorMode', mode)}
                                            className={`px-2 py-1.5 rounded-md text-[10px] font-medium border transition-all capitalize ${config.visualizationColorMode === mode
                                                ? 'bg-purple-600/40 border-purple-500/50 text-purple-200'
                                                : 'bg-zinc-800/50 border-white/5 text-zinc-400 hover:border-white/20'
                                                }`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Colors */}
                            {config.visualizationColorMode === 'custom' && (
                                <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
                                    <div className="flex items-center gap-2 bg-zinc-800/30 p-2 rounded-lg border border-white/5">
                                        <input
                                            id="viz-color-1"
                                            type="color"
                                            name="viz-color-1"
                                            aria-label="Visualization Color 1"
                                            value={config.visualizationColor1 || '#a855f7'}
                                            onChange={(e) => handleChange('visualizationColor1', e.target.value)}
                                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-none shrink-0"
                                        />
                                        <span className="text-[10px] text-zinc-400">Color 1</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-zinc-800/30 p-2 rounded-lg border border-white/5">
                                        <input
                                            id="viz-color-2"
                                            type="color"
                                            name="viz-color-2"
                                            aria-label="Visualization Color 2"
                                            value={config.visualizationColor2 || '#6366f1'}
                                            onChange={(e) => handleChange('visualizationColor2', e.target.value)}
                                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-none shrink-0"
                                        />
                                        <span className="text-[10px] text-zinc-400">Color 2</span>
                                    </div>
                                </div>
                            )}

                            {/* Position */}
                            <div className="space-y-1.5">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Position</span>
                                <div className="grid grid-cols-4 gap-1">
                                    {([{ label: 'Bottom', value: 'bottom' }, { label: 'Top', value: 'top' }, { label: 'Center', value: 'center' }, { label: 'Full', value: 'full' }] as const).map(pos => (
                                        <button
                                            key={pos.value}
                                            onClick={() => handleChange('visualizationPosition', pos.value)}
                                            className={`px-2 py-1.5 rounded-md text-[10px] font-medium border transition-all ${(config.visualizationPosition || 'bottom') === pos.value
                                                ? 'bg-purple-600/40 border-purple-500/50 text-purple-200'
                                                : 'bg-zinc-800/50 border-white/5 text-zinc-400 hover:border-white/20'
                                                }`}
                                        >
                                            {pos.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Opacity Slider */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Opacity</span>
                                    <span className="text-[10px] text-zinc-400 font-mono">{((config.visualizationOpacity ?? 0.6) * 100).toFixed(0)}%</span>
                                </div>
                                <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5">
                                    <input
                                        type="range"
                                        name="viz-opacity"
                                        aria-label="Visualization Opacity"
                                        min="0.1"
                                        max="1.0"
                                        step="0.05"
                                        value={config.visualizationOpacity ?? 0.6}
                                        onChange={(e) => handleChange('visualizationOpacity', parseFloat(e.target.value))}
                                        className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Sensitivity Slider */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Sensitivity</span>
                                    <span className="text-[10px] text-zinc-400 font-mono">{(config.visualizationSensitivity ?? 1.5).toFixed(1)}x</span>
                                </div>
                                <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5">
                                    <input
                                        type="range"
                                        name="viz-sensitivity"
                                        aria-label="Visualization Sensitivity"
                                        min="0.5"
                                        max="3.0"
                                        step="0.1"
                                        value={config.visualizationSensitivity ?? 1.5}
                                        onChange={(e) => handleChange('visualizationSensitivity', parseFloat(e.target.value))}
                                        className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Bar Count Slider (for bar/circular types) */}
                            {(['bars', 'circular', 'pulse-ring'].includes(config.visualizationType || 'bars')) && (
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">
                                            {(['circular', 'pulse-ring'].includes(config.visualizationType || 'bars')) ? 'Segments' : 'Bar Count'}
                                        </span>
                                        <span className="text-[10px] text-zinc-400 font-mono">{config.visualizationBarCount ?? 48}</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5">
                                        <input
                                            type="range"
                                            name="viz-bar-count"
                                            aria-label="Visualization Bar Count"
                                            min="16"
                                            max="128"
                                            step="4"
                                            value={config.visualizationBarCount ?? 48}
                                            onChange={(e) => handleChange('visualizationBarCount', parseInt(e.target.value))}
                                            className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                        />
                                    </div>
                                </div>
                            )}


                        </div>
                    )}
                </section>

                {/* Lyric Display Mode */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <FileText size={14} /> Lyric Display Mode
                        </h3>
                        <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={config.randomizeLyricDisplayMode !== false}
                                onChange={(e) => handleChange('randomizeLyricDisplayMode', e.target.checked)}
                                className="w-3 h-3 rounded border-white/10 bg-zinc-800 text-purple-600 focus:ring-0 cursor-pointer"
                            />
                            <span>Random</span>
                        </label>
                    </div>
                    <GroupedSelection
                        value={config.lyricDisplayMode}
                        onChange={(val) => handleChange('lyricDisplayMode', val)}
                        groups={lyricDisplayGroups}
                    />
                </section>

                {/* Lyric Visibility */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <FileText size={14} /> Lyric Visibility
                    </h3>
                    <div className="flex bg-zinc-800 p-1 rounded-lg border border-white/5">
                        <button
                            onClick={() => handleChange('lyricVisibilityMode', 'default')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${(config.lyricVisibilityMode ?? 'default') === 'default'
                                ? 'bg-zinc-600 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                                }`}
                        >
                            Default
                        </button>
                        <button
                            onClick={() => handleChange('lyricVisibilityMode', 'auto')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${config.lyricVisibilityMode === 'auto'
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                                }`}
                        >
                            Auto
                        </button>
                    </div>
                    {config.lyricVisibilityMode === 'auto' && (
                        <p className="text-[10px] text-zinc-500 leading-relaxed px-1">
                            TTML/SRT: hides lyrics when the gap between line end and the next cue exceeds 3 seconds (short gaps keep the previous line). LRC/eLRC: estimates line duration from word timing or word count, then hides during long gaps; final line also hides near the end of long outros.
                        </p>
                    )}
                </section>

                {/* Highlight Effect */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles size={14} /> Highlight Effect
                        </h3>
                        <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={config.randomizeHighlightEffect !== false}
                                onChange={(e) => handleChange('randomizeHighlightEffect', e.target.checked)}
                                className="w-3 h-3 rounded border-white/10 bg-zinc-800 text-purple-600 focus:ring-0 cursor-pointer"
                            />
                            <span>Random</span>
                        </label>
                    </div>
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
                                        <span className="text-[10px] text-zinc-400 font-bold uppercase">Text/Glow Color</span>
                                        <div className="flex items-center gap-2 bg-zinc-800 p-1.5 rounded-lg border border-white/5">
                                            <input
                                                id="highlight-color"
                                                type="color"
                                                name="highlight-color"
                                                aria-label="Highlight Text Color"
                                                value={config.highlightColor || '#fb923c'}
                                                onChange={(e) => handleChange('highlightColor', e.target.value)}
                                                className="w-8 h-6 rounded cursor-pointer bg-transparent border-none shrink-0"
                                            />
                                            <input
                                                id="highlight-color-hex"
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
                                        <span className="text-[10px] text-zinc-400 font-bold uppercase">Back/Shape Color</span>
                                        <div className="flex items-center gap-2 bg-zinc-800 p-1.5 rounded-lg border border-white/5">
                                            <input
                                                id="highlight-bg-color"
                                                type="color"
                                                name="highlight-bg-color"
                                                aria-label="Highlight Background Color"
                                                value={config.highlightBackground || '#fb923c'}
                                                onChange={(e) => handleChange('highlightBackground', e.target.value)}
                                                className="w-8 h-6 rounded cursor-pointer bg-transparent border-none shrink-0"
                                            />
                                            <input
                                                id="highlight-bg-hex"
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
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <Layout size={14} /> Visible Elements
                        </h3>
                        <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={config.randomizeVisibleElements !== false}
                                onChange={(e) => handleChange('randomizeVisibleElements', e.target.checked)}
                                className="w-3 h-3 rounded border-white/10 bg-zinc-800 text-purple-600 focus:ring-0 cursor-pointer"
                            />
                            <span>Random</span>
                        </label>
                    </div>
                    <div className="space-y-2">
                        {[
                            { label: 'Lyrics / Subtitles', key: 'showLyrics' },
                            { label: 'Song Title', key: 'showTitle' },
                            { label: 'Artist Name', key: 'showArtist' },
                            { label: 'Cover Art', key: 'showCover' },
                            { label: 'Intro Info', key: 'showIntro' },
                        ].map((item) => (
                            <div key={item.key} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/30 border border-white/5 hover:bg-zinc-800/50 cursor-pointer transition-colors">
                                <label htmlFor={item.key} className="text-xs text-zinc-300 cursor-pointer w-full">{item.label}</label>
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        id={item.key}
                                        name={item.key}
                                        aria-label={item.label}
                                        checked={(config as any)[item.key]}
                                        onChange={(e) => handleChange(item.key as keyof RenderConfig, e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <label htmlFor={item.key} className="w-8 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600 block cursor-pointer"></label>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Intro Settings */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <Type size={14} /> Intro Settings
                        </h3>
                        <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={config.randomizeIntroSettings !== false}
                                onChange={(e) => handleChange('randomizeIntroSettings', e.target.checked)}
                                className="w-3 h-3 rounded border-white/10 bg-zinc-800 text-purple-600 focus:ring-0 cursor-pointer"
                            />
                            <span>Random</span>
                        </label>
                    </div>

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
                                <label htmlFor="intro-text" className="text-[10px] text-zinc-500 uppercase font-bold">Custom Intro Content</label>
                                <textarea
                                    id="intro-text"
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

                {/* Text Presets & Styling */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <Type size={14} /> Typography & Style
                        </h3>
                        <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={config.randomizeTypographyStyle !== false}
                                onChange={(e) => handleChange('randomizeTypographyStyle', e.target.checked)}
                                className="w-3 h-3 rounded border-white/10 bg-zinc-800 text-purple-600 focus:ring-0 cursor-pointer"
                            />
                            <span>Random</span>
                        </label>
                    </div>

                    <div className="space-y-4 pt-1">
                        <div className="space-y-1.5">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Alignment</span>
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
                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Vertical Position</span>
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
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Top Margin</span>
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
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Bottom Margin</span>
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
                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Style</span>
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
                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Apply Style To</span>
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
                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Text Case</span>
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
                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Font Family</span>
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
                            <label htmlFor="main-font-upload" className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Custom Font File</label>
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
                                <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Font Size</span>
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
                                <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Current Line Height</span>
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
                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Color</span>
                            <div className="flex items-center gap-3 bg-zinc-800/30 p-2 rounded-lg border border-white/5">
                                <input
                                    id="main-font-color"
                                    type="color"
                                    name="main-font-color"
                                    aria-label="Main Font Color"
                                    value={config.fontColor}
                                    onChange={(e) => handleChange('fontColor', e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-none shrink-0"
                                />
                                <input
                                    id="main-font-hex"
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
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Text Effect</span>
                                <label className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={config.randomizeTextEffect !== false}
                                        onChange={(e) => handleChange('randomizeTextEffect', e.target.checked)}
                                        className="w-3 h-3 rounded border-white/10 bg-zinc-800 text-purple-600 focus:ring-0 cursor-pointer"
                                    />
                                    <span>Random</span>
                                </label>
                            </div>
                            <GroupedSelection
                                value={config.textEffect}
                                onChange={(val) => handleChange('textEffect', val)}
                                groups={textEffectGroups}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Text Animation</span>
                                <label className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={config.randomizeTextAnimation !== false}
                                        onChange={(e) => handleChange('randomizeTextAnimation', e.target.checked)}
                                        className="w-3 h-3 rounded border-white/10 bg-zinc-800 text-purple-600 focus:ring-0 cursor-pointer"
                                    />
                                    <span>Random</span>
                                </label>
                            </div>
                            <GroupedSelection
                                value={config.textAnimation}
                                onChange={(val) => handleChange('textAnimation', val)}
                                groups={textAnimationGroups}
                            />
                        </div>

                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Transition</span>
                            <label className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={config.randomizeTransitionEffect !== false}
                                    onChange={(e) => handleChange('randomizeTransitionEffect', e.target.checked)}
                                    className="w-3 h-3 rounded border-white/10 bg-zinc-800 text-purple-600 focus:ring-0 cursor-pointer"
                                />
                                <span>Random</span>
                            </label>
                        </div>
                        <GroupedSelection
                            value={config.transitionEffect}
                            onChange={(val) => handleChange('transitionEffect', val)}
                            groups={transitionGroups}
                        />
                    </div>

                    {/* Visual Transition (New) */}
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Visual Transition (Images/Video)</span>
                            <div className="flex items-center gap-3">
                                {config.visualTransitionDuration && (
                                    <span className="text-[10px] text-zinc-400 font-mono">{config.visualTransitionDuration.toFixed(1)}s</span>
                                )}
                                <label className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={config.randomizeVisualTransition !== false}
                                        onChange={(e) => handleChange('randomizeVisualTransition', e.target.checked)}
                                        className="w-3 h-3 rounded border-white/10 bg-zinc-800 text-purple-600 focus:ring-0 cursor-pointer"
                                    />
                                    <span>Random</span>
                                </label>
                            </div>
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
                </section>

                {/* Song Info Design */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <Music size={14} /> Song Info Design
                        </h3>
                        <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={config.randomizeSongInfoDesign !== false}
                                onChange={(e) => handleChange('randomizeSongInfoDesign', e.target.checked)}
                                className="w-3 h-3 rounded border-white/10 bg-zinc-800 text-purple-600 focus:ring-0 cursor-pointer"
                            />
                            <span>Random</span>
                        </label>
                    </div>

                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Position</span>
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

                                {/* Middle Row */}
                                <button
                                    onClick={() => handleChange('infoPosition', 'left-middle')}
                                    className={`h-8 rounded-md border flex items-center justify-start p-1 transition-all ${config.infoPosition === 'left-middle' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`}
                                    title="Left Middle"
                                >
                                    <div className="w-2 h-2 bg-current rounded-sm" />
                                </button>
                                <button
                                    onClick={() => handleChange('infoPosition', 'center-middle')}
                                    className={`h-8 rounded-md border flex items-center justify-center p-1 transition-all ${config.infoPosition === 'center-middle' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`}
                                    title="Center Middle"
                                >
                                    <div className="w-2 h-2 bg-current rounded-sm" />
                                </button>
                                <button
                                    onClick={() => handleChange('infoPosition', 'right-middle')}
                                    className={`h-8 rounded-md border flex items-center justify-end p-1 transition-all ${config.infoPosition === 'right-middle' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`}
                                    title="Right Middle"
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
                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Style</span>
                            <GroupedSelection
                                value={config.infoStyle || 'classic'}
                                onChange={(val) => handleChange('infoStyle', val)}
                                groups={infoStyleGroups}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Edge Margin</span>
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
                                <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Info Size</span>
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
                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Font Family</span>
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
                                aria-label="Upload Info Font"
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
                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Font Style</span>
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
                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Text Color</span>
                            <div className="flex items-center gap-3 bg-zinc-800/30 p-2 rounded-lg border border-white/5">
                                <input
                                    id="info-font-color"
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

                {/* Channel Info / Watermark */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <ImageIcon size={14} /> Channel Info / Watermark
                        </h3>
                        <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={config.randomizeChannelInfo !== false}
                                onChange={(e) => handleChange('randomizeChannelInfo', e.target.checked)}
                                className="w-3 h-3 rounded border-white/10 bg-zinc-800 text-purple-600 focus:ring-0 cursor-pointer"
                            />
                            <span>Random</span>
                        </label>
                    </div>
                    <div className="bg-zinc-800/30 border border-white/5 rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between cursor-pointer">
                            <label htmlFor="show-channel-info" className="text-xs text-zinc-300 font-medium cursor-pointer">Show Channel Info</label>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    id="show-channel-info"
                                    name="show-channel-info"
                                    aria-label="Show Channel Info"
                                    checked={config.showChannelInfo ?? false}
                                    onChange={(e) => handleChange('showChannelInfo', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <label htmlFor="show-channel-info" className="w-8 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600 block cursor-pointer"></label>
                            </div>
                        </div>

                        {config.showChannelInfo && (
                            <div className="space-y-3 animate-in slide-in-from-top-1 fade-in duration-200 pt-2 border-t border-white/5">
                                {/* Image Upload */}
                                <div className="space-y-1.5">
                                    <label htmlFor="channel-image-upload" className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Channel Logo / Image</label>
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
                                    <label htmlFor="channel-info-text" className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Channel Name / SVG Code</label>
                                    <textarea
                                        id="channel-info-text"
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
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Position</span>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button onClick={() => handleChange('channelInfoPosition', 'top-left')} className={`h-8 rounded-md border flex items-start justify-start p-1 transition-all ${config.channelInfoPosition === 'top-left' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Top Left"><div className="w-2 h-2 bg-current rounded-sm" /></button>
                                        <button onClick={() => handleChange('channelInfoPosition', 'top-center')} className={`h-8 rounded-md border flex items-start justify-center p-1 transition-all ${config.channelInfoPosition === 'top-center' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Top Center"><div className="w-2 h-2 bg-current rounded-sm" /></button>
                                        <button onClick={() => handleChange('channelInfoPosition', 'top-right')} className={`h-8 rounded-md border flex items-start justify-end p-1 transition-all ${config.channelInfoPosition === 'top-right' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Top Right"><div className="w-2 h-2 bg-current rounded-sm" /></button>

                                        <button onClick={() => handleChange('channelInfoPosition', 'left-middle')} className={`h-8 rounded-md border flex items-center justify-start p-1 transition-all ${config.channelInfoPosition === 'left-middle' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Left Middle"><div className="w-2 h-2 bg-current rounded-sm" /></button>
                                        <button onClick={() => handleChange('channelInfoPosition', 'center-middle')} className={`h-8 rounded-md border flex items-center justify-center p-1 transition-all ${config.channelInfoPosition === 'center-middle' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Center Middle"><div className="w-2 h-2 bg-current rounded-sm" /></button>
                                        <button onClick={() => handleChange('channelInfoPosition', 'right-middle')} className={`h-8 rounded-md border flex items-center justify-end p-1 transition-all ${config.channelInfoPosition === 'right-middle' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Right Middle"><div className="w-2 h-2 bg-current rounded-sm" /></button>

                                        <button onClick={() => handleChange('channelInfoPosition', 'bottom-left')} className={`h-8 rounded-md border flex items-end justify-start p-1 transition-all ${config.channelInfoPosition === 'bottom-left' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Bottom Left"><div className="w-2 h-2 bg-current rounded-sm" /></button>
                                        <button onClick={() => handleChange('channelInfoPosition', 'bottom-center')} className={`h-8 rounded-md border flex items-end justify-center p-1 transition-all ${config.channelInfoPosition === 'bottom-center' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Bottom Center"><div className="w-2 h-2 bg-current rounded-sm" /></button>
                                        <button onClick={() => handleChange('channelInfoPosition', 'bottom-right')} className={`h-8 rounded-md border flex items-end justify-end p-1 transition-all ${config.channelInfoPosition === 'bottom-right' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Bottom Right"><div className="w-2 h-2 bg-current rounded-sm" /></button>
                                    </div>
                                </div>

                                {/* Style */}
                                <div className="space-y-1.5">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Style</span>
                                    <GroupedSelection
                                        value={config.channelInfoStyle || 'classic'}
                                        onChange={(val) => handleChange('channelInfoStyle', val)}
                                        groups={channelInfoStyleGroups}
                                    />
                                </div>

                                {/* Margin Scale */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Edge Margin</span>
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
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Size</span>
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
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Font Family</span>
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
                                        aria-label="Upload Channel Font"
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
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Font Style</span>
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
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Text Color</span>
                                    <div className="flex items-center gap-3 bg-zinc-800/30 p-2 rounded-lg border border-white/5">
                                        <input
                                            id="channel-font-color"
                                            type="color"
                                            name="channel-font-color"
                                            aria-label="Channel Font Color"
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

                {/* Additional Notes/Media */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <ImageIcon size={14} /> Floating Notes / Media
                        </h3>
                        <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={config.randomizeFloatingNotes !== false}
                                onChange={(e) => handleChange('randomizeFloatingNotes', e.target.checked)}
                                className="w-3 h-3 rounded border-white/10 bg-zinc-800 text-purple-600 focus:ring-0 cursor-pointer"
                            />
                            <span>Random</span>
                        </label>
                    </div>

                    <div className="bg-zinc-800/30 border border-white/5 rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between cursor-pointer">
                            <label htmlFor="show-floating-notes" className="text-xs text-zinc-300 font-medium cursor-pointer">Show Floating Notes</label>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    id="show-floating-notes"
                                    name="show-floating-notes"
                                    aria-label="Show Floating Notes"
                                    checked={config.showFloatingNotes ?? false}
                                    onChange={(e) => handleChange('showFloatingNotes', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <label htmlFor="show-floating-notes" className="w-8 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600 block cursor-pointer"></label>
                            </div>
                        </div>

                        {config.showFloatingNotes && (
                            <div className="space-y-3 animate-in slide-in-from-top-1 fade-in duration-200 pt-2 border-t border-white/5">
                                {/* Layout */}
                                <div className="space-y-1.5">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Layout</span>
                                    <GroupedSelection
                                        value={config.floatingNotesLayout || 'text-only'}
                                        onChange={(val) => handleChange('floatingNotesLayout', val)}
                                        groups={floatingNotesLayoutGroups}
                                    />
                                </div>

                                {/* Visibility Duration */}
                                <div className="space-y-1.5">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Visibility Duration</span>
                                    <GroupedSelection
                                        value={config.floatingNotesVisibilityMode ?? 'all'}
                                        onChange={(val) => handleChange('floatingNotesVisibilityMode', val)}
                                        groups={floatingNotesVisibilityGroups}
                                    />
                                </div>

                                {(config.floatingNotesVisibilityMode ?? 'all') === 'follow-lyrics' && (
                                    <p className="text-[10px] text-zinc-500 leading-relaxed px-1">
                                        Notes appear and hide together with lyrics, respecting Default or Auto lyric visibility mode and timestamps.
                                    </p>
                                )}

                                {(config.floatingNotesVisibilityMode ?? 'all') === 'from-start' && (
                                    <div className="space-y-1.5">
                                        <label htmlFor="floating-notes-from-start" className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Show For (seconds from start)</label>
                                        <input
                                            id="floating-notes-from-start"
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={config.floatingNotesFromStartDuration ?? 10}
                                            onChange={(e) => handleChange('floatingNotesFromStartDuration', Math.max(0, parseFloat(e.target.value) || 0))}
                                            className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>
                                )}

                                {(config.floatingNotesVisibilityMode ?? 'all') === 'from-end' && (
                                    <div className="space-y-1.5">
                                        <label htmlFor="floating-notes-from-end" className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Show For (seconds before audio ends)</label>
                                        <input
                                            id="floating-notes-from-end"
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={config.floatingNotesFromEndDuration ?? 10}
                                            onChange={(e) => handleChange('floatingNotesFromEndDuration', Math.max(0, parseFloat(e.target.value) || 0))}
                                            className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>
                                )}

                                {(config.floatingNotesVisibilityMode ?? 'all') === 'from-start-and-end' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label htmlFor="floating-notes-from-start-combined" className="text-[10px] text-zinc-500 font-bold uppercase ml-1">From Start (sec)</label>
                                            <input
                                                id="floating-notes-from-start-combined"
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={config.floatingNotesFromStartDuration ?? 10}
                                                onChange={(e) => handleChange('floatingNotesFromStartDuration', Math.max(0, parseFloat(e.target.value) || 0))}
                                                className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor="floating-notes-from-end-combined" className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Before End (sec)</label>
                                            <input
                                                id="floating-notes-from-end-combined"
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={config.floatingNotesFromEndDuration ?? 10}
                                                onChange={(e) => handleChange('floatingNotesFromEndDuration', Math.max(0, parseFloat(e.target.value) || 0))}
                                                className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                            />
                                        </div>
                                    </div>
                                )}

                                {(config.floatingNotesVisibilityMode ?? 'all') === 'specific' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label htmlFor="floating-notes-specific-start" className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Start</label>
                                            <input
                                                id="floating-notes-specific-start"
                                                type="text"
                                                placeholder="0:00.000"
                                                value={config.floatingNotesSpecificStart ?? '0:00'}
                                                onChange={(e) => handleChange('floatingNotesSpecificStart', e.target.value)}
                                                className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                                            />
                                            <p className="text-[10px] text-zinc-500 ml-1">(hh:mm:ss.xxx)</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor="floating-notes-specific-end" className="text-[10px] text-zinc-500 font-bold uppercase ml-1">End</label>
                                            <input
                                                id="floating-notes-specific-end"
                                                type="text"
                                                placeholder="0:30.000"
                                                value={config.floatingNotesSpecificEnd ?? '0:30'}
                                                onChange={(e) => handleChange('floatingNotesSpecificEnd', e.target.value)}
                                                className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                                            />
                                            <p className="text-[10px] text-zinc-500 ml-1">(hh:mm:ss.xxx)</p>
                                        </div>
                                    </div>
                                )}

                                {/* Media Upload */}
                                {config.floatingNotesLayout !== 'text-only' && (
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Upload Media (Image/Video)</span>
                                        <input
                                            ref={floatingNotesMediaInputRef}
                                            type="file"
                                            accept="image/*,video/*"
                                            onChange={handleFloatingNotesMediaUpload}
                                            className="hidden"
                                        />
                                        {config.floatingNotesMedia ? (
                                            <div className="flex items-center gap-3 bg-zinc-800 p-2 rounded-lg border border-white/10">
                                                <div className="w-10 h-10 rounded bg-zinc-700/50 flex items-center justify-center overflow-hidden border border-white/5">
                                                    {config.floatingNotesMediaType === 'video' ? (
                                                        <video src={config.floatingNotesMedia} className="w-full h-full object-cover" muted />
                                                    ) : (
                                                        <img src={config.floatingNotesMedia} alt="Notes Media" className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-zinc-300 truncate">Media Loaded</p>
                                                    <button
                                                        onClick={() => handleChange('floatingNotesMedia', undefined)}
                                                        className="text-[10px] text-red-400 hover:text-red-300"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => floatingNotesMediaInputRef.current?.click()}
                                                    className="p-1.5 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white"
                                                >
                                                    <Settings size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => floatingNotesMediaInputRef.current?.click()}
                                                className="w-full flex items-center justify-center gap-2 bg-zinc-800/50 border border-dashed border-white/10 hover:border-purple-500/50 rounded-lg px-3 py-3 text-zinc-400 hover:text-purple-300 transition-colors"
                                            >
                                                <Upload size={14} />
                                                <span className="text-xs">Upload Media</span>
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Text Input */}
                                {config.floatingNotesLayout !== 'media-only' && (
                                    <div className="space-y-1.5">
                                        <label htmlFor="floating-notes-text" className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Notes Text</label>
                                        <textarea
                                            id="floating-notes-text"
                                            value={config.floatingNotesText ?? ''}
                                            onChange={(e) => handleChange('floatingNotesText', e.target.value)}
                                            placeholder="Enter note details..."
                                            className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 min-h-[60px] resize-y"
                                            rows={3}
                                        />
                                    </div>
                                )}

                                {/* Position (3x3 grid selector) */}
                                <div className="space-y-1.5">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Position</span>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button onClick={() => handleChange('floatingNotesPosition', 'top-left')} className={`h-8 rounded-md border flex items-start justify-start p-1 transition-all ${config.floatingNotesPosition === 'top-left' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Top Left"><div className="w-2 h-2 bg-current rounded-sm" /></button>
                                        <button onClick={() => handleChange('floatingNotesPosition', 'top-center')} className={`h-8 rounded-md border flex items-start justify-center p-1 transition-all ${config.floatingNotesPosition === 'top-center' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Top Center"><div className="w-2 h-2 bg-current rounded-sm" /></button>
                                        <button onClick={() => handleChange('floatingNotesPosition', 'top-right')} className={`h-8 rounded-md border flex items-start justify-end p-1 transition-all ${config.floatingNotesPosition === 'top-right' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Top Right"><div className="w-2 h-2 bg-current rounded-sm" /></button>

                                        <button onClick={() => handleChange('floatingNotesPosition', 'left-middle')} className={`h-8 rounded-md border flex items-center justify-start p-1 transition-all ${config.floatingNotesPosition === 'left-middle' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Left Middle"><div className="w-2 h-2 bg-current rounded-sm" /></button>
                                        <button onClick={() => handleChange('floatingNotesPosition', 'center-middle')} className={`h-8 rounded-md border flex items-center justify-center p-1 transition-all ${config.floatingNotesPosition === 'center-middle' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Center Middle"><div className="w-2 h-2 bg-current rounded-sm" /></button>
                                        <button onClick={() => handleChange('floatingNotesPosition', 'right-middle')} className={`h-8 rounded-md border flex items-center justify-end p-1 transition-all ${config.floatingNotesPosition === 'right-middle' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Right Middle"><div className="w-2 h-2 bg-current rounded-sm" /></button>

                                        <button onClick={() => handleChange('floatingNotesPosition', 'bottom-left')} className={`h-8 rounded-md border flex items-end justify-start p-1 transition-all ${config.floatingNotesPosition === 'bottom-left' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Bottom Left"><div className="w-2 h-2 bg-current rounded-sm" /></button>
                                        <button onClick={() => handleChange('floatingNotesPosition', 'bottom-center')} className={`h-8 rounded-md border flex items-end justify-center p-1 transition-all ${config.floatingNotesPosition === 'bottom-center' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Bottom Center"><div className="w-2 h-2 bg-current rounded-sm" /></button>
                                        <button onClick={() => handleChange('floatingNotesPosition', 'bottom-right')} className={`h-8 rounded-md border flex items-end justify-end p-1 transition-all ${config.floatingNotesPosition === 'bottom-right' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20'}`} title="Bottom Right"><div className="w-2 h-2 bg-current rounded-sm" /></button>
                                    </div>
                                </div>

                                {/* Shape */}
                                <div className="space-y-1.5">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Shape Style</span>
                                    <GroupedSelection
                                        value={config.floatingNotesShape || 'rounded'}
                                        onChange={(val) => handleChange('floatingNotesShape', val)}
                                        groups={floatingNotesShapeGroups}
                                    />
                                </div>

                                {config.floatingNotesShape !== 'none' && (
                                    <>
                                        {/* Colors */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Fill Color</span>
                                                <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-md p-1">
                                                    <input
                                                        type="color"
                                                        value={config.floatingNotesFillColor || '#000000'}
                                                        onChange={(e) => handleChange('floatingNotesFillColor', e.target.value)}
                                                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"
                                                    />
                                                    <span className="text-[10px] text-zinc-400 font-mono uppercase">{config.floatingNotesFillColor || '#000000'}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Outline Color</span>
                                                <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-md p-1">
                                                    <input
                                                        type="color"
                                                        value={config.floatingNotesOutlineColor || '#ffffff'}
                                                        onChange={(e) => handleChange('floatingNotesOutlineColor', e.target.value)}
                                                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"
                                                    />
                                                    <span className="text-[10px] text-zinc-400 font-mono uppercase">{config.floatingNotesOutlineColor || '#ffffff'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Outline Size */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Outline Size</span>
                                                <span className="text-[10px] text-zinc-400 font-mono">{config.floatingNotesOutlineSize ?? 1}px</span>
                                            </div>
                                            <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5">
                                                <span className="text-zinc-500"><Maximize size={12} /></span>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="10"
                                                    step="1"
                                                    value={config.floatingNotesOutlineSize ?? 1}
                                                    onChange={(e) => handleChange('floatingNotesOutlineSize', parseInt(e.target.value, 10))}
                                                    className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Media & Text Size */}
                                {config.floatingNotesLayout !== 'text-only' && config.floatingNotesLayout !== 'media-only' && (
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Media Size</span>
                                            <span className="text-[10px] text-zinc-400 font-mono">{Math.round((config.floatingNotesMediaSizeScale ?? 0.4) * 100)}%</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5">
                                            <span className="text-zinc-500"><Maximize size={12} /></span>
                                            <input
                                                type="range"
                                                min="0.1"
                                                max="0.9"
                                                step="0.05"
                                                value={config.floatingNotesMediaSizeScale ?? 0.4}
                                                onChange={(e) => handleChange('floatingNotesMediaSizeScale', parseFloat(e.target.value))}
                                                className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                            />
                                        </div>
                                    </div>
                                )}

                                {config.floatingNotesLayout !== 'media-only' && (
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Text Size</span>
                                            <span className="text-[10px] text-zinc-400 font-mono">{(config.floatingNotesFontSizeScale ?? 1.0).toFixed(1)}x</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5">
                                            <span className="text-zinc-500"><Type size={12} /></span>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="3.0"
                                                step="0.1"
                                                value={config.floatingNotesFontSizeScale ?? 1.0}
                                                onChange={(e) => handleChange('floatingNotesFontSizeScale', parseFloat(e.target.value))}
                                                className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Opacity */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Opacity</span>
                                        <span className="text-[10px] text-zinc-400 font-mono">{Math.round((config.floatingNotesOpacity ?? 0.8) * 100)}%</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5">
                                        <span className="text-zinc-500"><Sliders size={12} /></span>
                                        <input
                                            type="range"
                                            min="0.0"
                                            max="1.0"
                                            step="0.05"
                                            value={config.floatingNotesOpacity ?? 0.8}
                                            onChange={(e) => handleChange('floatingNotesOpacity', parseFloat(e.target.value))}
                                            className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Margin Scale */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Edge Margin</span>
                                        <span className="text-[10px] text-zinc-400 font-mono">{(config.floatingNotesMarginScale ?? 1.0).toFixed(1)}x</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5">
                                        <span className="text-zinc-500"><Maximize size={12} /></span>
                                        <input
                                            type="range"
                                            min="0.0"
                                            max="5.0"
                                            step="0.1"
                                            value={config.floatingNotesMarginScale ?? 1.0}
                                            onChange={(e) => handleChange('floatingNotesMarginScale', parseFloat(e.target.value))}
                                            className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Width & Height */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Width</span>
                                            <span className="text-[10px] text-zinc-400 font-mono">{config.floatingNotesWidth ?? 300}px</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5">
                                            <input
                                                type="range"
                                                min="100"
                                                max="800"
                                                step="10"
                                                value={config.floatingNotesWidth ?? 300}
                                                onChange={(e) => handleChange('floatingNotesWidth', parseInt(e.target.value))}
                                                className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Height</span>
                                            <span className="text-[10px] text-zinc-400 font-mono">{config.floatingNotesHeight ?? 150}px</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5">
                                            <input
                                                type="range"
                                                min="50"
                                                max="600"
                                                step="10"
                                                value={config.floatingNotesHeight ?? 150}
                                                onChange={(e) => handleChange('floatingNotesHeight', parseInt(e.target.value))}
                                                className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-purple-400 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Font */}
                                <div className="space-y-1.5">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Font Family</span>
                                    <FontSelector
                                        value={config.floatingNotesFontFamily || 'sans-serif'}
                                        onChange={(val) => handleChange('floatingNotesFontFamily', val)}
                                        customFontName={null}
                                        groups={dynamicFontGroups}
                                    />
                                    <GoogleFontLoader
                                        onApply={(name) => handleGoogleFontApply(name, 'floatingNotesFontFamily')}
                                        placeholder="Notes Font (e.g. Roboto)"
                                    />
                                </div>

                                {/* Text Align */}
                                <div className="space-y-1.5">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Text Align</span>
                                    <div className="flex bg-zinc-800 rounded-lg p-1">
                                        {(['left', 'center', 'right'] as const).map((align) => (
                                            <button
                                                key={align}
                                                onClick={() => handleChange('floatingNotesTextAlign', align)}
                                                className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${config.floatingNotesTextAlign === align ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                {align}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Font Style */}
                                <div className="space-y-1.5">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Font Style</span>
                                    <div className="flex bg-zinc-800 rounded-lg p-1 gap-1">
                                        <button
                                            onClick={() => handleChange('floatingNotesFontWeight', config.floatingNotesFontWeight === 'bold' ? 'normal' : 'bold')}
                                            className={`flex-1 py-1.5 rounded-md flex items-center justify-center transition-all ${config.floatingNotesFontWeight === 'bold' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            title="Bold"
                                        >
                                            <Bold size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleChange('floatingNotesFontStyle', config.floatingNotesFontStyle === 'italic' ? 'normal' : 'italic')}
                                            className={`flex-1 py-1.5 rounded-md flex items-center justify-center transition-all ${config.floatingNotesFontStyle === 'italic' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            title="Italic"
                                        >
                                            <Italic size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Font Color */}
                                <div className="space-y-1.5">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Text Color</span>
                                    <div className="flex items-center gap-3 bg-zinc-800/30 p-2 rounded-lg border border-white/5">
                                        <input
                                            type="color"
                                            value={config.floatingNotesFontColor || '#ffffff'}
                                            onChange={(e) => handleChange('floatingNotesFontColor', e.target.value)}
                                            className="w-6 h-6 rounded cursor-pointer bg-transparent border-none shrink-0"
                                        />
                                        <span className="text-[10px] text-zinc-400 font-mono uppercase">{config.floatingNotesFontColor || '#ffffff'}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <section className="space-y-3">
                    {/* Output Settings (New) */}
                    <div className="pt-2 border-t border-white/5 space-y-3">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <Video size={14} /> Output Settings
                        </h3>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Resolution</span>
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
                                <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">FPS</span>
                                <GroupedSelection
                                    value={String(renderFps)}
                                    onChange={(val) => setRenderFps(parseInt(val))}
                                    groups={fpsGroups}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Aspect Ratio</span>
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
                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Render Engine</span>
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
                                    WebCodecs
                                </button>
                                <button
                                    onClick={() => setRenderEngine('ffmpeg')}
                                    className={`flex-1 py-2 rounded-md text-[10px] font-bold uppercase transition-all ${renderEngine === 'ffmpeg' ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Uses FFmpeg WASM. Frame-by-frame rendering with professional codecs."
                                >
                                    FFmpeg
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
                                <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Video Codec</span>
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
                                <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">FFmpeg Codec</span>
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
                                <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Video Codec</span>
                                <div className="p-2 bg-zinc-800/50 rounded border border-white/5 text-[10px] text-zinc-400">
                                    H.264 / AAC (Hardware Accelerated)
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">Render Quality (Bitrate)</span>
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

                    <div className="pt-2 border-t border-white/5">
                        <p className="text-[10px] text-zinc-500 italic leading-relaxed">
                            <span className="text-purple-400 font-bold">*Tip:</span> You can backup your current configuration using the <span className="text-zinc-300">Export</span> button above.
                        </p>
                    </div>
                </section>

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
