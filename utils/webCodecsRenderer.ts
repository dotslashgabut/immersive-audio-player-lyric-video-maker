import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { LyricLine, VisualSlide, AudioMetadata, RenderConfig, VideoPreset } from '../types';
import { drawCanvasFrame } from './canvasRenderer';

export interface WebCodecsRenderOptions {
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
    onProgress: (progress: number, stage: string) => void;
    onLog?: (message: string) => void;
    abortSignal?: { aborted?: boolean; current?: boolean };
    isFirstSong?: boolean;
    isLastSong?: boolean;
}

export interface WebCodecsRenderResult {
    blob: Blob;
    duration: number;
    format: string;
}

/**
 * Check if WebCodecs is supported
 */
export function isWebCodecsSupported(): boolean {
    return typeof window !== 'undefined' && 'VideoEncoder' in window && 'AudioEncoder' in window;
}

/**
 * Helper to get audio duration and buffer
 */
async function decodeAudio(file: File | Blob): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioContext.close();
    return audioBuffer;
}

/**
* Sync video elements to a specific time (Async with seek wait)
*/
async function syncVideoElements(
    videoMap: Map<string, HTMLVideoElement>,
    visualSlides: VisualSlide[],
    time: number
): Promise<void> {
    const promises: Promise<void>[] = [];

    videoMap.forEach((vid, id) => {
        let targetTime = -1;

        if (id === 'background') {
            const duration = vid.duration || 1;
            if (duration > 0) {
                targetTime = time % duration;
            }
        } else {
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
                    targetTime = rel;
                }
            }
        }

        // Only seek if targetTime is valid and different enough
        // We use a small epsilon but since we want frame accuracy, we almost always seek
        if (targetTime >= 0) {
            // Check if we need to seek
            if (Math.abs(vid.currentTime - targetTime) > 0.05) { // 50ms tolerance? No, for frame rendering we want exact.
                // Actually, vid.currentTime might not be exact.
                // Let's force seek every time to be safe? 
                // Seeking is expensive. If the video is playing sequentially, maybe play() is better?
                // But we are rendering probably faster or slower than realtime, so strict seeking is required.

                promises.push(new Promise<void>((resolve) => {
                    let resolved = false;
                    const onSeeked = () => {
                        if (resolved) return;
                        resolved = true;
                        vid.removeEventListener('seeked', onSeeked);
                        resolve();
                    };

                    vid.addEventListener('seeked', onSeeked);
                    vid.currentTime = targetTime;

                    // Fallback timeout in case seek doesn't fire (e.g. very close time or error)
                    setTimeout(() => {
                        if (!resolved) {
                            resolved = true;
                            vid.removeEventListener('seeked', onSeeked);
                            resolve();
                        }
                    }, 500);
                }));
            }
        }
    });

    if (promises.length > 0) {
        await Promise.all(promises);
    }
}

/**
 * Main Render Function
 */
export async function renderWithWebCodecs(options: WebCodecsRenderOptions): Promise<WebCodecsRenderResult> {
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
        onProgress,
        onLog,
        abortSignal,
        isFirstSong = true,
        isLastSong = true,
    } = options;

    if (!isWebCodecsSupported()) {
        throw new Error("WebCodecs API is not supported in this browser.");
    }

    const checkAborted = () => {
        return (abortSignal?.aborted === true) || (abortSignal?.current === true);
    };

    onProgress(0, 'Initializing WebCodecs...');

    // 1. Prepare Audio
    onLog?.('Decoding audio...');
    const audioBuffer = await decodeAudio(audioFile);
    const duration = audioBuffer.duration;
    const totalFrames = Math.ceil(duration * fps);

    // 2. Setup Muxer
    const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: {
            codec: 'avc',
            width: canvas.width,
            height: canvas.height
        },
        audio: {
            codec: 'aac',
            sampleRate: audioBuffer.sampleRate,
            numberOfChannels: audioBuffer.numberOfChannels
        },
        fastStart: 'in-memory'
    });

    // 3. Setup Video Encoder
    // Bitrate calculation
    const baseBitrate = options.resolution === '1080p' ? 8_000_000 : 4_000_000;
    const qualityMult = quality === 'high' ? 1.5 : quality === 'low' ? 0.5 : 1.0;
    const bitrate = baseBitrate * qualityMult;

    const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => { throw e; }
    });

    videoEncoder.configure({
        codec: 'avc1.4d002a', // H.264 Main Profile
        width: canvas.width,
        height: canvas.height,
        bitrate: bitrate,
        framerate: fps,
        // latencyMode: 'quality' // Default
    });

    // 4. Setup Audio Encoder
    const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (e) => { throw e; }
    });

    audioEncoder.configure({
        codec: 'mp4a.40.2', // AAC LC
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        bitrate: 128_000
    });

    // 5. Encode Audio
    onProgress(5, 'Encoding Audio...');
    onLog?.('Encoding audio tracks...');

    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const samplesPerChunk = sampleRate; // 1 second chunks
    const totalSamples = audioBuffer.length;

    for (let i = 0; i < totalSamples; i += samplesPerChunk) {
        if (checkAborted()) throw new Error('Render aborted');

        const length = Math.min(samplesPerChunk, totalSamples - i);
        const timestamp = Math.round((i / sampleRate) * 1_000_000); // microseconds, integer

        const dataBuffer = new Float32Array(length * numberOfChannels);

        // Interleave for 'f32-planar' (actually planar means separate/sequential planes)
        for (let ch = 0; ch < numberOfChannels; ch++) {
            const channelData = audioBuffer.getChannelData(ch);
            const slice = channelData.subarray(i, i + length);
            dataBuffer.set(slice, ch * length);
        }

        const audioData = new AudioData({
            format: 'f32-planar',
            sampleRate: sampleRate,
            numberOfFrames: length,
            numberOfChannels: numberOfChannels,
            timestamp: timestamp,
            data: dataBuffer
        });

        audioEncoder.encode(audioData);
        audioData.close();
    }

    // Flush Audio Encoder
    await audioEncoder.flush();

    // 6. Encode Video
    onProgress(10, 'Rendering Frames...');
    const ctx = canvas.getContext('2d', {
        desynchronized: false // Ensure we get consistent snapshots
    });
    if (!ctx) throw new Error('No canvas context');

    // Time per frame in microseconds
    const frameDurationMicro = (1 / fps) * 1_000_000;

    for (let frame = 0; frame < totalFrames; frame++) {
        if (checkAborted()) throw new Error('Render aborted');

        const time = frame / fps; // seconds

        // Async Sync visuals (Wait for seek)
        await syncVideoElements(videoMap, visualSlides, time);

        // Draw
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
            duration,
            renderConfig,
            isLastSong,
            isFirstSong
        );

        // Create VideoFrame from Canvas
        // timestamp is in microseconds, MUST be integer
        const timestamp = Math.round(frame * frameDurationMicro);
        const durationMicro = Math.round(frameDurationMicro);

        const videoFrame = new VideoFrame(canvas, {
            timestamp: timestamp,
            duration: durationMicro
        });

        // Keyframe every 2 seconds roughly
        const keyFrame = frame % (fps * 2) === 0;

        videoEncoder.encode(videoFrame, { keyFrame });
        videoFrame.close();

        // Update Progress
        const percent = 10 + ((frame / totalFrames) * 90);
        onProgress(percent, `Rendering frame ${frame}/${totalFrames}`);

        // Yield to event loop occasionally to keep UI responsive
        if (frame % 5 === 0) await new Promise(r => setTimeout(r, 0));
    }

    // Flush Video Encoder
    onProgress(99, 'Finalizing...');
    await videoEncoder.flush();

    // Finalize Muxer
    muxer.finalize();

    const { buffer } = muxer.target as ArrayBufferTarget;

    const blob = new Blob([buffer], { type: 'video/mp4' });

    onProgress(100, 'Done!');

    return {
        blob,
        duration,
        format: 'mp4'
    };
}
