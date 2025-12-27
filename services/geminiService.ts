
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
            description: "Absolute timestamp in HH:MM:SS.mmm format (e.g. '00:01:05.300'). Cumulative from start.",
          },
          endTime: {
            type: Type.STRING,
            description: "Absolute timestamp in HH:MM:SS.mmm format.",
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

/**
 * Robustly normalizes timestamp strings to HH:MM:SS.mmm
 */
function normalizeTimestamp(ts: string): string {
  if (!ts) return "00:00:00.000";

  let clean = ts.trim().replace(/[^\d:.]/g, '');

  // Handle if model returns raw seconds (e.g. "65.5") despite instructions
  if (!clean.includes(':') && /^[\d.]+$/.test(clean)) {
    const totalSeconds = parseFloat(clean);
    if (!isNaN(totalSeconds)) {
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = Math.floor(totalSeconds % 60);
      const ms = Math.round((totalSeconds % 1) * 1000);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    }
  }

  // Handle MM:SS.mmm or HH:MM:SS.mmm
  const parts = clean.split(':');
  let h = 0, m = 0, s = 0, ms = 0;

  if (parts.length === 3) {
    h = parseInt(parts[0], 10) || 0;
    m = parseInt(parts[1], 10) || 0;
    const secParts = parts[2].split('.');
    s = parseInt(secParts[0], 10) || 0;
    if (secParts[1]) {
      // Pad or truncate to 3 digits for parsing
      const msStr = secParts[1].substring(0, 3).padEnd(3, '0');
      ms = parseInt(msStr, 10);
    }
  } else if (parts.length === 2) {
    m = parseInt(parts[0], 10) || 0;
    const secParts = parts[1].split('.');
    s = parseInt(secParts[0], 10) || 0;
    if (secParts[1]) {
      const msStr = secParts[1].substring(0, 3).padEnd(3, '0');
      ms = parseInt(msStr, 10);
    }
  } else {
    // Fallback if parsing fails
    return "00:00:00.000";
  }

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
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
    // Handle if it returns array directly (legacy robustness)
    if (Array.isArray(parsed)) {
      return { segments: parsed };
    }
  } catch (e) {
    // Continue
  }

  const lastObjectEnd = trimmed.lastIndexOf('}');
  if (lastObjectEnd !== -1) {
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
  signal?: AbortSignal
): Promise<TranscriptionSegment[]> {
  try {
    const ai = getAI(apiKey);
    const isGemini3 = modelName.includes('gemini-3');

    const timingPolicy = `
    STRICT TIMING POLICY:
    1. FORMAT: Use **HH:MM:SS.mmm** (e.g. 00:01:05.300).
    2. ABSOLUTE & CUMULATIVE: Timestamps must be relative to the START of the file.
    3. MONOTONICITY: Time MUST always move forward. startTime[n] >= endTime[n-1].
    4. ACCURACY: Sync text exactly to when it is spoken.
    `;

    const verbatimPolicy = `
    VERBATIM & FIDELITY:
    1. STRICT VERBATIM: Transcribe EXACTLY what is spoken. Do not paraphrase, summarize, or "correct" grammar.
    2. REPETITIONS: Include all repetitions (e.g. "I... I... I don't know").
    3. NO CLEANUP: Do not remove filler words like "um", "ah", "uh".
    `;

    const completenessPolicy = `
    COMPLETENESS POLICY (CRITICAL):
    1. EXHAUSTIVE: You must transcribe the ENTIRE audio file from 00:00:00.000 until the end.
    2. NO SKIPPING: Do not skip any sentences or words, even if they are quiet or fast.
    3. NO DEDUPLICATION: If a speaker repeats the same sentence, you MUST transcribe it every time it is said.
    4. SEGMENTATION: Break segments at least every 5-7 seconds. Do NOT create long segments.
    `;

    const antiHallucinationPolicy = `
    ANTI-HALLUCINATION:
    1. NO INVENTED TEXT: Do NOT output text if no speech is present.
    2. NO GUESSING: If audio is absolutely unintelligible, skip it.
    3. NO LABELS: Do not add speaker labels (like "Speaker 1:").
    `;

    const jsonSafetyPolicy = `
    JSON FORMATTING SAFETY:
    1. TEXT ESCAPING: The 'text' field MUST be wrapped in DOUBLE QUOTES (").
    2. INTERNAL QUOTES: If the text contains a double quote, ESCAPE IT (e.g. \\"). 
    `;

    const requestConfig: any = {
      responseMimeType: "application/json",
      responseSchema: TRANSCRIPTION_SCHEMA,
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
                text: `You are a high-fidelity, verbatim audio transcription engine. Your output must be exhaustive and complete.
                
                ${timingPolicy}
                ${verbatimPolicy}
                ${completenessPolicy}
                ${antiHallucinationPolicy}
                ${jsonSafetyPolicy}
                
                REQUIRED FORMAT: JSON object with "segments" array. 
                Timestamps MUST be 'HH:MM:SS.mmm'. Do not stop until you have reached the end of the audio.`,
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
      text: String(s.text)
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
