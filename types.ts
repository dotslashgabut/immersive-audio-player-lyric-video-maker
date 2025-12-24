
export interface LyricLine {
  time: number; // in seconds
  text: string;
  endTime?: number; // Optional end time in seconds
}

export interface VisualSlide {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string; // Object URL for blob
  startTime: number; // in seconds
  endTime: number; // in seconds
  name: string;
  mediaDuration?: number; // Duration of the video media itself
  isMuted?: boolean;
  volume?: number; // 0 to 1
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
  backgroundSource: 'timeline' | 'custom' | 'color' | 'gradient' | 'smart-gradient';
  backgroundColor: string;
  backgroundGradient: string;
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
  textDecoration: 'none' | 'underline' | 'line-through';
  showTitle: boolean;
  showArtist: boolean;
  showCover: boolean;
  showIntro: boolean;
  showLyrics: boolean;
  infoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  infoStyle?: 'classic' | 'modern' | 'box' | 'minimal' | 'modern_art' | 'circle_art';
  infoMarginScale?: number;
  backgroundBlurStrength: number; // 0 = sharp, >0 = blur px (default 0 or 12)
  introMode: 'auto' | 'manual';
  introText: string;
}