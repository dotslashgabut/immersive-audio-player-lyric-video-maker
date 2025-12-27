
import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionSegment } from "../types";

// function to get AI instance
const getAI = (apiKey?: string) => new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || '' });

const TRANSCRIPTION_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      startTime: {
        type: Type.STRING,
        description: "Start timestamp. REQUIRED format HH:MM:SS.mmm (e.g., '00:00:01.234'). Do not round.",
      },
      endTime: {
        type: Type.STRING,
        description: "End timestamp. REQUIRED format HH:MM:SS.mmm (e.g., '00:00:04.567').",
      },
      text: {
        type: Type.STRING,
        description: "Transcribed text content.",
      },
    },
    required: ["startTime", "endTime", "text"],
  },
};

/**
 * Robustly normalizes timestamp strings to HH:MM:SS.mmm
 * Handles cases where models confuse HH:MM:SS with MM:SS:mmm
 */
function normalizeTimestamp(ts: string): string {
  if (!ts) return "00:00:00.000";

  // 1. Replace comma with dot (SRT style)
  let clean = ts.replace(/,/g, '.');

  // 2. Remove all chars except digits, colons, and dots
  clean = clean.replace(/[^\d:.]/g, '');

  // 3. Separate Time Part from Milliseconds Part (if any)
  // Split by dot. LIMIT: 1 dot expected for milliseconds.
  // If multiple dots? First one might be separation? Actually, usually last one.
  // But let's assume standard format HH:MM:SS.mmm
  const parts = clean.split('.');

  let timePart = parts[0];
  let msPart = "000";

  if (parts.length > 1) {
    msPart = parts[1];
  }

  // Normalize milliseconds
  // If msPart is "5", it usually means 500ms? Or 5ms? 
  // In standard parsing: 12:00.5 -> 500ms. 12:00.05 -> 50ms.
  // So we should verify length.
  if (msPart.length > 3) {
    msPart = msPart.substring(0, 3);
  } else {
    // If length < 3, usually we padEnd (e.g. .1 -> .100)
    // BUT some models might output .012 (12ms) as .012. 
    // IF model outputs .12 (120ms), it's .120.
    msPart = msPart.padEnd(3, '0');
  }

  // 4. Parse Time components (HH:MM:SS)
  const timeComponents = timePart.split(':');
  let hh = "00", mm = "00", ss = "00";

  if (timeComponents.length >= 3) {
    // HH:MM:SS
    [hh, mm, ss] = timeComponents.slice(-3); // Take last 3 if more
  } else if (timeComponents.length === 2) {
    // MM:SS
    [mm, ss] = timeComponents;
  } else if (timeComponents.length === 1) {
    // SS
    ss = timeComponents[0];
  }

  // Pad Helpers
  const pad2 = (val: string) => val.padStart(2, '0').slice(-2);

  // Reconstruct
  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}.${msPart}`;
}

/**
 * Attempts to repair truncated JSON strings commonly returned by LLMs when hitting token limits.
 * Assumes the structure is {"segments": [...]}
 */
function tryRepairJson(jsonString: string): any {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    // If it fails, try to repair
  }

  const trimmed = jsonString.trim();
  const lastObjectEnd = trimmed.lastIndexOf('}');

  if (lastObjectEnd === -1) {
    throw new Error("Response too short or malformed to repair.");
  }

  // Attempt 1: Assume it's a truncated Array [ ...
  const repairedArray = trimmed.substring(0, lastObjectEnd + 1) + "]";
  try {
    const parsed = JSON.parse(repairedArray);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    // Continue
  }

  // Attempt 2: Assume it's a truncated Object { segments: [ ...
  const repairedObject = trimmed.substring(0, lastObjectEnd + 1) + "]}";
  try {
    const parsed = JSON.parse(repairedObject);
    if (parsed.segments && Array.isArray(parsed.segments)) {
      return parsed.segments;
    }
  } catch (e) {
    // Continue
  }

  // Attempt 3: Regex extraction as fallback
  const segments = [];
  const segmentRegex = /\{\s*["']startTime["']\s*:\s*["']([^"']+)["']\s*,\s*["']endTime["']\s*:\s*["']([^"']+)["']\s*,\s*["']text["']\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*\}/g;

  let match;
  while ((match = segmentRegex.exec(trimmed)) !== null) {
    segments.push({
      startTime: match[1],
      endTime: match[2],
      text: match[3] || match[4]
    });
  }

  if (segments.length > 0) {
    return segments;
  }

  throw new Error("Failed to repair JSON response");
}

export async function transcribeAudio(
  modelName: string,
  audioBase64: string,
  mimeType: string,
  apiKey?: string,
  signal?: AbortSignal
): Promise<TranscriptionSegment[]> {
  try {
    const ai = getAI(apiKey);
    const isGemini3 = modelName.includes('gemini-3');

    // Base prompt for standard models
    let promptText = `
    Act as a professional audio transcriber and lyric synchronizer. 
    Analyze the provided audio and generate highly accurate subtitles/lyrics.

    TIMESTAMP PRECISION RULES:
    1. **FORMAT**: Timestamps MUST be strings in "MM:SS.mmm" format (e.g., "00:04.250").
    2. **SYNC**: The "start" timestamp must align exactly with the very first audible syllable.
    3. **DURATION**: The "end" timestamp must mark exactly when the phrase concludes.
    
    OUTPUT: Return a JSON array of objects with keys: "startTime", "endTime", "text".
  `;

    // Specialized Anti-Drift Prompt for Gemini 3 Flash (from sample_geminiService.ts)
    if (isGemini3) {
      promptText = `
      ### ROBUSTNESS RULES
      1. **NO SKIPPED TEXT**: Transcribe EVERY audible phrase. Do not summarize or omit.
      2. **QUOTING**: Ensure the JSON is valid. Escape double quotes inside text (e.g. \"). Single quotes (') are safe to use directly inside double-quoted strings.

      ### THE "SAME-PREFIX" TIMING RULE (CRITICAL)
      If multiple lines start with the same words (e.g., a repeated chorus line), you MUST NOT predict the timing. 
      - **DO NOT** assume the next line starts right after the previous one.
      - **DO NOT** skip forward based on textual similarity.
      - **ACTION**: You must find the EXACT millisecond where the vocal signal physically begins for EVERY instance. If a word is repeated 3 times, you must output 3 separate objects with 3 distinct, non-overlapping timestamps.

      ### SYNC PROTOCOL
      1. **START ANCHOR**: The 'startTime' timestamp MUST be the absolute first millisecond of the vocal "attack".
      2. **END ANCHOR**: The 'endTime' timestamp MUST be the exact moment the vocal decay finishes.
      3. **ZERO PREDICTION**: Ignore any internal knowledge of song patterns. Treat every second of audio as a raw signal. If there is a 2-second gap between identical lines, your timestamps MUST reflect that 2-second gap accurately.

      ### FORMAT REQUIREMENTS
      - Output: Pure JSON Array of objects with keys: "startTime", "endTime", "text".
      - Precision: Use "MM:SS.mmm" (e.g., "01:23.456"). Milliseconds are MANDATORY.
      - Verbatim: Transcribe exactly what is heard. No summaries.
    `;
    }

    const requestConfig: any = {
      responseMimeType: "application/json",
      responseSchema: TRANSCRIPTION_SCHEMA,
      temperature: 0.1,
    };

    // For Gemini 3, disable thinking to maximize output tokens for the actual transcription content
    if (isGemini3) {
      requestConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    const abortPromise = new Promise<never>((_, reject) => {
      if (signal?.aborted) reject(new DOMException("Aborted", "AbortError"));
      signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    });

    // Race the API call against the abort signal
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
                text: promptText,
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

    // Clean up potential markdown formatting
    text = text.trim();
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = tryRepairJson(text);
    const segments = Array.isArray(parsed) ? parsed : (parsed.segments || []);

    return segments
      .map((s: any) => ({
        startTime: normalizeTimestamp(String(s.startTime)),
        endTime: normalizeTimestamp(String(s.endTime)),
        text: String(s.text)
      }))
      .sort((a: TranscriptionSegment, b: TranscriptionSegment) => {
        // Simple string comparison works for HH:MM:SS.mmm
        return a.startTime.localeCompare(b.startTime);
      });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.error(`Error transcribing with ${modelName}:`, error);
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
              IMPORTANT: DO NOT CHANGE the timestamps at all. Keep the HH:MM:SS.mmm format exactly as is.
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
