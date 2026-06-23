import { RenderConfig } from '../types';
import {
    textEffectGroups,
    textAnimationGroups,
    transitionGroups,
    highlightEffectGroups,
    deriveHighlightColors,
    lyricDisplayGroups,
    textCaseOptions,
    infoStyleGroups,
    channelInfoStyleGroups,
    fullFontGroups,
} from '../components/RenderSettings';

/**
 * Generates a randomized RenderConfig based on the current config's randomize toggle flags.
 * Returns a new config object — does NOT mutate the input.
 */
export function generateRandomRenderConfig(config: RenderConfig): RenderConfig {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const allValues = (groups: { options: { value: string }[] }[]): string[] =>
        groups.flatMap(g => g.options.map(o => o.value));
    const randFloat = (min: number, max: number, decimals = 2) =>
        Number((min + Math.random() * (max - min)).toFixed(decimals));
    const randColor = () => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    const directions = ['to right', 'to left', 'to bottom', 'to top', 'to bottom right', 'to bottom left', 'to top right', 'to top left'];
    const randGradient = () => `linear-gradient(${pick(directions)}, ${randColor()}, ${randColor()}, ${randColor()})`;

    const textEffects = allValues(textEffectGroups).filter(v => v !== 'preset');
    const textAnimations = allValues(textAnimationGroups);
    const transitions = allValues(transitionGroups);
    const highlights = allValues(highlightEffectGroups);
    const bgSources = ['custom', 'color', 'gradient', 'smart-gradient'];
    const displayModes = allValues(lyricDisplayGroups).filter(v => !v.startsWith('static-'));
    const infoStyles = allValues(infoStyleGroups);
    const channelStyles = allValues(channelInfoStyleGroups);
    const textCases: string[] = [...textCaseOptions];
    const positions: ('top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center')[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center'];
    const contentPositions: ('top' | 'center' | 'bottom')[] = ['top', 'center', 'bottom'];
    const textAligns: ('left' | 'center' | 'right')[] = ['left', 'center', 'right'];
    const vizTypes = ['bars', 'wave', 'circular', 'particles', 'pulse-ring', 'waveform', 'spectrogram', 'spectrum', 'stereo-field'];
    const vizColorModes = ['accent', 'gradient', 'custom', 'rainbow'];
    const vizPositions = ['bottom', 'top', 'full', 'center'];

    const fontValues = fullFontGroups.flatMap(g => g.options.map(o => o.value));

    const randomHighlight = pick(highlights);
    const derivedColors = deriveHighlightColors(randomHighlight);
    const highlightColor = derivedColors?.color ?? randColor();
    const highlightBg = derivedColors?.bg ?? randColor();

    const randomBgSource = pick(bgSources);
    const randomBool = () => Math.random() > 0.5;

    const randomConfig: RenderConfig = { ...config };

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
        randomConfig.showChannelInfo = Math.random() > 0.7;
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
        randomConfig.showFloatingNotes = Math.random() > 0.7;
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
        randomConfig.showVisualization = Math.random() > 0.6;
        randomConfig.visualizationType = pick(vizTypes) as RenderConfig['visualizationType'];
        randomConfig.visualizationColorMode = pick(vizColorModes) as RenderConfig['visualizationColorMode'];
        randomConfig.visualizationColor1 = randColor();
        randomConfig.visualizationColor2 = randColor();
        randomConfig.visualizationOpacity = randFloat(0.3, 1.0);
        randomConfig.visualizationPosition = pick(vizPositions) as RenderConfig['visualizationPosition'];
        randomConfig.visualizationSensitivity = randFloat(0.5, 3.0);
        randomConfig.visualizationBarCount = Math.floor(16 + Math.random() * 112);
    }
    // Keep render mode unchanged
    randomConfig.renderMode = config.renderMode;
    // Intro
    randomConfig.introText = config.introText;
    randomConfig.introMode = config.introMode;

    return randomConfig;
}
