
export interface LyricLine {
  time: number; // in seconds
  text: string;
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
  | 'slideshow'
  | 'just_video';