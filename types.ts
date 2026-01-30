
export interface LyricWord {
  text: string;
  startTime: number;
  endTime: number;
}

export interface LyricLine {
  time: number; // in seconds
  text: string;
  endTime?: number; // Optional end time in seconds
  words?: LyricWord[];
}

export interface TranscriptionSegment {
  startTime: string; // HH:MM:SS.mmm
  endTime: string;   // HH:MM:SS.mmm
  text: string;
  words?: {
    text: string;
    startTime: string;
    endTime: string;
  }[];
}

export interface VisualSlide {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string; // Object URL for blob
  startTime: number; // in seconds
  endTime: number; // in seconds
  name: string;
  mediaDuration?: number; // Duration of the video media itself
  mediaStartOffset?: number; // Offset in seconds where media playback should start
  isMuted?: boolean;
  volume?: number; // 0 to 1
  layer?: number; // 0 or 1
  playbackRate?: number; // 0.1 to 4, default 1
}

export interface AudioMetadata {
  title: string;
  artist: string;
  album?: string;
  coverUrl: string | null;
  backgroundType?: 'image' | 'video';
}

export enum TabView {
  PLAYER = 'PLAYER',
  EDITOR = 'EDITOR',
}

export type VideoPreset =
  | 'default'
  | 'large'
  | 'classic'
  | 'large_upper'
  | 'monospace'
  | 'big_center'
  | 'metal'
  | 'kids'
  | 'sad'
  | 'romantic'
  | 'tech'
  | 'gothic'
  | 'testing'
  | 'testing_up'
  | 'one_line'
  | 'one_line_up'
  | 'slideshow'
  | 'just_video'
  | 'subtitle'
  | 'none'
  | 'custom';

export interface PlaylistItem {
  id: string;
  audioFile: File;
  lyricFile?: File; // Optional
  parsedLyrics?: LyricLine[]; // Parsed content for persistence
  metadata: AudioMetadata; // Extracted or fallback
  duration?: number; // In seconds, might be unknown until loaded
}

export interface RenderConfig {
  backgroundSource: 'timeline' | 'custom' | 'color' | 'gradient' | 'smart-gradient' | 'image';
  backgroundColor: string;
  backgroundGradient: string;
  backgroundImage?: string;
  renderMode: 'current' | 'playlist';
  textAlign: 'left' | 'center' | 'right';
  contentPosition: 'top' | 'center' | 'bottom';
  fontFamily: string;
  fontSizeScale: number;
  fontColor: string;
  textEffect: 'preset' | 'none' | 'glow' | 'shadow' | 'outline' | 'neon' | '3d' | 'vhs' | 'glass' | 'gradient' | 'fire' | 'emboss' | 'mirror' | 'retro' | 'cyberpunk' | 'hologram' | 'chrome' | 'neon-multi' | 'frozen' | 'gold' | 'comic' | 'glitch-text' | 'rainbow';
  textAnimation: 'none' | 'bounce' | 'pulse' | 'wave' | 'glitch' | 'shake' | 'typewriter' | 'wobble' | 'breathe' | 'rotate' | 'sway' | 'flicker' | 'jello' | 'heartbeat' | 'float' | 'swing' | 'rubberband' | 'flash' | 'tada' | 'spin';
  transitionEffect: 'none' | 'fade' | 'slide' | 'zoom' | 'blur' | 'float' | 'drop' | 'flip' | 'bounce' | 'spiral' | 'shatter' | 'elastic' | 'swing' | 'roll' | 'lightspeed' | 'rotate-in' | 'scale-rotate' | 'typewriter';
  lyricDisplayMode: 'all' | 'previous-next' | 'next-only' | 'active-only';
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  lyricStyleTarget: 'active-only' | 'all';
  textDecoration: 'none' | 'underline' | 'line-through';
  showTitle: boolean;
  showArtist: boolean;
  showCover: boolean;
  showIntro: boolean;
  showLyrics: boolean;
  infoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  infoStyle?: 'classic' | 'modern' | 'box' | 'minimal' | 'modern_art' | 'circle_art';
  infoMarginScale?: number;
  infoSizeScale?: number;
  backgroundBlurStrength: number; // 0 = sharp, >0 = blur px (default 0 or 12)
  introMode: 'auto' | 'manual';
  introText: string;
  textCase: 'none' | 'upper' | 'lower' | 'title' | 'sentence' | 'invert';
  layerVisibility?: {
    visual: Record<number, boolean>;
    audio: Record<number, boolean>;
  };
  highlightEffect?: 'none' | 'karaoke' | 'scale' | 'color' | 'glow' | 'background' | 'karaoke-neon' | 'karaoke-scale' | 'karaoke-underline' | 'karaoke-bounce' | 'karaoke-fill' | 'karaoke-outline' | 'karaoke-shadow' | 'karaoke-gradient' | 'karaoke-wave' | 'karaoke-blue' | 'karaoke-purple' | 'karaoke-green' | 'karaoke-pink' | 'karaoke-cyan' | 'karaoke-pill' | 'karaoke-box' | 'karaoke-rounded' | 'karaoke-glow-blue' | 'karaoke-glow-pink' | 'karaoke-glass' | 'karaoke-neon-multi' | 'karaoke-soft-glow' | 'karaoke-3d' | 'karaoke-emboss' | 'karaoke-chrome' | 'karaoke-gold' | 'karaoke-fire' | 'karaoke-frozen' | 'karaoke-rainbow' | 'karaoke-mirror' | 'karaoke-vhs' | 'karaoke-retro' | 'karaoke-cyberpunk' | 'karaoke-hologram' | 'karaoke-comic' | 'karaoke-glitch-text' | 'karaoke-pulse' | 'karaoke-breathe' | 'karaoke-float' | 'karaoke-sway' | 'karaoke-flicker' | 'karaoke-shake' | 'karaoke-wobble' | 'karaoke-jello' | 'karaoke-rubberband' | 'karaoke-heartbeat' | 'karaoke-flash' | 'karaoke-tada' | 'karaoke-swing' | 'karaoke-rotate' | 'karaoke-spin' | 'karaoke-glitch' | 'karaoke-typewriter' | 'karaoke-fade' | 'karaoke-shatter' | 'karaoke-blur' | 'karaoke-slide' | 'karaoke-smooth' | 'karaoke-smooth-white' | 'karaoke-smooth-plus';
  highlightColor?: string;
  highlightBackground?: string;
  useCustomHighlightColors?: boolean;

  // Channel Info / Watermark
  showChannelInfo?: boolean;
  channelInfoImage?: string; // DataURL or Object URL
  channelInfoText?: string;
  channelInfoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  channelInfoStyle?: 'classic' | 'modern' | 'minimal' | 'logo' | 'box' | 'circle';
  channelInfoSizeScale?: number;
  channelInfoMarginScale?: number;
  channelInfoFontFamily?: string;
  channelInfoFontColor?: string;
  channelInfoFontWeight?: 'normal' | 'bold';
  channelInfoFontStyle?: 'normal' | 'italic';

  // Song Info specific overrides
  infoFontFamily?: string;
  infoFontColor?: string;
  infoFontWeight?: 'normal' | 'bold';
  infoFontStyle?: 'normal' | 'italic';

  lyricLineHeight?: number;
  visualTransitionType?: 'none' | 'crossfade' | 'fade-to-black';
  visualTransitionDuration?: number; // Seconds (default 1.0)
  enableGradientOverlay?: boolean;
  useRealColorMedia?: boolean;
}

// Render Engine: MediaRecorder (realtime) vs FFmpeg (frame-by-frame)
export type RenderEngine = 'mediarecorder' | 'ffmpeg';

// FFmpeg-specific codec options
export type FFmpegCodec = 'h264' | 'h265';