export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface VisualSlide {
  id: string;
  url: string; // Object URL for blob
  startTime: number; // in seconds
  endTime: number; // in seconds
  name: string;
}

export interface AudioMetadata {
  title: string;
  artist: string;
  coverUrl: string | null;
}

export enum TabView {
  PLAYER = 'PLAYER',
  EDITOR = 'EDITOR',
}