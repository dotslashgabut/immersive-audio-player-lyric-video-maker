import { LyricLine } from '../types';

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
        // Match[4] is milliseconds part without dot, match[3] is dot+ms
        // If match[4] exists use it, else 0
        // The regex group indices: 1=mm, 2=ss, 3=.xxx, 4=xxx
        const msStr = match[4];
        const milliseconds = msStr ? parseInt(msStr, 10) : 0;

        // Calculate total time in seconds
        // If 2 digits ms (e.g. .50), it is 500ms? No, typically parsed as hundredths.
        // Standard LRC: .xx is hundredths. .xxx is thousandths.
        // utils code previously did: parseInt(match[3], 10) / 1000. 
        // If it was .23 (match[3]=23), parseInt is 23. 23/1000 = 0.023. That's WRONG.
        // It should be 230ms usually if it's 2 digits.
        // Let's stick to simple parsing: if 2 digits, usually frames or hundredths.
        // Previous code: `(\d{2,3})` -> `milliseconds / 1000`.
        // If string is "23", num is 23. 23/1000 = 0.023s. 
        // [00:01.23] usually means 1s 230ms. 
        // If I use the previous logic, I should preserve it or fix it. 
        // Let's fix it to be more robust.

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