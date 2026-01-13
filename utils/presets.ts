import { RenderConfig, VideoPreset } from "../types";

export const videoPresetGroups: { label: string; options: { label: string; value: VideoPreset }[] }[] = [
    {
        label: "Basic",
        options: [
            { label: "Default", value: "default" },
            { label: "Custom", value: "custom" }
        ]
    },
    {
        label: "Typography",
        options: [
            { label: "Large Text", value: "large" },
            { label: "Large Uppercase", value: "large_upper" },
            { label: "Big Center", value: "big_center" },
            { label: "Classic Serif", value: "classic" },
            { label: "Monospace", value: "monospace" }
        ]
    },
    {
        label: "Thematic",
        options: [
            { label: "Heavy Metal", value: "metal" },
            { label: "Kids Fun", value: "kids" },
            { label: "Melancholy", value: "sad" },
            { label: "Romantic", value: "romantic" },
            { label: "Tech / Sci-Fi", value: "tech" },
            { label: "Gothic", value: "gothic" }
        ]
    },
    {
        label: "Layout & Minimal",
        options: [
            { label: "Slideshow (Small)", value: "slideshow" },
            { label: "Subtitle Mode", value: "subtitle" },
            { label: "Video Only", value: "just_video" }
        ]
    },
    {
        label: "Debug",
        options: [
            { label: "Testing", value: "testing" },
            { label: "Testing Up", value: "testing_up" }
        ]
    }
];

export const PRESET_DEFINITIONS: Partial<Record<VideoPreset, Partial<RenderConfig>>> = {
    'default': { fontSizeScale: 1.0, fontFamily: 'sans-serif', textCase: 'none', textAlign: 'center' },
    'large': { fontSizeScale: 1.8, fontFamily: 'sans-serif' },
    'classic': { fontSizeScale: 1.0, fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' },
    'large_upper': { fontSizeScale: 1.6, textCase: 'upper' },
    'monospace': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' },
    'big_center': { fontSizeScale: 1.6, textCase: 'upper', textAlign: 'center', contentPosition: 'center' },
    'metal': { fontFamily: '"Metal Mania", cursive', fontSizeScale: 1.6, textCase: 'upper' },
    'kids': { fontFamily: '"Fredoka One", cursive', fontSizeScale: 1.6, textCase: 'upper' },
    'sad': { fontFamily: '"Shadows Into Light", cursive', fontSizeScale: 1.2 },
    'romantic': { fontFamily: '"Dancing Script", cursive', fontSizeScale: 1.2 },
    'tech': { fontFamily: '"Orbitron", sans-serif', fontSizeScale: 1.6, textCase: 'upper' },
    'gothic': { fontFamily: '"UnifrakturMaguntia", cursive', fontSizeScale: 1.2 },
    'slideshow': { fontSizeScale: 0.6 },
    'just_video': {},
    'subtitle': { fontSizeScale: 0.6, contentPosition: 'bottom' },
    'testing': { fontSizeScale: 1.6 },
    'testing_up': { fontSizeScale: 1.6, textCase: 'upper' },
};

// Flattened list for cycling logic
export const PRESET_CYCLE_LIST: VideoPreset[] = videoPresetGroups.flatMap(g => g.options.map(o => o.value));
