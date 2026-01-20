import { LyricLine } from '../types';



const fixCJKSpacing = (text: string): string => {
  const cjkRegex = /([\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF])\s+([\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF])/g;
  return text.replace(cjkRegex, '$1$2');
};

export const parseTimestamp = (timeStr: string): number => {
  if (!timeStr) return 0;


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
  const timeRegex = /\[(\d{2}):(\d{2})(\.(\d{2,3}))?\]/g;
  const wordTimeRegex = /<(\d{2}):(\d{2})(\.(\d{2,3}))?>/g;

  lines.forEach((line) => {
    const matches = [...line.matchAll(timeRegex)];

    if (matches.length > 0) {
      let rawContent = line.replace(timeRegex, '').trim();
      const wordMatches = [...rawContent.matchAll(wordTimeRegex)];
      let words: { text: string; startTime: number; endTime: number }[] | undefined;


      let cleanText = rawContent.replace(wordTimeRegex, '').replace(/  +/g, ' ').trim();
      cleanText = cleanText.replace(/\\n/g, '\n');

      if (wordMatches.length > 0) {
        words = [];
        for (let i = 0; i < wordMatches.length; i++) {
          const m = wordMatches[i];
          const minutes = parseInt(m[1], 10);
          const seconds = parseInt(m[2], 10);
          const msStr = m[4];

          let startTime = minutes * 60 + seconds;
          if (msStr) {
            startTime += parseInt(msStr, 10) / (msStr.length === 3 ? 1000 : 100);
          }

          const startIdx = (m.index || 0) + m[0].length;
          const endIdx = (i < wordMatches.length - 1) ? wordMatches[i + 1].index! : rawContent.length;
          const textPart = rawContent.substring(startIdx, endIdx);

          if (textPart) {
            const parts = textPart.split(/(\\n)/g);
            parts.forEach(p => {
              if (p) {
                words.push({
                  text: p === '\\n' ? '\n' : p, // Convert literal \n to newline char
                  startTime: startTime,
                  endTime: 0
                });
              }
            });
          }
        }


        for (let i = 0; i < words.length; i++) {
          if (i < words.length - 1) {
            words[i].endTime = words[i + 1].startTime;
          } else {
            words[i].endTime = words[i].startTime + 0.5;
          }
        }
      }

      matches.forEach(match => {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const msStr = match[4];

        let time = minutes * 60 + seconds;
        if (msStr) {
          if (msStr.length === 2) {
            time += parseInt(msStr, 10) / 100;
          } else if (msStr.length === 3) {
            time += parseInt(msStr, 10) / 1000;
          } else {
            time += parseInt(msStr, 10) / 1000;
          }
        }

        lyrics.push({ time, text: cleanText, words });
      });
    }
  });

  return lyrics.sort((a, b) => a.time - b.time);
};

export const parseSRT = (srtContent: string): LyricLine[] => {

  const content = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = content.split('\n\n');
  const lyrics: LyricLine[] = [];


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

      const timeLine = lines[1];
      const textLines = lines.slice(2);
      const rawText = textLines.join(' ').trim();
      const text = fixCJKSpacing(rawText);

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


    const getAttr = (el: Element, name: string): string | null => {
      // 1. Try exact match
      if (el.hasAttribute(name)) return el.getAttribute(name);


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
      // Also apply CJK spacing fix
      const text = fixCJKSpacing(p.textContent?.replace(/\s+/g, ' ').trim() || '');

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
          const sText = s.textContent?.replace(/\s+/g, ' ');

          if (sBegin && sEnd && sText && sText.length > 0) {
            const wStart = getTime(sBegin);
            const wEnd = getTime(sEnd);
            if (wStart !== undefined && wEnd !== undefined) {
              words.push({
                text: sText,
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

export const parseJSON = (jsonContent: string): LyricLine[] => {
  try {
    const parsed = JSON.parse(jsonContent);
    if (Array.isArray(parsed)) {
      // Basic validation: check if items look like LyricLine
      const isValid = parsed.every(item =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.time === 'number' &&
        typeof item.text === 'string'
      );
      if (isValid) {
        return parsed as LyricLine[];
      }
    }
  } catch (e) {
    console.warn("Failed to parse JSON lyrics", e);
  }
  return [];
};