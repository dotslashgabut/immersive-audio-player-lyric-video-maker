import React, { useEffect, useRef } from 'react';
import { RenderConfig } from '../types';
import { renderThreeFrame, disposeThreeScene } from '../utils/threeRenderer';

interface ThreeBackgroundProps {
    isPlaying: boolean;
    currentTime: number;
    config: RenderConfig;
}

const ThreeBackground: React.FC<ThreeBackgroundProps> = ({ isPlaying, currentTime, config }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    // Use refs for values consumed inside the RAF loop so React re-renders
    // don't restart the animation loop unnecessarily.
    const isPlayingRef = useRef(isPlaying);
    const currentTimeRef = useRef(currentTime);
    const configRef = useRef(config);

    // Keep refs in sync on every render without restarting the loop.
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
    useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
    useEffect(() => { configRef.current = config; }, [config]);

    // Animation loop – starts once, reads refs each frame.
    useEffect(() => {
        let reqId: number;
        let lastTimestamp = performance.now();
        let internalTime = currentTimeRef.current;

        const loop = (timestamp: number): void => {
            const dt = (timestamp - lastTimestamp) / 1000;
            lastTimestamp = timestamp;

            if (isPlayingRef.current) {
                internalTime += dt;
            } else {
                // Stay in sync with the player's seek position when paused.
                internalTime = currentTimeRef.current;
            }

            const container = containerRef.current;
            const w = container ? (container.clientWidth || 1280) : 1280;
            const h = container ? (container.clientHeight || 720) : 720;

            const canvas = renderThreeFrame(internalTime, w, h, configRef.current);
            if (canvas && container && canvasRef.current !== canvas) {
                container.innerHTML = '';
                container.appendChild(canvas);
                canvasRef.current = canvas;
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.objectFit = 'cover';
                canvas.style.display = 'block';
            }

            reqId = requestAnimationFrame(loop);
        };

        reqId = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(reqId);
            // Free GPU memory when the component unmounts.
            disposeThreeScene();
            canvasRef.current = null;
        };
    }, []); // intentionally empty – the loop runs for the lifetime of the component

    return <div ref={containerRef} className="absolute inset-0 pointer-events-none" />;
};

export default ThreeBackground;
