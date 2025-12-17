export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface VisualSlide {
  id: string;
  type: 'image' | 'video';
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