import { LyricLine } from '../types';

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const parseLRC = (lrcContent: string): LyricLine[] => {
  const lines = lrcContent.split('\n');
  const lyrics: LyricLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

  lines.forEach((line) => {
    const match = line.match(regex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3], 10);
      const text = match[4].trim();
      
      // Calculate total time in seconds
      const time = minutes * 60 + seconds + milliseconds / 1000;
      
      if (text) {
        lyrics.push({ time, text });
      }
    }
  });

  return lyrics.sort((a, b) => a.time - b.time);
};

export const parseSRT = (srtContent: string): LyricLine[] => {
  // Normalize line endings
  const content = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = content.split('\n\n');
  const lyrics: LyricLine[] = [];
  
  // 00:00:20,000 --> 00:00:24,400
  const timeRegex = /(\d{2}):(\d{2}):(\d{2}),(\d{3})/;

  blocks.forEach(block => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      // Line 1 is index (skip)
      // Line 2 is time range
      const timeLine = lines[1];
      const textLines = lines.slice(2);
      const text = textLines.join(' ').trim();

      const times = timeLine.split(' --> ');
      if (times.length > 0) {
          const match = times[0].match(timeRegex);
          if (match) {
             const hrs = parseInt(match[1], 10);
             const mins = parseInt(match[2], 10);
             const secs = parseInt(match[3], 10);
             const ms = parseInt(match[4], 10);
             const totalSeconds = (hrs * 3600) + (mins * 60) + secs + (ms / 1000);
             
             if (text) {
                lyrics.push({ time: totalSeconds, text });
             }
          }
      }
    }
  });

  return lyrics;
};