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
    startTimeOffset?: number;
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
    time: number,
    globalTime?: number
): Promise<void> {
    const promises: Promise<void>[] = [];

    videoMap.forEach((vid, id) => {
        let targetTime = -1;

        if (id === '__custom_bg_video__') {
            const duration = vid.duration || 1;
            if (duration > 0) {
                // Use globalTime if available for continuous playlist looping, else fall back to track time
                targetTime = (globalTime !== undefined ? globalTime : time) % duration;
            }
        } else if (id === 'background') {
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
        if (targetTime >= 0) {
            if (vid.readyState === 0) return;

            if (Math.abs(vid.currentTime - targetTime) > 0.05) {
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
 * Helper to load an image into a map and wait for it
 */
async function loadImgIntoMap(id: string, url: string, imageMap: Map<string, HTMLImageElement>): Promise<void> {
    if (imageMap.has(id)) {
        const existing = imageMap.get(id);
        if (existing?.src === url) return;
    }

    return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => { imageMap.set(id, img); resolve(); };
        img.onerror = () => { console.warn("Failed to load background image:", url); resolve(); };
        img.src = url;
    });
}

/**
 * Helper to load a video into a map and wait for it
 */
async function loadVidIntoMap(id: string, url: string, videoMap: Map<string, HTMLVideoElement>): Promise<void> {
    if (videoMap.has(id)) {
        const existing = videoMap.get(id);
        // Check if same URL (strip potential blob prefix if needed, but simple comparison usually works)
        if (existing?.src === url) return;
    }

    return new Promise<void>((resolve) => {
        const vid = document.createElement('video');
        vid.crossOrigin = "anonymous";
        vid.muted = true;
        vid.playsInline = true;
        vid.preload = "auto";
        let resolved = false;
        const safeResolve = () => { if (!resolved) { resolved = true; videoMap.set(id, vid); resolve(); } };
        vid.oncanplay = () => { if (!resolved) { vid.currentTime = 0.001; } };
        vid.onseeked = () => safeResolve();
        vid.onerror = () => { console.warn("Failed to load background video:", url); safeResolve(); };
        // Increase timeout for highres videos
        setTimeout(() => safeResolve(), 10000);
        vid.src = url;
        vid.load();
    });
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
        startTimeOffset = 0,
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
    const baseBitrate = options.resolution === '1080p' ? 8_000_000 : 4_000_000;
    const qualityMult = quality === 'high' ? 1.5 : quality === 'low' ? 0.5 : 1.0;
    const bitrate = baseBitrate * qualityMult;

    const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => {
            console.error("VideoEncoder error:", e);
            onLog?.(`VideoEncoder error: ${e.message}`);
        }
    });

    videoEncoder.configure({
        codec: 'avc1.4d002a',
        width: canvas.width,
        height: canvas.height,
        bitrate: bitrate,
        framerate: fps,
    });

    // 4. Setup Audio Encoder
    const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (e) => {
            console.error("AudioEncoder error:", e);
            onLog?.(`AudioEncoder error: ${e.message}`);
        }
    });

    audioEncoder.configure({
        codec: 'mp4a.40.2',
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        bitrate: 128_000
    });

    // 5. Encode Audio
    onProgress(5, 'Encoding Audio...');
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const samplesPerChunk = sampleRate;
    const totalSamples = audioBuffer.length;

    for (let i = 0; i < totalSamples; i += samplesPerChunk) {
        if (checkAborted()) throw new Error('Render aborted');

        const length = Math.min(samplesPerChunk, totalSamples - i);
        const timestamp = Math.round((i / sampleRate) * 1_000_000);

        const dataBuffer = new Float32Array(length * numberOfChannels);
        for (let ch = 0; ch < numberOfChannels; ch++) {
            const channelData = audioBuffer.getChannelData(ch);
            dataBuffer.set(channelData.subarray(i, i + length), ch * length);
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

        while (audioEncoder.encodeQueueSize > 10) {
            await new Promise(r => setTimeout(r, 10));
        }
    }

    await audioEncoder.flush();

    // 6. Encode Video
    onProgress(10, 'Rendering Frames...');
    const ctx = canvas.getContext('2d', { desynchronized: false });
    if (!ctx) throw new Error('No canvas context');

    const frameDurationMicro = (1 / fps) * 1_000_000;

    for (let frame = 0; frame < totalFrames; frame++) {
        if (checkAborted()) throw new Error('Render aborted');

        const time = frame / fps;
        const globalTime = time + startTimeOffset;
        await syncVideoElements(videoMap, visualSlides, time, globalTime);

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

        const timestamp = Math.round(frame * frameDurationMicro);
        const videoFrame = new VideoFrame(canvas, {
            timestamp: timestamp,
            duration: Math.round(frameDurationMicro)
        });

        videoEncoder.encode(videoFrame, { keyFrame: frame % (fps * 2) === 0 });
        videoFrame.close();

        const percent = 10 + ((frame / totalFrames) * 89);
        onProgress(percent, `Rendering frame ${frame}/${totalFrames}`);

        if (videoEncoder.encodeQueueSize > 5) {
            await new Promise(r => {
                const check = () => videoEncoder.encodeQueueSize <= 2 ? r(null) : setTimeout(check, 10);
                check();
            });
        }
        if (frame % 2 === 0) await new Promise(r => setTimeout(r, 0));
    }

    onProgress(99, 'Finalizing frames...');
    await videoEncoder.flush();
    muxer.finalize();

    const { buffer } = muxer.target as ArrayBufferTarget;
    onProgress(100, 'Done!');

    return {
        blob: new Blob([buffer], { type: 'video/mp4' }),
        duration,
        format: 'mp4'
    };
}

/**
 * Render multiple tracks (playlist) using WebCodecs into a single video
 */
export async function renderPlaylistWithWebCodecs(
    tracks: Array<{
        audioFile: File | Blob;
        lyrics: LyricLine[];
        metadata: AudioMetadata;
    }>,
    options: Omit<WebCodecsRenderOptions, 'audioFile' | 'lyrics' | 'metadata' | 'isFirstSong' | 'isLastSong'>
): Promise<WebCodecsRenderResult> {
    const {
        canvas,
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
        abortSignal
    } = options;

    if (!isWebCodecsSupported()) {
        throw new Error("WebCodecs API is not supported in this browser.");
    }

    const checkAborted = () => {
        return (abortSignal?.aborted === true) || (abortSignal?.current === true);
    };

    onProgress(0, 'Decoding first track...');

    // 1. Decode first track's audio to get consistent sample rate and channels
    const firstAudioBuffer = await decodeAudio(tracks[0].audioFile);
    const sampleRate = firstAudioBuffer.sampleRate;
    const numberOfChannels = firstAudioBuffer.numberOfChannels;

    onProgress(2, 'Initializing WebCodecs Playlist Render...');

    // 2. Setup Muxer (Once for the entire playlist)
    const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: {
            codec: 'avc',
            width: canvas.width,
            height: canvas.height
        },
        audio: {
            codec: 'aac',
            sampleRate: sampleRate,
            numberOfChannels: numberOfChannels
        },
        fastStart: 'in-memory'
    });

    // 3. Setup Encoders
    const baseBitrate = options.resolution === '1080p' ? 8_000_000 : 4_000_000;
    const qualityMult = quality === 'high' ? 1.5 : quality === 'low' ? 0.5 : 1.0;
    const bitrate = baseBitrate * qualityMult;

    const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => {
            console.error("VideoEncoder error:", e);
            onLog?.(`VideoEncoder error: ${e.message}`);
        }
    });

    videoEncoder.configure({
        codec: 'avc1.4d002a',
        width: canvas.width,
        height: canvas.height,
        bitrate: bitrate,
        framerate: fps
    });

    const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (e) => {
            console.error("AudioEncoder error:", e);
            onLog?.(`AudioEncoder error: ${e.message}`);
        }
    });

    audioEncoder.configure({
        codec: 'mp4a.40.2',
        sampleRate: sampleRate,
        numberOfChannels: numberOfChannels,
        bitrate: 128_000
    });

    let currentTimeMicro = 0;
    let totalPlaylistDuration = 0;

    // 4. Process each track
    for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        const isFirst = i === 0;
        const isLast = i === tracks.length - 1;

        if (checkAborted()) throw new Error('Render aborted');

        onProgress((i / tracks.length) * 100, `Processing track ${i + 1}/${tracks.length}: ${track.metadata.title}`);

        // 0. Update track-specific backgrounds (Cover Art / Video Background)
        if (track.metadata.coverUrl) {
            if (track.metadata.backgroundType === 'video') {
                onLog?.(`Loading track ${i + 1} video background...`);
                await loadVidIntoMap('background', track.metadata.coverUrl, videoMap);
            } else {
                onLog?.(`Loading track ${i + 1} cover art...`);
                await loadImgIntoMap('cover', track.metadata.coverUrl, imageMap);
            }
        }

        // A. Decode Audio
        onLog?.(`Decoding track ${i + 1} audio...`);
        const audioBuffer = i === 0 ? firstAudioBuffer : await decodeAudio(track.audioFile);
        const duration = audioBuffer.duration;
        totalPlaylistDuration += duration;

        // B. Encode Audio for this track
        const currentSamples = audioBuffer.length;
        const currentChannels = audioBuffer.numberOfChannels;
        const currentSampleRate = audioBuffer.sampleRate;

        if (currentSampleRate !== sampleRate || currentChannels !== numberOfChannels) {
            onLog?.(`Warning: Track ${i + 1} has different audio properties (${currentSampleRate}Hz, ${currentChannels}ch). Expected ${sampleRate}Hz, ${numberOfChannels}ch.`);
        }

        const samplesPerChunk = currentSampleRate;
        for (let s = 0; s < currentSamples; s += samplesPerChunk) {
            if (checkAborted()) throw new Error('Render aborted');

            if (audioEncoder.state === 'closed') {
                throw new Error("AudioEncoder closed unexpectedly.");
            }

            const length = Math.min(samplesPerChunk, currentSamples - s);
            const timestamp = currentTimeMicro + Math.round((s / currentSampleRate) * 1_000_000);

            const dataBuffer = new Float32Array(length * currentChannels);
            for (let ch = 0; ch < currentChannels; ch++) {
                const channelData = audioBuffer.getChannelData(ch);
                dataBuffer.set(channelData.subarray(s, s + length), ch * length);
            }

            const audioData = new AudioData({
                format: 'f32-planar',
                sampleRate: currentSampleRate,
                numberOfFrames: length,
                numberOfChannels: currentChannels,
                timestamp: timestamp,
                data: dataBuffer
            });
            audioEncoder.encode(audioData);
            audioData.close();

            if (audioEncoder.encodeQueueSize > 10) await new Promise(r => setTimeout(r, 10));
        }

        // C. Encode Video Frames for this track
        const totalFrames = Math.ceil(duration * fps);
        const frameDurationMicro = (1 / fps) * 1_000_000;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No canvas context');

        for (let frame = 0; frame < totalFrames; frame++) {
            if (checkAborted()) throw new Error('Render aborted');

            if (videoEncoder.state === 'closed') {
                throw new Error("VideoEncoder closed unexpectedly.");
            }

            const time = frame / fps;
            const globalTime = (totalPlaylistDuration - duration) + time; // Previous duration + current frame time
            await syncVideoElements(videoMap, visualSlides, time, globalTime);

            drawCanvasFrame(
                ctx,
                canvas.width,
                canvas.height,
                time,
                track.lyrics,
                track.metadata,
                visualSlides,
                imageMap,
                videoMap,
                preset,
                customFontName,
                renderConfig.fontSizeScale,
                renderConfig.backgroundBlurStrength > 0,
                duration,
                renderConfig,
                isLast,
                isFirst
            );

            const timestamp = currentTimeMicro + Math.round(frame * frameDurationMicro);
            const videoFrame = new VideoFrame(canvas, {
                timestamp: timestamp,
                duration: Math.round(frameDurationMicro)
            });

            videoEncoder.encode(videoFrame, { keyFrame: frame % (fps * 2) === 0 });
            videoFrame.close();

            const trackProgress = (frame / totalFrames);
            const overallProgress = ((i + trackProgress) / tracks.length) * 100;
            onProgress(overallProgress, `Song ${i + 1}/${tracks.length}: Rendering frame ${frame}/${totalFrames}`);

            if (videoEncoder.encodeQueueSize > 5) {
                await new Promise(r => {
                    const chk = () => videoEncoder.encodeQueueSize <= 2 ? r(null) : setTimeout(chk, 10);
                    chk();
                });
            }
            if (frame % 5 === 0) await new Promise(r => setTimeout(r, 0));
        }

        currentTimeMicro += Math.round(duration * 1_000_000);
    }

    onProgress(99, 'Flushing encoders...');
    if (audioEncoder.state !== 'closed') await audioEncoder.flush();
    if (videoEncoder.state !== 'closed') await videoEncoder.flush();
    muxer.finalize();

    const { buffer } = muxer.target as ArrayBufferTarget;
    onProgress(100, 'Done!');

    return {
        blob: new Blob([buffer], { type: 'video/mp4' }),
        duration: totalPlaylistDuration,
        format: 'mp4'
    };
}

/**
 * Get supported WebCodecs formats
 */
export function getWebCodecsFormats() {
    return [
        { label: 'MP4 (H.264 + AAC)', value: 'mp4' }
    ];
}
