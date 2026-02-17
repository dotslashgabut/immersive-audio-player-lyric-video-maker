/**
 * Shared Audio Visualization Renderer
 * 
 * This module provides visualization drawing functions that work with both:
 * 1. Real-time Web Audio API (live web view)
 * 2. Offline audio buffer analysis (FFmpeg/WebCodecs export)
 * 
 * Performance-optimized: No shadowBlur, minimal allocations, throttle-ready.
 */

import { RenderConfig } from '../types';

// Broad Uint8Array type for compatibility with Web Audio API (returns Uint8Array<ArrayBufferLike>)
type AnyUint8Array = Uint8Array<ArrayBufferLike>;

// --- Color Utility ---
function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [
        parseInt(h.substring(0, 2), 16) || 0,
        parseInt(h.substring(2, 4), 16) || 0,
        parseInt(h.substring(4, 6), 16) || 0,
    ];
}

export function getVisualizationColor(
    index: number,
    total: number,
    intensity: number,
    colorMode: string,
    color1: string,
    color2: string,
    opacity: number,
    time: number
): string {
    const t = total > 1 ? index / (total - 1) : 0;

    switch (colorMode) {
        case 'rainbow': {
            const hue = (t * 360 + time * 0.05) % 360;
            return `hsla(${hue}, 80%, ${55 + intensity * 15}%, ${opacity})`;
        }
        case 'accent':
            return `hsla(270, 80%, ${50 + intensity * 20}%, ${opacity})`;
        case 'custom': {
            const [r1, g1, b1] = hexToRgb(color1);
            const [r2, g2, b2] = hexToRgb(color2);
            const r = Math.round(r1 + (r2 - r1) * t);
            const g = Math.round(g1 + (g2 - g1) * t);
            const b = Math.round(b1 + (b2 - b1) * t);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
        case 'gradient':
        default: {
            const hue = 260 + t * 60;
            const lightness = 50 + intensity * 15;
            return `hsla(${hue}, 75%, ${lightness}%, ${opacity})`;
        }
    }
}

// --- Visualization Config Helper ---
export interface VizParams {
    type: string;
    colorMode: string;
    color1: string;
    color2: string;
    opacity: number;
    position: string;
    sensitivity: number;
    barCount: number;
}

export function getVizParams(config: RenderConfig): VizParams {
    return {
        type: config.visualizationType || 'bars',
        colorMode: config.visualizationColorMode || 'gradient',
        color1: config.visualizationColor1 || '#a855f7',
        color2: config.visualizationColor2 || '#6366f1',
        opacity: config.visualizationOpacity ?? 0.6,
        position: config.visualizationPosition || 'bottom',
        sensitivity: config.visualizationSensitivity ?? 1.5,
        barCount: config.visualizationBarCount ?? 48,
    };
}

// --- Main Draw Entry ---
export function drawVisualization(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    frequencyData: AnyUint8Array,
    waveformData: AnyUint8Array | null,
    W: number,
    H: number,
    params: VizParams,
    time: number // ms timestamp for animation phase
) {
    const { type, sensitivity, barCount } = params;
    const avg = computeAverage(frequencyData);
    const normalizedAvg = avg / 255;

    ctx.save();

    // Apply position clipping
    const region = getPositionRegion(params.position, W, H);
    ctx.beginPath();
    ctx.rect(region.x, region.y, region.w, region.h);
    ctx.clip();

    switch (type) {
        case 'bars':
            drawBars(ctx, frequencyData, region, params, time);
            break;
        case 'wave':
            drawWave(ctx, waveformData || frequencyData, region, params, time);
            break;
        case 'circular':
            drawCircular(ctx, frequencyData, region, params, time, normalizedAvg);
            break;
        case 'particles':
            drawParticlesStatic(ctx, frequencyData, region, params, time, normalizedAvg);
            break;
        case 'pulse-ring':
            drawPulseRing(ctx, frequencyData, waveformData, region, params, time, normalizedAvg);
            break;
    }

    ctx.restore();
}

function computeAverage(data: AnyUint8Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    return sum / data.length;
}

interface Region {
    x: number;
    y: number;
    w: number;
    h: number;
}

function getPositionRegion(position: string, W: number, H: number): Region {
    switch (position) {
        case 'top': return { x: 0, y: 0, w: W, h: H * 0.4 };
        case 'center': return { x: 0, y: H * 0.2, w: W, h: H * 0.6 };
        case 'full': return { x: 0, y: 0, w: W, h: H };
        case 'bottom':
        default: return { x: 0, y: H * 0.6, w: W, h: H * 0.4 };
    }
}

function colorFor(params: VizParams, index: number, total: number, intensity: number, time: number): string {
    return getVisualizationColor(index, total, intensity, params.colorMode, params.color1, params.color2, params.opacity, time);
}

// ========================
// BARS
// ========================
function drawBars(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    data: AnyUint8Array,
    region: Region,
    params: VizParams,
    time: number
) {
    const count = Math.min(params.barCount, data.length);
    const gap = 2;
    const barWidth = Math.max(1, (region.w - gap * count) / count);
    const maxHeight = region.h * 0.9;
    const isTop = params.position === 'top';
    const isCenter = params.position === 'center';

    for (let i = 0; i < count; i++) {
        const dataIndex = Math.floor(i * (data.length / count));
        const value = Math.min(1, (data[dataIndex] / 255) * params.sensitivity);
        const barH = Math.max(1, value * maxHeight);

        const x = region.x + i * (barWidth + gap);
        ctx.fillStyle = colorFor(params, i, count, value, time);

        if (isTop) {
            ctx.fillRect(x, region.y, barWidth, barH);
        } else if (isCenter) {
            ctx.fillRect(x, region.y + (region.h - barH) / 2, barWidth, barH);
        } else {
            ctx.fillRect(x, region.y + region.h - barH, barWidth, barH);
        }
    }
}

// ========================
// WAVE
// ========================
function drawWave(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    data: AnyUint8Array,
    region: Region,
    params: VizParams,
    time: number
) {
    const yCenter = region.y + region.h / 2;
    const amplitude = region.h * 0.4 * params.sensitivity;
    const sliceWidth = region.w / data.length;

    // Main wave
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = colorFor(params, 0, 1, 0.5, time);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128.0;
        const y = yCenter + (v - 1.0) * amplitude;
        if (i === 0) ctx.moveTo(region.x, y);
        else ctx.lineTo(region.x + i * sliceWidth, y);
    }
    ctx.stroke();

    // Secondary thinner wave for depth
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = colorFor(params, 0.5, 1, 0.8, time);
    ctx.globalAlpha = 0.4 * params.opacity;

    for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128.0;
        const y = yCenter + (v - 1.0) * amplitude * 0.6 + 3;
        if (i === 0) ctx.moveTo(region.x, y);
        else ctx.lineTo(region.x + i * sliceWidth, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
}

// ========================
// CIRCULAR
// ========================
function drawCircular(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    data: AnyUint8Array,
    region: Region,
    params: VizParams,
    time: number,
    avg: number
) {
    const centerX = region.x + region.w / 2;
    const centerY = region.y + region.h / 2;
    const baseRadius = Math.min(region.w, region.h) * 0.15;
    const maxBarLen = Math.min(region.w, region.h) * 0.3;
    const count = Math.min(params.barCount, data.length);

    // Inner circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius * (1 + avg * 0.2 * params.sensitivity), 0, Math.PI * 2);
    ctx.strokeStyle = colorFor(params, 0, count, avg, time);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Radial bars
    for (let i = 0; i < count; i++) {
        const dataIndex = Math.floor(i * (data.length / count));
        const value = Math.min(1, (data[dataIndex] / 255) * params.sensitivity);
        const barLen = Math.max(2, value * maxBarLen);
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;

        const x1 = centerX + Math.cos(angle) * (baseRadius + 4);
        const y1 = centerY + Math.sin(angle) * (baseRadius + 4);
        const x2 = centerX + Math.cos(angle) * (baseRadius + 4 + barLen);
        const y2 = centerY + Math.sin(angle) * (baseRadius + 4 + barLen);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = Math.max(1.5, (region.w / count) * 0.4);
        ctx.strokeStyle = colorFor(params, i, count, value, time);
        ctx.lineCap = 'round';
        ctx.stroke();
    }
}

// ========================
// PARTICLES (deterministic for export, seeded by time)
// ========================
function drawParticlesStatic(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    data: AnyUint8Array,
    region: Region,
    params: VizParams,
    time: number,
    avg: number
) {
    const timeSec = time * 0.001;
    const isBottom = params.position === 'bottom' || params.position === 'full';
    const isTop = params.position === 'top';

    // Compute sub-band energies for more reactive particles
    const binCount = data.length;
    let bassEnergy = 0, midEnergy = 0, highEnergy = 0;
    const bassEnd = Math.floor(binCount * 0.15);
    const midEnd = Math.floor(binCount * 0.5);
    for (let i = 0; i < binCount; i++) {
        const v = data[i] / 255;
        if (i < bassEnd) bassEnergy += v;
        else if (i < midEnd) midEnergy += v;
        else highEnergy += v;
    }
    bassEnergy = (bassEnergy / bassEnd) * params.sensitivity;
    midEnergy = (midEnergy / (midEnd - bassEnd)) * params.sensitivity;
    highEnergy = (highEnergy / (binCount - midEnd)) * params.sensitivity;

    // Simple deterministic pseudo-random from seed
    const rand = (seed: number) => {
        const x = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453;
        return x - Math.floor(x);
    };

    // --- LAYER 1: Rising embers (bass-reactive) ---
    const emberCount = Math.min(80, Math.floor(bassEnergy * 40 + 10));
    for (let i = 0; i < emberCount; i++) {
        const r0 = rand(i * 13.37);
        const r1 = rand(i * 7.91 + 0.5);
        const r2 = rand(i * 3.14 + 0.7);
        const speed = 0.15 + r2 * 0.35; // varied speeds
        const lifePhase = (timeSec * speed + r1) % 1;

        // Horizontal position with wobble
        const wobble = Math.sin(timeSec * (1.5 + r0 * 2) + i * 0.8) * region.w * 0.04;
        const x = region.x + r0 * region.w + wobble;

        // Vertical: rise from bottom (or fall from top)
        let y: number;
        if (isTop) {
            y = region.y + lifePhase * region.h;
        } else {
            y = region.y + region.h - lifePhase * region.h;
        }

        // Size: larger at birth, smaller as they age; bass makes them bigger
        const baseSize = 1 + r2 * 2;
        const size = baseSize * (1 - lifePhase * 0.7) * (1 + bassEnergy * 0.5);

        // Fade: smooth cubic fade in/out
        const fadeIn = Math.min(1, lifePhase * 5);
        const fadeOut = 1 - lifePhase * lifePhase;
        const alpha = fadeIn * fadeOut * params.opacity * 0.7;

        if (alpha < 0.03 || size < 0.3) continue;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = colorFor(params, r0, 1, 1 - lifePhase * 0.5, time);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // --- LAYER 2: Frequency burst particles (mid-reactive) ---
    const burstCount = Math.min(40, Math.floor(midEnergy * 20 + 5));
    for (let i = 0; i < burstCount; i++) {
        const r0 = rand(i * 23.17 + 100);
        const r1 = rand(i * 11.3 + 100.5);
        const r2 = rand(i * 5.7 + 100.9);

        // Each burst particle maps to a frequency bin
        const freqIdx = Math.floor(r0 * data.length);
        const freqVal = (data[freqIdx] / 255) * params.sensitivity;
        if (freqVal < 0.15) continue;

        // Spawn from center of region, burst outward
        const angle = r1 * Math.PI * 2;
        const burstPhase = (timeSec * (0.3 + r2 * 0.4) + r0) % 1;
        const distance = burstPhase * region.h * 0.5 * freqVal;

        const centerX = region.x + region.w * 0.5;
        const centerY = region.y + region.h * 0.5;
        const x = centerX + Math.cos(angle) * distance + Math.sin(timeSec * 2 + i) * 10;
        const y = centerY + Math.sin(angle) * distance;

        // Skip if out of region
        if (x < region.x || x > region.x + region.w || y < region.y || y > region.y + region.h) continue;

        const size = (1 + freqVal * 3) * (1 - burstPhase * 0.6);
        const alpha = (1 - burstPhase) * freqVal * params.opacity * 0.6;

        if (alpha < 0.03) continue;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = colorFor(params, freqIdx / data.length, 1, freqVal, time);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // --- LAYER 3: Floating ambient orbs (high-reactive, larger, slower) ---
    const orbCount = Math.min(15, Math.floor(highEnergy * 8 + 3));
    for (let i = 0; i < orbCount; i++) {
        const r0 = rand(i * 31.1 + 200);
        const r1 = rand(i * 17.3 + 200.5);
        const r2 = rand(i * 9.7 + 200.9);

        const driftX = Math.sin(timeSec * (0.3 + r0 * 0.5) + i * 2.1) * region.w * 0.3;
        const driftY = Math.cos(timeSec * (0.2 + r1 * 0.3) + i * 1.7) * region.h * 0.2;

        const x = region.x + r0 * region.w + driftX;
        const y = region.y + r1 * region.h + driftY;

        // Skip if out of region
        if (x < region.x || x > region.x + region.w || y < region.y || y > region.y + region.h) continue;

        const pulse = 1 + Math.sin(timeSec * 3 + r2 * 10) * 0.3 * highEnergy;
        const size = (3 + r2 * 5) * pulse;
        const alpha = 0.08 + highEnergy * 0.15;

        ctx.globalAlpha = alpha * params.opacity;
        // Radial gradient for soft glow effect
        const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
        const baseColor = colorFor(params, r0, 1, 0.7, time);
        grad.addColorStop(0, baseColor);
        grad.addColorStop(0.5, baseColor.replace(/[\d.]+\)$/, `${0.3})`));
        grad.addColorStop(1, baseColor.replace(/[\d.]+\)$/, '0)'));
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // --- LAYER 4: Bass shockwave ring ---
    if (bassEnergy > 0.5) {
        const ringPhase = (timeSec * 0.8) % 1;
        const ringRadius = ringPhase * Math.min(region.w, region.h) * 0.45;
        const ringAlpha = (1 - ringPhase) * (bassEnergy - 0.5) * params.opacity * 0.5;

        if (ringAlpha > 0.03) {
            const cx = region.x + region.w / 2;
            const cy = region.y + region.h / 2;

            ctx.globalAlpha = ringAlpha;
            ctx.beginPath();
            ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = colorFor(params, 0, 1, bassEnergy, time);
            ctx.lineWidth = 2 + (1 - ringPhase) * 3;
            ctx.stroke();
        }
    }

    ctx.globalAlpha = 1;
}

// ========================
// PULSE RING
// ========================
function drawPulseRing(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    data: AnyUint8Array,
    waveData: AnyUint8Array | null,
    region: Region,
    params: VizParams,
    time: number,
    avg: number
) {
    const centerX = region.x + region.w / 2;
    const centerY = region.y + region.h / 2;
    const maxRadius = Math.min(region.w, region.h) * 0.4;

    // Concentric pulse rings
    const ringCount = 3;
    const timeSec = time * 0.001;

    for (let r = 0; r < ringCount; r++) {
        const phase = (timeSec * 0.5 + r * 0.3) % 1;
        const radius = maxRadius * (0.3 + phase * 0.7) * (1 + avg * params.sensitivity * 0.3);
        const ringOpacity = (1 - phase) * params.opacity * 0.5;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = colorFor(params, r / ringCount, ringCount, avg, time);
        ctx.lineWidth = 2 + avg * 3;
        ctx.globalAlpha = ringOpacity;
        ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Waveform ring
    if (waveData) {
        const waveRadius = maxRadius * 0.35 * (1 + avg * params.sensitivity * 0.2);
        const count = Math.min(params.barCount, waveData.length);

        ctx.beginPath();
        for (let i = 0; i <= count; i++) {
            const idx = Math.floor(i * (waveData.length / count));
            const v = (waveData[idx] / 128.0 - 1.0) * params.sensitivity;
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
            const rad = waveRadius + v * maxRadius * 0.15;
            const x = centerX + Math.cos(angle) * rad;
            const y = centerY + Math.sin(angle) * rad;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = colorFor(params, 0, 1, avg, time);
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// ========================
// OFFLINE AUDIO ANALYSIS (for FFmpeg/export)
// ========================

/**
 * Decode an audio file into an AudioBuffer for offline analysis.
 */
export async function decodeAudioForVisualization(audioFile: File | Blob): Promise<Float32Array> {
    const audioCtx = new OfflineAudioContext(1, 44100, 44100); // Dummy context just for decoding
    const arrayBuffer = await audioFile.arrayBuffer();

    // Use a real AudioContext to decode (OfflineAudioContext.decodeAudioData may have issues in some browsers)
    const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
    tempCtx.close();

    // Mix down to mono
    const channelData = audioBuffer.getChannelData(0);

    // Return the raw PCM samples
    return channelData;
}

/**
 * Compute frequency data from raw PCM samples at a specific time.
 * Returns a Uint8Array similar to AnalyserNode.getByteFrequencyData().
 */
export function computeFrequencyDataAtTime(
    pcmData: Float32Array,
    sampleRate: number,
    time: number,
    fftSize: number = 512
): { frequencyData: Uint8Array; waveformData: Uint8Array } {
    const startSample = Math.floor(time * sampleRate);
    const windowSize = fftSize;

    const frequencyData = new Uint8Array(windowSize / 2);
    const waveformData = new Uint8Array(windowSize);

    // Extract windowed samples
    const samples = new Float32Array(windowSize);
    for (let i = 0; i < windowSize; i++) {
        const idx = startSample + i;
        if (idx >= 0 && idx < pcmData.length) {
            // Apply Hann window
            const windowVal = 0.5 * (1 - Math.cos(2 * Math.PI * i / (windowSize - 1)));
            samples[i] = pcmData[idx] * windowVal;
        }
    }

    // Waveform data (0-255, centered at 128)
    for (let i = 0; i < windowSize; i++) {
        const idx = startSample + i;
        const val = (idx >= 0 && idx < pcmData.length) ? pcmData[idx] : 0;
        waveformData[i] = Math.max(0, Math.min(255, Math.round((val + 1) * 128)));
    }

    // Simple DFT for frequency magnitudes (not full FFT but good enough for visualization)
    const halfSize = windowSize / 2;
    for (let k = 0; k < halfSize; k++) {
        let real = 0;
        let imag = 0;
        for (let n = 0; n < windowSize; n++) {
            const angle = (2 * Math.PI * k * n) / windowSize;
            real += samples[n] * Math.cos(angle);
            imag -= samples[n] * Math.sin(angle);
        }
        const magnitude = Math.sqrt(real * real + imag * imag) / windowSize;
        // Convert to dB-like scale (0-255) similar to AnalyserNode
        const db = 20 * Math.log10(Math.max(magnitude, 1e-10));
        // Map from roughly -100dB..0dB to 0..255
        const normalized = Math.max(0, Math.min(255, Math.round((db + 80) * 255 / 80)));
        frequencyData[k] = normalized;
    }

    return { frequencyData, waveformData };
}
