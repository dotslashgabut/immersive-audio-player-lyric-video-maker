import { LyricLine } from '../types';

export const parseTimestamp = (timeStr: string): number => {
  if (!timeStr) return 0;

  // Clean string to allow flexible parsing (e.g. comma or dot for decimals)
  const clean = timeStr.replace(',', '.').trim();
  const parts = clean.split(':');

  let seconds = 0;

  if (parts.length === 3) {
    // HH:MM:SS.mmm
    seconds += parseInt(parts[0], 10) * 3600;
    seconds += parseInt(parts[1], 10) * 60;
    seconds += parseFloat(parts[2]);
  } else if (parts.length === 2) {
    // MM:SS.mmm
    seconds += parseInt(parts[0], 10) * 60;
    seconds += parseFloat(parts[1]);
  } else if (parts.length === 1) {
    seconds += parseFloat(parts[0]);
  }

  return isNaN(seconds) ? 0 : seconds;
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const parseLRC = (lrcContent: string): LyricLine[] => {
  const lines = lrcContent.split('\n');
  const lyrics: LyricLine[] = [];
  // Regex to match all timestamps in a line e.g. [00:01.23]
  const timeRegex = /\[(\d{2}):(\d{2})(\.(\d{2,3}))?\]/g;

  lines.forEach((line) => {
    // Find all timestamps
    const matches = [...line.matchAll(timeRegex)];

    if (matches.length > 0) {
      // Extract text: remove all timestamps from the line
      let text = line.replace(timeRegex, '').trim();

      // Handle literal line breaks "\n"
      text = text.replace(/\\n/g, '\n');

      matches.forEach(match => {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const msStr = match[4];

        // Calculate total time in seconds
        let time = minutes * 60 + seconds;

        if (msStr) {
          if (msStr.length === 2) {
            time += parseInt(msStr, 10) / 100;
          } else if (msStr.length === 3) {
            time += parseInt(msStr, 10) / 1000;
          } else {
            // Fallback
            time += parseInt(msStr, 10) / 1000;
          }
        }

        lyrics.push({ time, text });
      });
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

  const parseTime = (timeStr: string): number | null => {
    const match = timeStr.match(timeRegex);
    if (match) {
      const hrs = parseInt(match[1], 10);
      const mins = parseInt(match[2], 10);
      const secs = parseInt(match[3], 10);
      const ms = parseInt(match[4], 10);
      return (hrs * 3600) + (mins * 60) + secs + (ms / 1000);
    }
    return null;
  };

  blocks.forEach(block => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      // Line 1 is index (skip)
      // Line 2 is time range
      const timeLine = lines[1];
      const textLines = lines.slice(2);
      const text = textLines.join(' ').trim();

      const times = timeLine.split(' --> ');
      if (times.length >= 2) {
        const startTime = parseTime(times[0]);
        const endTime = parseTime(times[1]);

        if (startTime !== null && text) {
          lyrics.push({
            time: startTime,
            text,
            endTime: endTime !== null ? endTime : undefined
          });
        }
      }
    }
  });

  return lyrics;
};