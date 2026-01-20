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
    'default': { fontSizeScale: 1.0, fontFamily: 'ui-sans-serif, system-ui, sans-serif', textCase: 'none', textAlign: 'center', fontColor: '#ffffff' },
    'large': { fontSizeScale: 1.8, fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontColor: '#ffffff', fontWeight: 'bold' }, // font-black (approx)
    'classic': { fontSizeScale: 1.0, fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif', fontColor: '#fef3c7', fontStyle: 'italic', fontWeight: 'bold' },
    'large_upper': { fontSizeScale: 1.6, fontFamily: 'ui-sans-serif, system-ui, sans-serif', textCase: 'upper', fontColor: '#ffffff', fontWeight: 'bold' },
    'monospace': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontColor: '#ffffff', fontWeight: 'bold' },
    'big_center': { fontSizeScale: 1.6, fontFamily: 'ui-sans-serif, system-ui, sans-serif', textCase: 'upper', textAlign: 'center', contentPosition: 'center', fontColor: '#ffffff', fontWeight: 'bold' },
    'metal': { fontFamily: '"Metal Mania", cursive', fontSizeScale: 1.6, textCase: 'upper', fontColor: '#ffffff' },
    'kids': { fontFamily: '"Fredoka One", cursive', fontSizeScale: 1.6, textCase: 'upper', fontColor: '#ffffff' },
    'sad': { fontFamily: '"Shadows Into Light", cursive', fontSizeScale: 1.2, fontColor: '#e4e4e7' },
    'romantic': { fontFamily: '"Dancing Script", cursive', fontSizeScale: 1.2, fontColor: '#fce7f3', fontStyle: 'italic' },
    'tech': { fontFamily: '"Orbitron", sans-serif', fontSizeScale: 1.6, textCase: 'upper', fontColor: '#ecfeff', fontWeight: 'bold' },
    'gothic': { fontFamily: '"UnifrakturMaguntia", cursive', fontSizeScale: 1.2, fontColor: '#d4d4d8' }, // zinc-300
    'slideshow': { fontSizeScale: 0.6, fontColor: '#ffffff' },
    'just_video': {},
    'subtitle': { fontSizeScale: 0.6, contentPosition: 'bottom', fontColor: '#ffffff' },
    'testing': { fontSizeScale: 1.6 },
    'testing_up': { fontSizeScale: 1.6, textCase: 'upper' },
};

// Flattened list for cycling logic
export const PRESET_CYCLE_LIST: VideoPreset[] = videoPresetGroups.flatMap(g => g.options.map(o => o.value));
