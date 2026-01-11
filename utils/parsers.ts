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

export const parseTTML = (ttmlContent: string): LyricLine[] => {
  const lyrics: LyricLine[] = [];
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(ttmlContent, 'text/xml');

    // Robust way to find all <p> tags ignoring usage of namespace prefixes (e.g. tt:p or p)
    const allElements = Array.from(xmlDoc.getElementsByTagName('*'));
    const ps = allElements.filter(el => el.localName === 'p');

    // Helper to get time in seconds from TTML format
    const getTime = (t: string | null): number | undefined => {
      if (!t) return undefined;
      const val = t.trim();

      // Handle unit suffixes
      if (val.endsWith('ms')) {
        return parseFloat(val.slice(0, -2)) / 1000;
      }
      if (val.endsWith('s')) {
        return parseFloat(val.slice(0, -1));
      }

      // Standard timestamp parsing
      return parseTimestamp(val);
    };

    // Helper to get attribute ignoring namespace
    const getAttr = (el: Element, name: string): string | null => {
      // 1. Try exact match
      if (el.hasAttribute(name)) return el.getAttribute(name);

      // 2. Try iteration for localName match (rarely needed for attributes but good for safety)
      for (let i = 0; i < el.attributes.length; i++) {
        if (el.attributes[i].localName === name) return el.attributes[i].value;
      }
      return null;
    };

    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const begin = getAttr(p, 'begin');
      const end = getAttr(p, 'end');

      // Get text content but handle spacing better? 
      // Current robust approach: just use textContent. 
      // If words are merged (e.g. <span>A</span><span>B</span> -> "AB"), 
      // we can try to rely on the words array for rendering if available.
      // Normalize whitespace: replace newlines and multiple spaces with a single space
      const text = p.textContent?.replace(/\s+/g, ' ').trim();

      if (begin && text) {
        const time = getTime(begin);
        const endTime = getTime(end);

        // Extract word-level timing from spans
        const words: { text: string; startTime: number; endTime: number }[] = [];

        // Find child spans robustly
        const pChildren = Array.from(p.getElementsByTagName('*'));
        const spans = pChildren.filter(el => el.localName === 'span');

        for (let j = 0; j < spans.length; j++) {
          const s = spans[j];
          const sBegin = getAttr(s, 'begin');
          const sEnd = getAttr(s, 'end');
          const sText = s.textContent?.trim();
          // Usually strict trimming is fine for single words, but karaoke usually works best with "Word " convention.
          // Let's trim and if empty skip.

          if (sBegin && sEnd && sText && sText.trim()) {
            const wStart = getTime(sBegin);
            const wEnd = getTime(sEnd);
            if (wStart !== undefined && wEnd !== undefined) {
              words.push({
                text: sText, // Keep original whitespace? or trim? 
                // If we keep original, " " becomes " ".
                // Let's keep it as is, but maybe trim start?
                // Standard practice: trim() for the word logic usually.
                // App.tsx rendering adds margin between spans.
                startTime: wStart,
                endTime: wEnd
              });
            }
          }
        }

        if (time !== undefined) {
          lyrics.push({
            time,
            text,
            endTime: endTime,
            words: words.length > 0 ? words : undefined
          });
        }
      }
    }
  } catch (e) {
    console.error("Failed to parse TTML", e);
  }
  return lyrics.sort((a, b) => a.time - b.time);
};