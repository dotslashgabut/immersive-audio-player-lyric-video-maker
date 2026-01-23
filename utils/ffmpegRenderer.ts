/**
 * FFmpeg WASM-based Video Renderer
 * 
 * This module provides high-quality video rendering using ffmpeg.wasm,
 * allowing for frame-by-frame capture and encoding with professional codecs.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { LyricLine, VisualSlide, AudioMetadata, RenderConfig, VideoPreset } from '../types';
import { drawCanvasFrame } from './canvasRenderer';

export interface FFmpegRenderOptions {
  canvas: HTMLCanvasElement;
  audioFile: File | Blob;
  lyrics: LyricLine[];
  metadata: AudioMetadata;
  visualSlides: VisualSlide[];
  imageMap: Map<string, HTMLImageElement>;
  videoMap: Map<string, HTMLVideoElement>;
  preset: VideoPreset;
  customFontName: string | null;
  renderConfig: RenderConfig;
  resolution: '720p' | '1080p';
  aspectRatio: string;
  fps: number;
  quality: 'low' | 'med' | 'high';
  codec: 'h264' | 'h265' | 'vp9' | 'av1';
  onProgress: (progress: number, stage: string) => void;
  onLog?: (message: string) => void;
  // Support both standard AbortController signal pattern and React MutableRefObject
  abortSignal?: { aborted?: boolean; current?: boolean };
  isFirstSong?: boolean;
  isLastSong?: boolean;
}

export interface FFmpegRenderResult {
  blob: Blob;
  duration: number;
  format: string;
}

// Singleton FFmpeg instance
let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoaded = false;
let ffmpegLoading = false;

/**
 * Get or create the FFmpeg instance
 */
export async function getFFmpeg(onLog?: (message: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegLoaded) {
    return ffmpegInstance;
  }

  if (ffmpegLoading) {
    // Wait for existing load to complete
    while (ffmpegLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (ffmpegInstance && ffmpegLoaded) {
      return ffmpegInstance;
    }
  }

  ffmpegLoading = true;

  try {
    const ffmpeg = new FFmpeg();

    // Set up logging
    ffmpeg.on('log', ({ message }) => {
      onLog?.(`[FFmpeg] ${message}`);
      console.log('[FFmpeg]', message);
    });

    ffmpeg.on('progress', ({ progress, time }) => {
      onLog?.(`[FFmpeg Progress] ${(progress * 100).toFixed(1)}% (${time}s)`);
    });

    // Determine whether to use Multi-Threaded (MT) or Single-Threaded (ST) core
    const isMT = typeof window !== 'undefined' && window.crossOriginIsolated;

    if (isMT) {
      onLog?.('[FFmpeg] Cross-Origin Isolated: YES. Using Multi-Threaded Core 🚀');

      // Load FFmpeg with multi-threaded core
      const localBaseURL = '/ffmpeg';
      const remoteBaseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm';
      let coreURL: string, wasmURL: string, workerURL: string;

      try {
        // Try to load local files first
        onLog?.('[FFmpeg] Attempting to load local core files...');

        // Helper to safely load local files and detect 404s (SPA fallback to index.html)
        const loadLocal = async (url: string, type: string) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          // Check if we got HTML back (indicates SPA fallback / 404)
          const contentType = res.headers.get('Content-Type');
          if (contentType && contentType.includes('text/html')) {
            throw new Error('Received HTML instead of binary');
          }

          const blob = await res.blob();
          return URL.createObjectURL(new Blob([blob], { type }));
        };

        [coreURL, wasmURL, workerURL] = await Promise.all([
          loadLocal(`${localBaseURL}/ffmpeg-core.js`, 'text/javascript'),
          loadLocal(`${localBaseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          loadLocal(`${localBaseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
        ]);

        onLog?.('[FFmpeg] Using local core files (Offline Mode)');
      } catch (e) {
        onLog?.('[FFmpeg] Local core files not found or failed to load. Falling back to online CDN.');
        console.warn('Local FFmpeg files not found:', e);

        // Fallback to remote files
        [coreURL, wasmURL, workerURL] = await Promise.all([
          toBlobURL(`${remoteBaseURL}/ffmpeg-core.js`, 'text/javascript'),
          toBlobURL(`${remoteBaseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          toBlobURL(`${remoteBaseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
        ]);
      }

      await ffmpeg.load({
        coreURL,
        wasmURL,
        workerURL,
      });
    } else {
      onLog?.('[FFmpeg] Cross-Origin Isolated: NO. Falling back to Single-Threaded Core 🐢');
      onLog?.('[FFmpeg] Note: Rendering will be slower. Add COOP/COEP headers to server for multithreading.');

      // Load Single-Threaded core (Remote only for now to save space, or we can add local later)
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
    }

    ffmpegInstance = ffmpeg;
    ffmpegLoaded = true;
    onLog?.('[FFmpeg] Loaded successfully');

    return ffmpeg;
  } finally {
    ffmpegLoading = false;
  }
}

/**
 * Check if FFmpeg is available
 */
export function isFFmpegAvailable(): boolean {
  // We now have a single-threaded fallback, so it's always available
  return true;
}

/**
 * Get codec settings based on quality and codec choice
 */
function getCodecSettings(codec: string, quality: 'low' | 'med' | 'high', resolution: string) {
  const is1080p = resolution === '1080p';

  // CRF values (lower = better quality, higher file size)
  const crfMap = {
    low: is1080p ? 28 : 30,
    med: is1080p ? 23 : 25,
    high: is1080p ? 18 : 20,
  };

  const crf = crfMap[quality];

  switch (codec) {
    case 'h265':
      return {
        vcodec: 'libx265',
        args: ['-crf', crf.toString(), '-preset', 'medium', '-tag:v', 'hvc1'],
        format: 'mp4',
        ext: 'mp4'
      };
    case 'vp9':
      return {
        vcodec: 'libvpx-vp9',
        args: ['-crf', crf.toString(), '-b:v', '0', '-deadline', 'good', '-cpu-used', '2'],
        format: 'webm',
        ext: 'webm'
      };
    case 'av1':
      return {
        vcodec: 'libaom-av1',
        args: ['-crf', (crf + 10).toString(), '-b:v', '0', '-cpu-used', '4', '-strict', 'experimental'],
        format: 'mp4',
        ext: 'mp4'
      };
    case 'h264':
    default:
      return {
        vcodec: 'libx264',
        args: ['-crf', crf.toString(), '-preset', 'medium', '-profile:v', 'high', '-level', '4.2'],
        format: 'mp4',
        ext: 'mp4'
      };
  }
}

/**
 * Render video using FFmpeg WASM
 * This renders frames faster than realtime by drawing to canvas without waiting for audio
 */
export async function renderWithFFmpeg(options: FFmpegRenderOptions): Promise<FFmpegRenderResult> {
  const {
    canvas,
    audioFile,
    lyrics,
    metadata,
    visualSlides,
    imageMap,
    videoMap,
    preset,
    customFontName,
    renderConfig,
    fps,
    quality,
    codec,
    aspectRatio,
    onProgress,
    onLog,
    abortSignal,
    isFirstSong = true,
    isLastSong = true,
  } = options;

  onProgress(0, 'Loading FFmpeg...');

  // Check for SharedArrayBuffer support - handled inside getFFmpeg with fallback
  // if (!isFFmpegAvailable()) { ... }

  const ffmpeg = await getFFmpeg(onLog);

  const checkAborted = () => {
    return (abortSignal?.aborted === true) || (abortSignal?.current === true);
  };

  if (checkAborted()) {
    throw new Error('Render aborted');
  }

  onProgress(5, 'Preparing audio...');

  // Get audio duration
  const audioUrl = URL.createObjectURL(audioFile);
  const audioDuration = await getAudioDuration(audioUrl);
  URL.revokeObjectURL(audioUrl);

  const totalFrames = Math.ceil(audioDuration * fps);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  onProgress(10, 'Rendering frames...');

  // Write audio to FFmpeg filesystem
  const audioData = await audioFile.arrayBuffer();
  await ffmpeg.writeFile('audio.mp3', new Uint8Array(audioData));

  // Render frames
  const frameDigits = Math.max(6, totalFrames.toString().length);

  for (let frame = 0; frame < totalFrames; frame++) {
    if (checkAborted()) {
      // Cleanup
      await cleanupFFmpegFiles(ffmpeg, frame, frameDigits);
      throw new Error('Render aborted');
    }

    const time = frame / fps;

    // Sync video elements to current time
    syncVideoElements(videoMap, visualSlides, time);

    // Draw frame
    drawCanvasFrame(
      ctx,
      canvas.width,
      canvas.height,
      time,
      lyrics,
      metadata,
      visualSlides,
      imageMap,
      videoMap,
      preset,
      customFontName,
      renderConfig.fontSizeScale,
      renderConfig.backgroundBlurStrength > 0,
      audioDuration,
      renderConfig,
      isLastSong,
      isFirstSong
    );

    // Export frame as JPEG
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => b ? resolve(b) : reject(new Error('Failed to create blob')),
        'image/jpeg',
        quality === 'high' ? 0.98 : quality === 'med' ? 0.92 : 0.85
      );
    });

    const frameData = await blob.arrayBuffer();
    const frameName = `frame_${frame.toString().padStart(frameDigits, '0')}.jpg`;
    await ffmpeg.writeFile(frameName, new Uint8Array(frameData));

    // Update progress (10-80% for frame rendering)
    const renderProgress = 10 + (frame / totalFrames) * 70;
    onProgress(renderProgress, `Rendering frame ${frame + 1}/${totalFrames}`);
  }

  if (checkAborted()) {
    await cleanupFFmpegFiles(ffmpeg, totalFrames, frameDigits);
    throw new Error('Render aborted');
  }

  onProgress(80, 'Encoding video...');

  // Get codec settings
  const codecSettings = getCodecSettings(codec, quality, options.resolution);
  const outputFile = `output.${codecSettings.ext}`;

  // Build FFmpeg command
  const ffmpegArgs = [
    '-framerate', fps.toString(),
    '-i', `frame_%0${frameDigits}d.jpg`,
    '-i', 'audio.mp3',
    '-c:v', codecSettings.vcodec,
    ...codecSettings.args,
    '-c:a', 'aac',
    '-b:a', '192k',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-shortest',
    '-y',
    outputFile
  ];

  onLog?.(`[FFmpeg] Running: ffmpeg ${ffmpegArgs.join(' ')}`);

  try {
    await ffmpeg.exec(ffmpegArgs);
  } catch (err) {
    console.error('FFmpeg encoding failed:', err);
    // Cleanup and throw
    await cleanupFFmpegFiles(ffmpeg, totalFrames, frameDigits);
    throw new Error(`FFmpeg encoding failed: ${err}`);
  }

  onProgress(95, 'Finalizing...');

  // Read output file
  const outputData = await ffmpeg.readFile(outputFile);
  // Copy data to ensure it's a regular ArrayBuffer (ffmpeg may use SharedArrayBuffer)
  const outputBytes = outputData instanceof Uint8Array
    ? new Uint8Array(outputData)
    : new TextEncoder().encode(outputData as string);
  const outputBlob = new Blob([outputBytes], {
    type: codecSettings.format === 'webm' ? 'video/webm' : 'video/mp4'
  });

  // Cleanup
  await cleanupFFmpegFiles(ffmpeg, totalFrames, frameDigits);
  try {
    await ffmpeg.deleteFile('audio.mp3');
    await ffmpeg.deleteFile(outputFile);
  } catch (e) {
    // Ignore cleanup errors
  }

  onProgress(100, 'Complete!');

  return {
    blob: outputBlob,
    duration: audioDuration,
    format: codecSettings.ext
  };
}

/**
 * Render multiple tracks (playlist) using FFmpeg
 */
export async function renderPlaylistWithFFmpeg(
  tracks: Array<{
    audioFile: File;
    lyrics: LyricLine[];
    metadata: AudioMetadata;
  }>,
  options: Omit<FFmpegRenderOptions, 'audioFile' | 'lyrics' | 'metadata' | 'isFirstSong' | 'isLastSong'>,
  onTrackProgress: (trackIndex: number, totalTracks: number, progress: number, stage: string) => void
): Promise<FFmpegRenderResult> {
  const ffmpeg = await getFFmpeg(options.onLog);
  const segmentFiles: string[] = [];
  let totalDuration = 0;

  // Render each track
  for (let i = 0; i < tracks.length; i++) {
    const checkAborted = () => {
      // @ts-ignore - Check both property styles
      return (options.abortSignal?.aborted === true) || (options.abortSignal?.current === true);
    };

    if (checkAborted()) {
      // Cleanup
      for (const file of segmentFiles) {
        try { await ffmpeg.deleteFile(file); } catch (e) { }
      }
      throw new Error('Render aborted');
    }

    const track = tracks[i];
    const isFirst = i === 0;
    const isLast = i === tracks.length - 1;

    onTrackProgress(i, tracks.length, 0, `Starting track ${i + 1}/${tracks.length}`);

    const result = await renderWithFFmpeg({
      ...options,
      audioFile: track.audioFile,
      lyrics: track.lyrics,
      metadata: track.metadata,
      isFirstSong: isFirst,
      isLastSong: isLast,
      onProgress: (progress, stage) => {
        onTrackProgress(i, tracks.length, progress, stage);
      }
    });

    // Save segment
    const segmentName = `segment_${i}.${result.format}`;
    const segmentData = await result.blob.arrayBuffer();
    await ffmpeg.writeFile(segmentName, new Uint8Array(segmentData));
    segmentFiles.push(segmentName);
    totalDuration += result.duration;
  }

  if (tracks.length === 1) {
    // Just return the single track
    const data = await ffmpeg.readFile(segmentFiles[0]);
    const format = segmentFiles[0].split('.').pop() || 'mp4';
    await ffmpeg.deleteFile(segmentFiles[0]);
    // Copy data to ensure it's a regular ArrayBuffer
    const dataBytes = data instanceof Uint8Array
      ? new Uint8Array(data)
      : new TextEncoder().encode(data as string);

    return {
      blob: new Blob([dataBytes], { type: format === 'webm' ? 'video/webm' : 'video/mp4' }),
      duration: totalDuration,
      format
    };
  }

  // Concatenate all segments
  onTrackProgress(tracks.length, tracks.length, 0, 'Concatenating tracks...');

  // Create concat file
  const concatContent = segmentFiles.map(f => `file '${f}'`).join('\n');
  await ffmpeg.writeFile('concat.txt', new TextEncoder().encode(concatContent));

  const format = segmentFiles[0].split('.').pop() || 'mp4';
  const outputFile = `final_output.${format}`;

  await ffmpeg.exec([
    '-f', 'concat',
    '-safe', '0',
    '-i', 'concat.txt',
    '-c', 'copy',
    '-y',
    outputFile
  ]);

  // Read final output
  const outputData = await ffmpeg.readFile(outputFile);
  // Copy data to ensure it's a regular ArrayBuffer
  const outputBytes = outputData instanceof Uint8Array
    ? new Uint8Array(outputData)
    : new TextEncoder().encode(outputData as string);
  const outputBlob = new Blob([outputBytes], {
    type: format === 'webm' ? 'video/webm' : 'video/mp4'
  });

  // Cleanup
  for (const file of segmentFiles) {
    try { await ffmpeg.deleteFile(file); } catch (e) { }
  }
  try {
    await ffmpeg.deleteFile('concat.txt');
    await ffmpeg.deleteFile(outputFile);
  } catch (e) { }

  onTrackProgress(tracks.length, tracks.length, 100, 'Complete!');

  return {
    blob: outputBlob,
    duration: totalDuration,
    format
  };
}

/**
 * Helper to get audio duration
 */
async function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';

    audio.onloadedmetadata = () => {
      resolve(audio.duration);
      URL.revokeObjectURL(url);
    };

    audio.onerror = () => {
      reject(new Error('Failed to load audio metadata'));
      URL.revokeObjectURL(url);
    };

    audio.src = url;
  });
}

/**
 * Sync video elements to a specific time
 */
function syncVideoElements(
  videoMap: Map<string, HTMLVideoElement>,
  visualSlides: VisualSlide[],
  time: number
) {
  videoMap.forEach((vid, id) => {
    const slide = visualSlides.find(s => s.id === id);
    if (slide && slide.type === 'video') {
      if (time >= slide.startTime && time < slide.endTime) {
        const speed = slide.playbackRate || 1;
        let rel = ((time - slide.startTime) * speed) + (slide.mediaStartOffset || 0);

        // Handle looping
        const sourceDuration = slide.mediaDuration || vid.duration;
        if (sourceDuration && sourceDuration > 0 && rel >= sourceDuration) {
          rel = rel % sourceDuration;
        }

        vid.currentTime = rel;
      }
    }
  });
}

/**
 * Cleanup frame files from FFmpeg filesystem
 */
async function cleanupFFmpegFiles(ffmpeg: FFmpeg, frameCount: number, digits: number) {
  for (let i = 0; i < frameCount; i++) {
    try {
      await ffmpeg.deleteFile(`frame_${i.toString().padStart(digits, '0')}.jpg`);
    } catch (e) {
      // Ignore errors - file may not exist
    }
  }
}

/**
 * Get supported FFmpeg codecs
 */
export function getFFmpegCodecs() {
  return [
    { label: 'H.264 (MP4) - Best Compatibility', value: 'h264' },
    { label: 'H.265/HEVC (MP4) - Better Quality', value: 'h265' },
    // VP9 and AV1 are often missing from standard ffmpeg.wasm builds or have issues
    // { label: 'VP9 (WebM) - Open Format', value: 'vp9' },
    // { label: 'AV1 (MP4) - Best Compression (Slow)', value: 'av1' },
  ];
}
