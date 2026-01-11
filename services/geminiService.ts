
import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionSegment } from "../types";

// function to get AI instance
const getAI = (apiKey?: string) => new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || '' });

const TRANSCRIPTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    segments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          startTime: {
            type: Type.STRING,
            description: "Absolute timestamp in MM:SS.mmm format (e.g. '01:05.300'). Cumulative from start.",
          },
          endTime: {
            type: Type.STRING,
            description: "Absolute timestamp in MM:SS.mmm format.",
          },
          text: {
            type: Type.STRING,
            description: "Transcribed text. Exact words spoken. No hallucinations. Must include every single word.",
          },
        },
        required: ["startTime", "endTime", "text"],
      },
    },
  },
  required: ["segments"],
};

const WORD_LEVEL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    segments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          startTime: { type: Type.STRING },
          endTime: { type: Type.STRING },
          text: { type: Type.STRING },
          words: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: "The single word" },
                startTime: { type: Type.STRING, description: "Start time of the word" },
                endTime: { type: Type.STRING, description: "End time of the word" }
              },
              required: ["text", "startTime", "endTime"]
            }
          }
        },
        required: ["startTime", "endTime", "text", "words"],
      },
    },
  },
  required: ["segments"],
};

/**
 * Robustly normalizes timestamp strings to HH:MM:SS.mmm
 */
function normalizeTimestamp(ts: string): string {
  if (!ts) return "00:00.000";

  let clean = ts.trim().replace(/[^\d:.]/g, '');

  let totalSeconds = 0;

  // Handle if model returns raw seconds (e.g. "65.5") despite instructions
  if (!clean.includes(':') && /^[\d.]+$/.test(clean)) {
    totalSeconds = parseFloat(clean);
  } else {
    // Handle MM:SS.mmm or HH:MM:SS.mmm
    const parts = clean.split(':');

    if (parts.length === 3) {
      // HH:MM:SS
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      const secParts = parts[2].split('.');
      const s = parseInt(secParts[0], 10) || 0;
      let ms = 0;
      if (secParts[1]) {
        ms = parseFloat("0." + secParts[1]); // fractional part
      }
      totalSeconds = h * 3600 + m * 60 + s + ms;

    } else if (parts.length === 2) {
      // MM:SS
      const m = parseInt(parts[0], 10) || 0;
      const secParts = parts[1].split('.');
      const s = parseInt(secParts[0], 10) || 0;
      let ms = 0;
      if (secParts[1]) {
        ms = parseFloat("0." + secParts[1]);
      }
      totalSeconds = m * 60 + s + ms;
    }
  }

  if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00.000";

  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  const ms = Math.round((totalSeconds % 1) * 1000);

  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/**
 * Attempts to repair truncated JSON strings commonly returned by LLMs when hitting token limits.
 */
function tryRepairJson(jsonString: string): any {
  const trimmed = jsonString.trim();

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.segments && Array.isArray(parsed.segments)) {
      return parsed;
    }
    if (Array.isArray(parsed)) {
      return { segments: parsed };
    }
  } catch (e) {
    // Continue
  }

  // Attempt to close truncated JSON
  const lastObjectEnd = trimmed.lastIndexOf('}');
  if (lastObjectEnd !== -1) {
    // Try to close array and object if they look open
    // This is a naive heuristic but works for many truncated array cases
    // We try adding ]} and if that fails, maybe we just need }
    const sets = ["]}", "}", "]}"];
    for (const suffix of sets) {
      try {
        const repaired = trimmed + suffix;
        const parsed = JSON.parse(repaired);
        if (parsed.segments) return parsed;
      } catch (e) { }
    }

    // As a fallback for simple line-based (not word-based) we can use regex
    // but for word-based we rely on valid JSON structure mostly.
    const repaired = trimmed.substring(0, lastObjectEnd + 1) + "]}";
    try {
      const parsed = JSON.parse(repaired);
      if (parsed.segments && Array.isArray(parsed.segments)) {
        return parsed;
      }
    } catch (e) {
      // Continue
    }
  }

  // Regex fallback (Only for simple schema, skipping if it looks like word-level to avoid corruption)
  if (trimmed.includes('"words"')) {
    throw new Error("Complex nested JSON (word-level) could not be parsed. PLease try again.");
  }

  const segments = [];
  // Updated Regex to capture standard HH:MM:SS format better if needed, though mostly relying on structure
  const segmentRegex = /\{\s*"startTime"\s*:\s*"?([^",]+)"?\s*,\s*"endTime"\s*:\s*"?([^",]+)"?\s*,\s*"text"\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;

  let match;
  while ((match = segmentRegex.exec(trimmed)) !== null) {
    const rawText = match[3] !== undefined ? match[3] : match[4];
    let unescapedText = rawText;
    try {
      unescapedText = JSON.parse(`"${rawText.replace(/"/g, '\\"')}"`);
    } catch (e) {
      unescapedText = rawText.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, "\\");
    }

    segments.push({
      startTime: match[1],
      endTime: match[2],
      text: unescapedText
    });
  }

  if (segments.length > 0) {
    return { segments };
  }

  throw new Error("Response structure invalid and could not be repaired.");
}

export async function transcribeAudio(
  modelName: string,
  audioBase64: string,
  mimeType: string,
  apiKey?: string,
  signal?: AbortSignal,
  granularity: 'word' | 'line' = 'line'
): Promise<TranscriptionSegment[]> {
  try {
    const ai = getAI(apiKey);
    const isGemini3 = modelName.includes('gemini-3');

    // Condensed policies for faster processing
    const policies = `
    RULES:
    1. TIMING: Use **MM:SS.mmm** (e.g. 01:05.300). Absolute from start. Sync EXACTLY to speech.
    2. VERBATIM: Transcribe exactly what is spoken. Include repetitions (e.g. "Na na na"). Do not paraphrase.
    3. COMPLETENESS: Transcribe the ENTIRE file. Do not skip fast sections.
    4. SEGMENTATION: Split recurring phrases. Max segment length ~5s. Break at pauses.
    5. NO HALLUCINATION: Only transcribe audible speech.
    6. JSON SAFETY: Escape double quotes in text (e.g. \\").
    `;

    const requestConfig: any = {
      responseMimeType: "application/json",
      responseSchema: granularity === 'word' ? WORD_LEVEL_SCHEMA : TRANSCRIPTION_SCHEMA,
      temperature: 0,
    };

    if (isGemini3) {
      requestConfig.thinkingConfig = { thinkingBudget: 2048 };
    }

    const abortPromise = new Promise<never>((_, reject) => {
      if (signal?.aborted) reject(new DOMException("Aborted", "AbortError"));
      signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    });

    const response: any = await Promise.race([
      ai.models.generateContent({
        model: modelName,
        contents: [
          {
            parts: [
              {
                inlineData: {
                  data: audioBase64,
                  mimeType: mimeType,
                },
              },
              {
                text: `You are a high-fidelity, verbatim audio transcription engine optimized for **Lyrics**. Your output must be exhaustive, complete, and perfectly timed.
                
                ${policies}
                
                REQUIRED FORMAT: JSON object with "segments" array. 
                Granularity: ${granularity === 'word' ? '**WORD-LEVEL**' : 'Line-Level'}
                ${granularity === 'word' ? 'You MUST include a "words" array for each segment containing every single word with its precise start/end time.' : ''}
                Timestamps MUST be 'MM:SS.mmm'. Do not stop until you have reached the end of the audio.`,
              },
            ],
          },
        ],
        config: requestConfig,
      }),
      abortPromise
    ]);

    let text = response.text;
    if (!text) throw new Error("Empty response from model");

    text = text.trim();
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = tryRepairJson(text);
    const segments = parsed.segments || [];

    return segments.map((s: any) => ({
      startTime: normalizeTimestamp(String(s.startTime)),
      endTime: normalizeTimestamp(String(s.endTime)),
      text: String(s.text),
      words: s.words ? s.words.map((w: any) => ({
        text: String(w.text),
        startTime: normalizeTimestamp(String(w.startTime)),
        endTime: normalizeTimestamp(String(w.endTime))
      })) : undefined
    }));
  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    console.error(`Error with ${modelName}:`, error);
    throw new Error(error.message || "Transcription failed");
  }
}

export async function translateSegments(
  segments: TranscriptionSegment[],
  targetLanguage: string,
  apiKey?: string
): Promise<TranscriptionSegment[]> {
  try {
    const ai = getAI(apiKey);
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: `Translate these segments into ${targetLanguage}. 
              IMPORTANT: DO NOT CHANGE the timestamps at all. Keep the MM:SS.mmm format exactly as is.
              Data: ${JSON.stringify(segments)}`,
            },
          ],
        },
      ],
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  startTime: { type: Type.STRING },
                  endTime: { type: Type.STRING },
                  text: { type: Type.STRING },
                  translatedText: { type: Type.STRING },
                },
                required: ["startTime", "endTime", "text", "translatedText"],
              },
            },
          },
        },
      },
    });

    let text = response.text;
    if (!text) throw new Error("Empty response from translation model");

    // Clean markdown for translation as well
    text = text.trim();
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(text);
    return parsed.segments || [];
  } catch (error: any) {
    console.error("Translation error:", error);
    throw error;
  }
}

export async function generateSpeech(text: string, apiKey?: string): Promise<string | undefined> {
  try {
    const ai = getAI(apiKey);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("TTS error:", error);
    throw error;
  }
}
