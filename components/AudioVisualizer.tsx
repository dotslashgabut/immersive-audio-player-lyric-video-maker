import React, { useRef, useEffect } from 'react';
import { RenderConfig } from '../types';
import { drawVisualization, getVizParams } from '../utils/visualizationRenderer';
import { getSharedAudioContext, getOrCreateMediaElementSource } from '../utils/audioContext';

interface AudioVisualizerProps {
    audioElement: HTMLAudioElement | null;
    config: RenderConfig;
    isPlaying: boolean;
}

// Persistent analyser across re-renders
let analyserNode: AnalyserNode | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
let connectedElement: HTMLAudioElement | null = null;

// Pre-allocated typed arrays (avoid GC pressure)
let freqBuffer: Uint8Array<ArrayBuffer> | null = null;
let waveBuffer: Uint8Array<ArrayBuffer> | null = null;

/**
 * Disconnects the visualizer from the audio element.
 * Call this before rendering/exporting to avoid AudioContext conflicts.
 */
export function disconnectVisualizerAudio() {
    try {
        if (sourceNode) {
            sourceNode.disconnect();
            // Do NOT null out sourceNode or audioCtx because they are shared system-wide.
            // Just disconnect from analyser map to prevent overlapping routing
        }
        if (analyserNode) {
            analyserNode.disconnect();
            analyserNode = null;
        }
        connectedElement = null;
        freqBuffer = null;
        waveBuffer = null;
    } catch (e) {
        console.warn('AudioVisualizer: disconnect failed', e);
    }
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioElement, config, isPlaying }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);
    const lastDrawRef = useRef<number>(0);

    // Connect audio element to Web Audio API analyser
    useEffect(() => {
        if (!audioElement) return;

        const audioCtx = getSharedAudioContext();
        // If already connected to this element, skip
        if (connectedElement === audioElement && analyserNode) return;

        try {
            // Create new analyser
            analyserNode = audioCtx.createAnalyser();
            analyserNode.fftSize = 512;
            analyserNode.smoothingTimeConstant = 0.8;

            // Use the shared media element source creator
            if (connectedElement !== audioElement) {
                sourceNode = getOrCreateMediaElementSource(audioElement, audioCtx);
            }

            if (sourceNode) {
                sourceNode.disconnect(); // Disconnect anything old first safely
                sourceNode.connect(analyserNode);
                analyserNode.connect(audioCtx.destination);
            }

            // Pre-allocate buffers
            const bufLen = analyserNode.frequencyBinCount;
            freqBuffer = new Uint8Array(bufLen);
            waveBuffer = new Uint8Array(bufLen);

            connectedElement = audioElement;
        } catch (err) {
            console.warn('AudioVisualizer: Failed to connect audio context', err);
        }

        return () => {
            // Don't disconnect on unmount - keep the audio chain alive
        };
    }, [audioElement]);

    // Resume audio context on play
    useEffect(() => {
        const audioCtx = getSharedAudioContext();
        if (isPlaying && audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }, [isPlaying]);

    // Main draw loop — only runs when playing & visible
    useEffect(() => {
        if (!config.showVisualization) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let running = true;

        const draw = (timestamp: number) => {
            if (!running) return;
            animFrameRef.current = requestAnimationFrame(draw);

            // Throttle to ~30fps (33ms interval)
            if (timestamp - lastDrawRef.current < 33) return;
            lastDrawRef.current = timestamp;

            // Resize canvas only when size changes
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x
            const newW = Math.round(rect.width * dpr);
            const newH = Math.round(rect.height * dpr);

            if (canvas.width !== newW || canvas.height !== newH) {
                canvas.width = newW;
                canvas.height = newH;
            }

            // Use logical dimensions for drawing
            const W = rect.width;
            const H = rect.height;

            // Scale context to DPR
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, W, H);

            if (!analyserNode || !freqBuffer || !waveBuffer) return;

            // Read frequency data into pre-allocated buffers
            analyserNode.getByteFrequencyData(freqBuffer);

            const params = getVizParams(config);

            // Only get waveform data for types that need it
            const needsWave = params.type === 'wave' || params.type === 'pulse-ring';
            if (needsWave) {
                analyserNode.getByteTimeDomainData(waveBuffer);
            }

            // Delegate to shared renderer
            drawVisualization(
                ctx,
                freqBuffer,
                needsWave ? waveBuffer : null,
                W,
                H,
                params,
                timestamp
            );
        };

        animFrameRef.current = requestAnimationFrame(draw);

        return () => {
            running = false;
            cancelAnimationFrame(animFrameRef.current);
        };
    }, [
        config.showVisualization,
        config.visualizationType,
        config.visualizationColorMode,
        config.visualizationColor1,
        config.visualizationColor2,
        config.visualizationOpacity,
        config.visualizationPosition,
        config.visualizationSensitivity,
        config.visualizationBarCount,
    ]);

    if (!config.showVisualization) return null;

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-[5]"
        />
    );
};

export default AudioVisualizer;
