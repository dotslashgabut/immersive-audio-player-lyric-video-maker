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
      // Normalize newlines early: replace literal "\n" with newline character
      rawContent = rawContent.replace(/\\n/g, '\n');

      const wordMatches = [...rawContent.matchAll(wordTimeRegex)];
      let words: { text: string; startTime: number; endTime: number }[] | undefined;

      // cleanText generation (remove tags)
      let cleanText = rawContent.replace(wordTimeRegex, '').replace(/  +/g, ' ').trim();
      // cleanText already has newlines from rawContent replacement

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
            // Split by standard newline since we normalized it
            const parts = textPart.split('\n');
            parts.forEach((p, pIdx) => {
              if (p) {
                words!.push({
                  text: p,
                  startTime: startTime,
                  endTime: 0
                });
              }
              // Re-insert newline as a word if not the last part
              if (pIdx < parts.length - 1) {
                words!.push({
                  text: '\n',
                  startTime: startTime,
                  endTime: 0
                });
              }
            });
          }
        }

        // Fix logic for initial text before first timestamp? 
        // Standard spec says text before first tag belongs to previous line or ignored? 
        // We only handle text AFTER tags here. 
        // If there is text before first tag: "<00:01>Word". StartIdx=0? No.
        // If "Intro <00:01> Word".
        // wordMatches[0].index > 0.
        // We currently ignore text before first tag. This is standard behavior for Enhanced LRC word-sync.
        // But if we want to be safe, we could check. But let's stick to current logic which iterates matches.

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

export const parseVTT = (vttContent: string): LyricLine[] => {
  const content = vttContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = content.split('\n');
  const lyrics: LyricLine[] = [];

  const timeRegex = /(\d{2}:)?(\d{2}):(\d{2})\.(\d{3})/;

  const parseTime = (timeStr: string): number | null => {
    const match = timeStr.match(timeRegex);
    if (match) {
      // match[1] is HH: (optional)
      // match[2] is MM
      // match[3] is SS
      // match[4] is mmm
      const hrs = match[1] ? parseInt(match[1].replace(':', ''), 10) : 0;
      const mins = parseInt(match[2], 10);
      const secs = parseInt(match[3], 10);
      const ms = parseInt(match[4], 10);
      return (hrs * 3600) + (mins * 60) + secs + (ms / 1000);
    }
    return null;
  };

  // VTT parsing is slightly more complex than SRT due to optional headers and settings
  // But for simple lyric extraction, we can look for timestamp lines.

  let i = 0;
  // Skip WEBVTT header
  if (lines[0] && lines[0].startsWith('WEBVTT')) {
    i = 1;
  }

  while (i < lines.length) {
    const line = lines[i].trim();

    // Check for timestamp line: "00:00:10.000 --> 00:00:15.000" (possibly with settings)
    if (line.includes('-->')) {
      const parts = line.split('-->');
      if (parts.length >= 2) {
        const startStr = parts[0].trim();
        const endStr = parts[1].trim().split(' ')[0]; // ignore settings after timestamp

        const startTime = parseTime(startStr);
        const endTime = parseTime(endStr);

        if (startTime !== null) {
          // Collect text lines until next blank line or timestamp
          i++;
          let textLines: string[] = [];
          while (i < lines.length) {
            const nextLine = lines[i].trim();
            if (nextLine === '' || nextLine.includes('-->')) {
              break;
            }
            textLines.push(lines[i]); // Keep original spacing/indent? usually trim is safe for lyrics
            i++;
          }

          // Backtrack if we hit a timestamp line (unlikely if strictly followed by blank, but VTT can be loose)
          if (i < lines.length && lines[i].includes('-->')) {
            // We consumed a timestamp line in the inner loop? 
            // actually the condition `nextLine.includes('-->')` breaks before consuming it usually.
            // But if we broke because of that, we shouldn't increment i in the outer loop yet?
            // Wait, the outer loop continues.
          }

          if (textLines.length > 0) {
            const rawText = textLines.join(' ').trim();

            // Check for word-level timestamps
            // Format: <00:00:01.000>Word or <00:01.000>Word
            // Regex to find tags: <(\d{2}:)?(\d{2}):(\d{2})\.(\d{3})>
            const wordTimeRegex = /<(\d{2}:)?(\d{2}):(\d{2})\.(\d{3})>/g;

            let words: { text: string; startTime: number; endTime: number }[] | undefined;

            // Use matchAll directly to avoid stateful issues with .test()
            const matches = [...rawText.matchAll(wordTimeRegex)];

            if (matches.length > 0) {
              words = [];

              // We need to split the text by these matches to get the words associated with them

              matches.forEach((m, idx) => {
                // Calculate time
                const hrs = m[1] ? parseInt(m[1].replace(':', ''), 10) : 0;
                const mins = parseInt(m[2], 10);
                const secs = parseInt(m[3], 10);
                const ms = parseInt(m[4], 10);
                const wStartTime = (hrs * 3600) + (mins * 60) + secs + (ms / 1000);

                const tagEndIndex = (m.index || 0) + m[0].length;

                // Text for this word starts at tagEndIndex and goes until next match index or end of string
                let nextMatchIndex = rawText.length;
                if (idx + 1 < matches.length) {
                  nextMatchIndex = matches[idx + 1].index || rawText.length;
                }

                const wordText = rawText.substring(tagEndIndex, nextMatchIndex);

                // Also handle text BEFORE the first tag if any?
                if (idx === 0 && (m.index || 0) > 0) {
                  const preText = rawText.substring(0, m.index);
                  if (preText.trim()) {
                    words!.push({
                      text: preText.trim(),
                      startTime: startTime, // Line start time
                      endTime: wStartTime
                    });
                  }
                }

                if (wordText) {
                  words!.push({
                    text: wordText,
                    startTime: wStartTime,
                    endTime: 0 // placeholder
                  });
                }
              });

              // Fix end times
              for (let j = 0; j < words.length; j++) {
                if (j < words.length - 1) {
                  words[j].endTime = words[j + 1].startTime;
                } else {
                  words[j].endTime = endTime !== null ? endTime : words[j].startTime + 0.5;
                }
              }
            }

            // aggressive cleanup of tags using a broader regex
            const cleanText = rawText.replace(/<[\d:.]+>/g, '').replace(/\s+/g, ' ').trim();
            const text = fixCJKSpacing(cleanText);

            lyrics.push({
              time: startTime,
              text,
              endTime: endTime !== null ? endTime : undefined,
              words: words && words.length > 0 ? words : undefined
            });
          }
          continue; // loop continues from current i
        }
      }
    }
    i++;
  }

  return lyrics;
};