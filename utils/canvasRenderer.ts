import { LyricLine, VideoPreset, VisualSlide, AudioMetadata, RenderConfig } from '../types';

export const drawCanvasFrame = (
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    lyrics: LyricLine[],
    metadata: AudioMetadata,
    visualSlides: VisualSlide[],
    images: Map<string, ImageBitmap | HTMLImageElement>,
    videos: Map<string, ImageBitmap | HTMLVideoElement>,
    activePreset: VideoPreset,
    customFontName: string | null,
    fontSizeScale: number,
    isBlurEnabled: boolean,
    renderConfig?: RenderConfig
) => {
    // Helper: HEX to RGB
    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    };

    // Helper for wrapping text
    const getWrappedLines = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, text: string, maxWidth: number) => {
        if (text.includes('\n')) {
            return text.split('\n').flatMap(line => getWrappedLines(ctx, line, maxWidth));
        }

        const words = text.split(' ');
        let preLines: string[] = [];
        let currentLine = words[0] || '';

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const testLine = currentLine + " " + word;
            const width = ctx.measureText(testLine).width;
            if (width < maxWidth) {
                currentLine = testLine;
            } else {
                preLines.push(currentLine);
                currentLine = word;
            }
        }
        preLines.push(currentLine);

        const finalLines: string[] = [];
        for (const line of preLines) {
            if (ctx.measureText(line).width <= maxWidth) {
                finalLines.push(line);
            } else {
                let charLine = "";
                for (const char of line) {
                    if (ctx.measureText(charLine + char).width <= maxWidth) {
                        charLine += char;
                    } else {
                        if (charLine) finalLines.push(charLine);
                        charLine = char;
                    }
                }
                if (charLine) finalLines.push(charLine);
            }
        }
        return finalLines;
    };

    const drawLineWithEffects = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, text: string, x: number, y: number, effect?: string, decoration?: string) => {
        if (effect === 'vhs' && ctx instanceof CanvasRenderingContext2D) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = '#ff0000';
            ctx.fillText(text, x - 2, y);
            ctx.fillStyle = '#00ff00';
            ctx.fillText(text, x, y);
            ctx.fillStyle = '#0000ff';
            ctx.fillText(text, x + 2, y);
            ctx.restore();
        } else if (effect === '3d') {
            const color = ctx.fillStyle;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            for (let j = 1; j <= 4; j++) {
                ctx.fillText(text, x + j, y + j);
            }
            ctx.fillStyle = color;
            ctx.fillText(text, x, y);
        } else if (effect === 'neon') {
            const color = ctx.fillStyle;
            ctx.shadowColor = color as string;
            ctx.shadowBlur = 20;
            ctx.fillText(text, x, y);
            ctx.shadowBlur = 40;
            ctx.fillText(text, x, y);
        } else if (effect === 'outline') {
            ctx.strokeText(text, x, y);
            ctx.fillText(text, x, y);
        } else if (effect === 'gradient') {
            const grad = ctx.createLinearGradient(x, y - 20, x, y + 20);
            grad.addColorStop(0, ctx.fillStyle as string);
            grad.addColorStop(1, '#ffffff');
            ctx.fillStyle = grad;
            ctx.fillText(text, x, y);
        } else if (effect === 'fire') {
            ctx.save();
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#ff0000';
            ctx.fillStyle = '#ff4500';
            ctx.fillText(text, x, y);
            ctx.shadowBlur = 2;
            ctx.shadowColor = '#ffff00';
            ctx.fillStyle = '#ffcc00';
            ctx.fillText(text, x + 1, y - 1);
            ctx.restore();
        } else if (effect === 'emboss') {
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillText(text, x - 1, y - 1);
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillText(text, x + 1, y + 1);
            ctx.fillStyle = 'rgba(128,128,128,0.5)'; // Neutral fill
            ctx.fillText(text, x, y);
        } else if (effect === 'mirror') {
            ctx.fillText(text, x, y);
            ctx.save();
            // Assuming textBaseline is middle, simple reflection logic
            // Move 0,0 to x,y, scale, draw at 0,0
            ctx.translate(x, y);
            ctx.scale(1, -1);
            ctx.translate(-x, -y);
            ctx.globalAlpha *= 0.2;
            // Draw slightly offset 'below' which is 'above' in flipped space?
            // If we flip Y, positive Y goes up.
            // Original Y is y. We want to draw at y + height.
            // In flipped space, that is -(y + height).
            // Let's just use simple offset assuming baseline middle.
            const heightEstimate = 40; // rough estimate
            ctx.fillText(text, x, y - heightEstimate);
            ctx.restore();
        } else if (effect === 'neon-multi') {
            const color = ctx.fillStyle;
            ctx.shadowBlur = 10; ctx.shadowColor = '#fff'; ctx.fillText(text, x, y);
            ctx.shadowBlur = 20; ctx.shadowColor = '#ff00de'; ctx.fillText(text, x, y);
            ctx.shadowBlur = 35; ctx.shadowColor = '#00ffff'; ctx.fillText(text, x, y);
        } else if (effect === 'gold') {
            const grad = ctx.createLinearGradient(x, y - 20, x, y + 20);
            grad.addColorStop(0, '#d4af37'); grad.addColorStop(1, '#C5A028');
            ctx.fillStyle = grad;
            ctx.fillText(text, x, y);
        } else if (effect === 'chrome') {
            const grad = ctx.createLinearGradient(x, y - 20, x, y + 20);
            grad.addColorStop(0, '#ebebeb'); grad.addColorStop(0.5, '#616161'); grad.addColorStop(0.51, '#ebebeb'); grad.addColorStop(1, '#ebebeb');
            ctx.fillStyle = grad;
            ctx.fillText(text, x, y);
        } else if (effect === 'frozen') {
            ctx.shadowColor = '#03A9F4'; ctx.shadowBlur = 20; ctx.fillStyle = '#ffffff'; ctx.fillText(text, x, y);
        } else if (effect === 'rainbow') {
            const grad = ctx.createLinearGradient(x - 100, y, x + 100, y);
            grad.addColorStop(0, 'violet'); grad.addColorStop(0.16, 'indigo'); grad.addColorStop(0.32, 'blue'); grad.addColorStop(0.48, 'green'); grad.addColorStop(0.64, 'yellow'); grad.addColorStop(0.8, 'orange'); grad.addColorStop(1, 'red');
            ctx.fillStyle = grad; ctx.fillText(text, x, y);
        } else if (effect === 'retro') {
            ctx.fillStyle = '#ff00ff'; ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 4;
            ctx.fillText(text, x, y);
        } else if (effect === 'hologram') {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.7)'; ctx.shadowColor = 'rgba(0,255,255,0.5)'; ctx.shadowBlur = 10;
            ctx.fillText(text, x, y);
        } else if (effect === 'comic') {
            ctx.lineWidth = 3; ctx.strokeStyle = '#000000'; ctx.strokeText(text, x, y);
            ctx.fillStyle = '#ffcc00'; ctx.fillText(text, x, y);
        } else {
            ctx.fillText(text, x, y);
        }

        if (decoration && decoration !== 'none') {
            const m = ctx.measureText(text);
            const w = m.width;
            let xStart = x;
            if (ctx.textAlign === 'center') xStart = x - w / 2;
            else if (ctx.textAlign === 'right') xStart = x - w;

            ctx.save();
            ctx.beginPath();
            ctx.lineWidth = Math.max(2, 4 * scale);
            ctx.strokeStyle = ctx.fillStyle as string;

            if (decoration.includes('line-through')) {
                ctx.moveTo(xStart, y);
                ctx.lineTo(xStart + w, y);
            }
            if (decoration.includes('underline')) {
                // Estimate font size from context
                const fsMatch = ctx.font.match(/(\d+(\.\d+)?)px/);
                const fs = fsMatch ? parseFloat(fsMatch[1]) : 50;
                const lineY = y + fs * 0.4;
                ctx.moveTo(xStart, lineY);
                ctx.lineTo(xStart + w, lineY);
            }
            ctx.stroke();
            ctx.restore();
        }
    };

    const drawWrappedText = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, effect?: string, decoration?: string) => {
        const lines = getWrappedLines(ctx, text, maxWidth);
        const startY = y - ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((l, i) => {
            const lineY = startY + (i * lineHeight);
            if (effect === 'glass') {
                const textWidth = ctx.measureText(l).width;
                ctx.save();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.beginPath();
                ctx.roundRect(x - (ctx.textAlign === 'center' ? textWidth / 2 : ctx.textAlign === 'right' ? textWidth : 0) - 10, lineY - lineHeight / 2, textWidth + 20, lineHeight, 8);
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.stroke();
                ctx.restore();
            }
            drawLineWithEffects(ctx, l, x, lineY, effect, decoration);
        });
    };

    const sansFont = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    const serifFont = 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';
    const monoFont = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    const rockFont = '"Metal Mania", cursive';
    const kidsFont = '"Fredoka One", cursive';
    const sadFont = '"Shadows Into Light", cursive';
    const loveFont = '"Dancing Script", cursive';
    const techFont = '"Orbitron", sans-serif';
    const gothicFont = '"UnifrakturMaguntia", cursive';

    let fontFamily = sansFont;
    if (activePreset === 'classic') fontFamily = serifFont;
    else if (activePreset === 'monospace') fontFamily = monoFont;
    else if (activePreset === 'metal') fontFamily = rockFont;
    else if (activePreset === 'kids') fontFamily = kidsFont;
    else if (activePreset === 'sad') fontFamily = sadFont;
    else if (activePreset === 'romantic') fontFamily = loveFont;
    else if (activePreset === 'tech') fontFamily = techFont;
    else if (activePreset === 'gothic') fontFamily = gothicFont;
    else if (activePreset === 'custom') fontFamily = renderConfig?.fontFamily || sansFont;

    if (customFontName) fontFamily = `"${customFontName}", sans-serif`;
    if (renderConfig && renderConfig.fontFamily !== 'sans-serif') fontFamily = renderConfig.fontFamily;

    const isPortrait = width <= height;
    const scale = (Math.max(width, height) === 1080 || Math.max(width, height) === 1920) ? 1 : 0.666;

    ctx.fillStyle = renderConfig?.backgroundColor || '#000000';
    ctx.fillRect(0, 0, width, height);
    if (renderConfig?.backgroundSource === 'gradient' && renderConfig.backgroundGradient) {
        ctx.fillStyle = renderConfig.backgroundGradient;
        ctx.fillRect(0, 0, width, height);
    } else if (renderConfig?.backgroundSource === 'smart-gradient') {
        const baseColor = renderConfig.backgroundColor || '#312e81';
        const rgb = hexToRgb(baseColor);

        // Create immersive gradient (Top-Left -> Bottom-Right)
        // Color -> Darker -> Black
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, baseColor);
        grad.addColorStop(0.5, `rgb(${Math.floor(rgb.r * 0.6)}, ${Math.floor(rgb.g * 0.6)}, ${Math.floor(rgb.b * 0.6)})`);
        grad.addColorStop(1, '#000000');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    const drawScaled = (img: ImageBitmap | HTMLImageElement | HTMLVideoElement) => {
        let w = 0, h = 0;
        if (img instanceof ImageBitmap) { w = img.width; h = img.height; }
        else if (img instanceof HTMLVideoElement) { w = img.videoWidth; h = img.videoHeight; }
        else { w = img.width; h = img.height; }
        if (w && h) {
            const imgScale = Math.max(width / w, height / h);
            const x = (width / 2) - (w / 2) * imgScale;
            const y = (height / 2) - (h / 2) * imgScale;
            ctx.drawImage(img, x, y, w * imgScale, h * imgScale);
        }
    };

    if (isBlurEnabled) ctx.filter = 'blur(12px)';
    if (renderConfig ? (renderConfig.backgroundSource === 'timeline' || renderConfig.backgroundSource === 'custom') : true) {
        const currentSlide = visualSlides.find(s => s.type !== 'audio' && time >= s.startTime && time < s.endTime);
        const useTimeline = renderConfig ? renderConfig.backgroundSource === 'timeline' : true;
        if (useTimeline && currentSlide) {
            const vid = currentSlide.type === 'video' ? videos.get(currentSlide.id) : null;
            const img = currentSlide.type !== 'video' ? images.get(currentSlide.id) : null;
            if (vid) drawScaled(vid); else if (img) drawScaled(img);
        } else if (metadata.coverUrl) {
            const vid = metadata.backgroundType === 'video' ? videos.get('background') : null;
            const img = images.get('cover');
            if (vid) drawScaled(vid); else if (img) drawScaled(img);
        }
    }
    if (isBlurEnabled) ctx.filter = 'none';

    if (!['just_video', 'none'].includes(activePreset)) {
        ctx.fillStyle = (renderConfig && (renderConfig.backgroundSource === 'color' || renderConfig.backgroundSource === 'gradient')) ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, width, height);
    }

    if (activePreset === 'just_video' || activePreset === 'none') return;

    const activeIdx = lyrics.findIndex((line, index) => {
        if (line.endTime !== undefined) return time >= line.time && time < line.endTime;
        const nextLine = lyrics[index + 1];
        return time >= line.time && (!nextLine || time < nextLine.time);
    });

    // Find the next upcoming lyric for smoother scrolling during breaks
    let virtualActiveIdx = activeIdx;
    if (virtualActiveIdx === -1 && lyrics.length > 0) {
        if (time < lyrics[0].time) {
            virtualActiveIdx = 0;
        } else {
            const nextIdx = lyrics.findIndex(l => l.time > time);
            virtualActiveIdx = nextIdx !== -1 ? nextIdx : lyrics.length - 1;
        }
    }

    let showIntroTitle = (activeIdx === -1 && time < 5 && (renderConfig?.showIntro ?? true));

    let baseFontSize = (isPortrait ? 50 : 60) * scale;
    let secondaryFontSize = (isPortrait ? 25 : 30) * scale;
    let lineSpacing = (isPortrait ? 80 : 100) * scale;

    if (activePreset === 'large') { baseFontSize = (isPortrait ? 90 : 120) * scale; lineSpacing = (isPortrait ? 110 : 140) * scale; }
    else if (['large_upper', 'big_center', 'metal', 'kids', 'tech', 'testing', 'testing_up', 'one_line', 'one_line_up', 'custom'].includes(activePreset)) { baseFontSize = (isPortrait ? 80 : 110) * scale; lineSpacing = (isPortrait ? 110 : 140) * scale; }
    else if (['sad', 'romantic', 'gothic'].includes(activePreset)) { baseFontSize = (isPortrait ? 60 : 75) * scale; lineSpacing = (isPortrait ? 90 : 120) * scale; }
    else if (['slideshow', 'subtitle'].includes(activePreset)) { baseFontSize = (isPortrait ? 30 : 40) * scale; }

    baseFontSize *= fontSizeScale; secondaryFontSize *= fontSizeScale; lineSpacing *= fontSizeScale;

    if ((renderConfig?.showLyrics ?? true) && (activeIdx !== -1 || showIntroTitle || (renderConfig?.lyricDisplayMode === 'all' && lyrics.length > 0))) {
        // Vertical Position Logic
        let centerY = height / 2;
        if (renderConfig?.contentPosition === 'top') {
            centerY = height * 0.25;
        } else if (renderConfig?.contentPosition === 'bottom') {
            centerY = height * 0.75;
        }

        let activeLineShift = 0;
        const isBigLayout = ['large', 'large_upper', 'big_center', 'metal', 'kids', 'sad', 'romantic', 'tech', 'gothic', 'testing', 'testing_up', 'one_line', 'one_line_up', 'custom'].includes(activePreset);

        if (isBigLayout || activePreset === 'slideshow' || activePreset === 'subtitle') {
            const activeLine = showIntroTitle ? { time: 0, text: `${metadata.title}\n${metadata.artist}` } : (lyrics[activeIdx] || lyrics[virtualActiveIdx]);
            if (activeLine) {
                ctx.font = `900 ${baseFontSize}px ${fontFamily}`;
                const textToCheck = ['large_upper', 'big_center', 'metal', 'tech', 'testing_up', 'one_line_up'].includes(activePreset) ? activeLine.text.toUpperCase() : activeLine.text;
                const lines = getWrappedLines(ctx, textToCheck, width * 0.9);
                if (lines.length > 1) activeLineShift = ((lines.length - 1) * (baseFontSize * 1.2)) / 2;
            }
        }

        // Lyric Display Range Logic
        let startI = isBigLayout ? -1 : -2;
        let endI = isBigLayout ? 1 : 2;

        if (renderConfig?.lyricDisplayMode === 'active-only') {
            startI = 0; endI = 0;
        } else if (renderConfig?.lyricDisplayMode === 'next-only') {
            startI = 0; endI = 1;
        } else if (renderConfig?.lyricDisplayMode === 'previous-next') {
            startI = -1; endI = 1;
        } else if (renderConfig?.lyricDisplayMode === 'all') {
            startI = -lyrics.length;
            endI = lyrics.length;
        }

        for (let i = startI; i <= endI; i++) {
            let line: LyricLine | null = null;
            let isCurrent = false;

            if (i === 0 && showIntroTitle) {
                line = { time: 0, text: `${metadata.title}\n${metadata.artist}` };
                isCurrent = true;
            } else {
                const idx = virtualActiveIdx + i;
                if (idx >= 0 && idx < lyrics.length) {
                    line = lyrics[idx];
                    isCurrent = (idx === activeIdx);
                }
            }

            if (line) {
                // Preset specific overrides if lyricDisplayMode is 'all'
                if (renderConfig?.lyricDisplayMode === 'all') {
                    // We allow all lines to be shown if 'all' is selected, 
                    // but we can still keep some logical restrictions if needed.
                    // Removed restrictions for one_line, slideshow, subtitle as per user request to show "all" lyrics.
                }

                ctx.textAlign = renderConfig?.textAlign || (['large', 'large_upper'].includes(activePreset) ? 'left' : 'center');
                ctx.textBaseline = 'middle';

                // Color Logic
                const baseColorHex = renderConfig?.fontColor || '#ffffff';
                let fillStyle = baseColorHex;
                if (!isCurrent) {
                    const rgb = hexToRgb(baseColorHex);
                    fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
                }

                let weight = isCurrent ? (['large', 'large_upper', 'big_center', 'metal', 'tech'].includes(activePreset) ? '900' : 'bold') : '400';
                if (activePreset === 'custom' && renderConfig?.fontWeight) {
                    weight = renderConfig.fontWeight;
                }

                const style = (activePreset === 'custom' && renderConfig?.fontStyle) ? renderConfig.fontStyle : 'normal';
                const decoration = (activePreset === 'custom' && renderConfig?.textDecoration) ? renderConfig.textDecoration : 'none';

                ctx.font = `${style} ${weight} ${(isCurrent ? baseFontSize : secondaryFontSize)}px ${fontFamily}`;
                ctx.fillStyle = fillStyle;

                // Transition
                const transEffect = renderConfig?.transitionEffect || 'none';
                let alpha = 1, offsetY = 0, offsetX = 0, scaleValX = 1, scaleValY = 1, blurVal = 0, rotateVal = 0;

                if (isCurrent && transEffect !== 'none') {
                    const elapsed = time - line.time, remaining = (line.endTime ? line.endTime - time : 0.5), transDur = 0.5;
                    const p = elapsed < transDur ? elapsed / transDur : (line.endTime && remaining < transDur ? remaining / transDur : 1);
                    // Entrance Logic primarily, simple exit for now
                    if (p < 1) {
                        alpha = Math.min(1, p * 2); // Fase in faster
                        const easeOutBack = (t: number) => { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
                        const easeOutElastic = (x: number): number => { const c4 = (2 * Math.PI) / 3; return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1; };

                        if (transEffect === 'slide') offsetY = (1 - p) * (elapsed < transDur ? 30 : -30);
                        else if (transEffect === 'zoom') { const s = 0.5 + (p * 0.5); scaleValX = s; scaleValY = s; }
                        else if (transEffect === 'blur') blurVal = (1 - p) * 10;
                        else if (transEffect === 'float') offsetY = (1 - p) * (elapsed < transDur ? 50 : -50);
                        else if (transEffect === 'drop') { offsetY = (1 - easeOutBack(p)) * -200; alpha = p; }
                        else if (transEffect === 'flip') { scaleValY = p; }
                        else if (transEffect === 'rotate-in') { rotateVal = (1 - p) * -Math.PI / 2; alpha = p; }
                        else if (transEffect === 'spiral') { scaleValX = p; scaleValY = p; rotateVal = (1 - p) * Math.PI * 2; alpha = p; }
                        else if (transEffect === 'shatter') { const s = 3 - (2 * p); scaleValX = s; scaleValY = s; blurVal = (1 - p) * 20; alpha = p; }
                        else if (transEffect === 'lightspeed') { offsetX = (1 - p) * 300; /* skew not implemented */ alpha = p; }
                        else if (transEffect === 'roll') { offsetX = (1 - p) * -300; rotateVal = (1 - p) * -Math.PI; alpha = p; }
                        else if (transEffect === 'elastic') { const s = easeOutElastic(p); scaleValX = s; scaleValY = s; alpha = p; }
                    }
                }

                ctx.save();
                ctx.globalAlpha = alpha;
                if (blurVal > 0) ctx.filter = `blur(${blurVal}px)`;

                const textAnim = isCurrent ? (renderConfig?.textAnimation || 'none') : 'none';
                let textToDraw = (isCurrent && ['large_upper', 'big_center', 'metal', 'tech', 'testing_up', 'one_line_up'].includes(activePreset)) ? line.text.toUpperCase() : line.text;

                // Text Animation Logic
                let animOffsetX = 0;
                let animOffsetY = 0;
                let animScaleX = 1;
                let animScaleY = 1;
                let animRotation = 0;

                if (isCurrent && textAnim !== 'none') {
                    if (textAnim === 'bounce') {
                        animOffsetY = Math.sin(time * 6) * 15 * scale;
                    } else if (textAnim === 'pulse') {
                        const s = 1 + Math.sin(time * 4) * 0.08; animScaleX = s; animScaleY = s;
                    } else if (textAnim === 'wave') {
                        animOffsetY = Math.sin(time * 4) * 20 * scale;
                        animRotation = Math.sin(time * 4) * 0.05;
                    } else if (textAnim === 'glitch') {
                        if (Math.sin(time * 10) > 0.8) {
                            animOffsetX = (Math.random() - 0.5) * 15 * scale;
                            animOffsetY = (Math.random() - 0.5) * 15 * scale;
                        }
                    } else if (textAnim === 'shake') {
                        animOffsetX = (Math.random() - 0.5) * 5 * scale;
                        animOffsetY = (Math.random() - 0.5) * 5 * scale;
                    } else if (textAnim === 'typewriter') {
                        const charPerSec = 30;
                        const charsToShow = Math.floor((time - line.time) * charPerSec);
                        textToDraw = textToDraw.substring(0, Math.max(0, charsToShow));
                    } else if (textAnim === 'wobble') {
                        animRotation = Math.sin(time * 5) * 0.05;
                        const s = 1 + Math.sin(time * 3) * 0.05; animScaleX = s; animScaleY = s;
                    } else if (textAnim === 'breathe') {
                        const s = 1 + Math.sin(time * 2) * 0.03; animScaleX = s; animScaleY = s;
                    } else if (textAnim === 'rotate') {
                        animRotation = Math.sin(time * 2) * 0.05;
                    } else if (textAnim === 'sway') {
                        animRotation = Math.sin(time * 2) * 0.08;
                    } else if (textAnim === 'flicker') {
                        ctx.globalAlpha = alpha * (0.8 + Math.random() * 0.2);
                    } else if (textAnim === 'jello') {
                        animScaleX = 1 + Math.sin(time * 6) * 0.1;
                        animScaleY = 1 - Math.sin(time * 6) * 0.1;
                    } else if (textAnim === 'spin') {
                        animRotation = (time % 2) * Math.PI;
                    } else if (textAnim === 'heartbeat') {
                        const hb = (time * 1.5) % 1;
                        if (hb < 0.1 || (hb > 0.3 && hb < 0.4)) { animScaleX = 1.1; animScaleY = 1.1; }
                    } else if (textAnim === 'tada') {
                        const t = (time * 1.5) % 1;
                        if (t < 0.1) { animScaleX = 0.9; animScaleY = 0.9; animRotation = -0.05; }
                        else if (t < 0.2) { animScaleX = 1.1; animScaleY = 1.1; animRotation = 0.05; }
                        else { animScaleX = 1; animScaleY = 1; animRotation = 0; }
                    } else if (textAnim === 'swing') {
                        animRotation = Math.sin(time * 3) * 0.1; // Simple rotation as anchor pivot is difficult per-word vs per-line without more logic
                    }
                }

                // Y Position Logic
                let yPos = (activePreset === 'subtitle' && i === 0 && renderConfig?.lyricDisplayMode !== 'all')
                    ? (height - 120 * scale)
                    : (centerY + (i * lineSpacing) + (i === 0 ? offsetY : 0));


                if (activePreset !== 'custom') {
                    if (i < 0) yPos -= activeLineShift; else if (i > 0) yPos += activeLineShift;
                }
                yPos += animOffsetY;

                let xPos = width / 2;
                if (ctx.textAlign === 'left') xPos = 60 * scale; else if (ctx.textAlign === 'right') xPos = width - 60 * scale;
                xPos += offsetX + animOffsetX;

                const finalScaleX = scaleValX * animScaleX;
                const finalScaleY = scaleValY * animScaleY;
                const finalRotation = rotateVal + animRotation;

                if (finalScaleX !== 1 || finalScaleY !== 1 || finalRotation !== 0) {
                    ctx.translate(xPos, yPos);
                    ctx.rotate(finalRotation);
                    ctx.scale(finalScaleX, finalScaleY);
                    ctx.translate(-xPos, -yPos);
                }

                const textEffect = isCurrent ? (renderConfig?.textEffect || 'preset') : 'none';

                if (isCurrent && (isBigLayout || ['slideshow', 'subtitle'].includes(activePreset))) {
                    drawWrappedText(ctx, textToDraw, xPos, yPos, width * 0.9, baseFontSize * 1.2, textEffect, decoration);
                } else {
                    drawLineWithEffects(ctx, textToDraw, xPos, yPos, textEffect, decoration);
                }
                ctx.restore();
            }
        }
    }

    // Info Layer
    if (!['subtitle', 'just_video', 'none'].includes(activePreset)) {
        const showInfo = renderConfig ? (renderConfig.showTitle || renderConfig.showArtist) : true;
        const showCover = renderConfig ? renderConfig.showCover : true;
        if (showInfo || showCover) {
            if (activePreset === 'custom') {
                // --- CUSTOM FLEXIBLE LAYOUT ---
                const pos = renderConfig?.infoPosition || 'top-left';
                const style = renderConfig?.infoStyle || 'classic';
                const borderRadius = (style === 'box') ? 0 : 12 * scale;
                const margin = 40 * scale * (renderConfig?.infoMarginScale ?? 1);

                let x = 0, y = 0;
                let align: CanvasTextAlign = 'left';
                let vertical: 'top' | 'bottom' = 'top';

                if (pos.includes('left')) { x = margin; align = 'left'; }
                else if (pos.includes('right')) { x = width - margin; align = 'right'; }
                else { x = width / 2; align = 'center'; }

                if (pos.includes('top')) { y = margin; vertical = 'top'; }
                else { y = height - margin; vertical = 'bottom'; }

                const coverSize = (style === 'minimal' || style === 'modern') ? 0 : 100 * scale;
                const hasCover = showCover && coverSize > 0 && (metadata.coverUrl !== null);
                const coverImg = hasCover ? (metadata.backgroundType === 'video' ? videos.get('background') : images.get('cover')) : null;

                const titleSize = (style === 'minimal' ? 20 : (style === 'modern' || style === 'modern_art') ? 40 : 28) * scale;
                const artistSize = (style === 'minimal' ? 14 : (style === 'modern' || style === 'modern_art') ? 24 : 18) * scale;
                const titleFont = `bold ${titleSize}px ${fontFamily}`;
                const artistFont = `${artistSize}px ${fontFamily}`;
                const gap = 20 * scale;

                const mainColor = renderConfig?.fontColor || '#ffffff';
                // lighter version for artist
                const artistColor = (style === 'modern' || style === 'modern_art') ? mainColor : (renderConfig?.fontColor || '#d4d4d8');

                let curY = y;
                let curX = x;

                // BOX BACKGROUND (Simplistic implementation)
                if (style === 'box') {
                    // This would require pre-measuring text. Skipped for now to ensure reliability.
                    // Instead, we just add a backdrop to the text if needed, or maybe just a style choice.
                    // For now "box" will just act like classic but strictly boxed? 
                    // Let's interpret "box" as "Card" style with background later.
                }

                if (align === 'center') {
                    // STACKED LAYOUT
                    ctx.textAlign = 'center';
                    if (vertical === 'top') {
                        ctx.textBaseline = 'top';
                        // Image -> Title -> Artist
                        if (hasCover && coverImg) {
                            const imgX = x - coverSize / 2;
                            ctx.save(); ctx.beginPath();
                            if (style === 'circle_art') {
                                ctx.arc(x, curY + coverSize / 2, coverSize / 2, 0, Math.PI * 2);
                            } else {
                                ctx.roundRect(imgX, curY, coverSize, coverSize, borderRadius);
                            }
                            ctx.clip();
                            ctx.drawImage(coverImg, imgX, curY, coverSize, coverSize);
                            ctx.restore();
                            curY += coverSize + gap;
                        }
                        if (renderConfig?.showTitle ?? true) {
                            ctx.fillStyle = mainColor; ctx.font = titleFont;
                            ctx.fillText(metadata.title, x, curY);
                            curY += titleSize + 5 * scale;
                        }
                        if (renderConfig?.showArtist ?? true) {
                            ctx.fillStyle = artistColor; ctx.font = artistFont;
                            ctx.fillText(metadata.artist, x, curY);
                        }
                    } else { // Bottom
                        ctx.textBaseline = 'bottom';
                        // Artist -> Title -> Image (upwards)
                        if (renderConfig?.showArtist ?? true) {
                            ctx.fillStyle = artistColor; ctx.font = artistFont;
                            ctx.fillText(metadata.artist, x, curY);
                            curY -= (artistSize + 5 * scale);
                        }
                        if (renderConfig?.showTitle ?? true) {
                            ctx.fillStyle = mainColor; ctx.font = titleFont;
                            ctx.fillText(metadata.title, x, curY);
                            curY -= (titleSize + gap);
                        }
                        if (hasCover && coverImg) {
                            const imgX = x - coverSize / 2;
                            curY -= coverSize;
                            ctx.save(); ctx.beginPath();
                            if (style === 'circle_art') {
                                ctx.arc(x, curY + coverSize / 2, coverSize / 2, 0, Math.PI * 2);
                            } else {
                                ctx.roundRect(imgX, curY, coverSize, coverSize, borderRadius);
                            }
                            ctx.clip();
                            ctx.drawImage(coverImg, imgX, curY, coverSize, coverSize);
                            ctx.restore();
                        }
                    }
                } else {
                    // SIDE-BY-SIDE LAYOUT
                    ctx.textAlign = align;
                    ctx.textBaseline = 'top';
                    const isRight = align === 'right';

                    // Calculate Content Height for Vertical Center Alignment of Text vs Image
                    const textTotalH = (renderConfig?.showTitle ? titleSize : 0) + (renderConfig?.showArtist ? artistSize + 5 * scale : 0);
                    const blockH = Math.max(coverSize, textTotalH);

                    // Top: StartY = y. Bottom: StartY = y - blockH
                    const startY = vertical === 'top' ? y : y - blockH;

                    // Draw Cover
                    if (hasCover && coverImg) {
                        const imgX = isRight ? x - coverSize : x;
                        ctx.save(); ctx.beginPath();
                        if (style === 'circle_art') {
                            ctx.arc(imgX + coverSize / 2, startY + coverSize / 2, coverSize / 2, 0, Math.PI * 2);
                        } else {
                            ctx.roundRect(imgX, startY, coverSize, coverSize, borderRadius);
                        }
                        ctx.clip();
                        ctx.drawImage(coverImg, imgX, startY, coverSize, coverSize);
                        ctx.restore();

                        // Shift Text X
                        if (isRight) curX -= (coverSize + gap);
                        else curX += (coverSize + gap);
                    }

                    // Draw Text (Vertically Centered relative to Image/Block)
                    let textY = startY + (blockH - textTotalH) / 2;

                    if (renderConfig?.showTitle ?? true) {
                        ctx.fillStyle = mainColor; ctx.font = titleFont;
                        ctx.fillText(metadata.title, curX, textY);
                        textY += titleSize + 5 * scale;
                    }
                    if (renderConfig?.showArtist ?? true) {
                        ctx.fillStyle = artistColor; ctx.font = artistFont;
                        ctx.fillText(metadata.artist, curX, textY);
                    }
                }

            } else if (['big_center', 'metal', 'kids', 'sad', 'romantic', 'tech', 'gothic', 'testing', 'testing_up', 'one_line', 'one_line_up', 'slideshow', 'subtitle'].includes(activePreset)) {
                // --- LEGACY CENTER BOT/MID LAYOUTS ---
                if (showInfo) {
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    let bottomMargin = 80 * scale;
                    if (['testing', 'testing_up', 'one_line', 'one_line_up'].includes(activePreset)) bottomMargin = 120 * scale;

                    // Note: Custom preset removed from this block, so colors fallback to white/gray as per original logic for themes
                    if (renderConfig?.showTitle ?? true) {
                        ctx.font = `bold ${20 * scale}px ${fontFamily}`; ctx.fillStyle = '#ffffff';
                        ctx.fillText((activePreset === 'tech' ? metadata.title.toUpperCase() : metadata.title), width / 2, height - bottomMargin - (30 * scale));
                    }
                    if (renderConfig?.showArtist ?? true) {
                        ctx.font = `${16 * scale}px ${fontFamily}`; ctx.fillStyle = '#d4d4d8';
                        ctx.fillText(metadata.artist, width / 2, height - bottomMargin);
                    }
                }
            } else {
                // --- CLASSIC / DEFAULT LEFTOVER LAYOUTS ---
                const margin = 40 * scale * (renderConfig?.infoMarginScale ?? 1), isSq = width === height, thumbSize = (isPortrait ? (isSq ? 110 : 150) : 100) * scale;
                const coverImg = metadata.coverUrl ? images.get('cover') : null;
                const r = 12 * scale;
                if (isPortrait) {
                    const startY = margin * (isSq ? 1.5 : 3), centerX = width / 2, imgX = centerX - thumbSize / 2, imgY = startY;
                    if (showCover) {
                        ctx.save(); ctx.beginPath(); ctx.roundRect(imgX, imgY, thumbSize, thumbSize, r); ctx.clip();
                        if (coverImg) ctx.drawImage(coverImg, imgX, imgY, thumbSize, thumbSize);
                        else { ctx.fillStyle = '#27272a'; ctx.fillRect(imgX, imgY, thumbSize, thumbSize); }
                        ctx.restore();
                    }
                    if (showInfo) {
                        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
                        const titleY = imgY + (showCover ? thumbSize + 25 * scale : 0);
                        if (renderConfig?.showTitle ?? true) {
                            ctx.font = `bold ${(isSq ? 26 : 36) * scale}px ${fontFamily}`; ctx.fillStyle = '#ffffff';
                            ctx.fillText(metadata.title, centerX, titleY);
                        }
                        if (renderConfig?.showArtist ?? true) {
                            ctx.font = `${(isSq ? 18 : 24) * scale}px ${fontFamily}`; ctx.fillStyle = '#d4d4d8';
                            ctx.fillText(metadata.artist, centerX, titleY + ((renderConfig?.showTitle ?? true) ? (isSq ? 30 : 40) * scale : 0));
                        }
                    }
                } else {
                    const x = margin, y = margin;
                    if (showCover) {
                        ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, thumbSize, thumbSize, r); ctx.clip();
                        if (coverImg) ctx.drawImage(coverImg, x, y, thumbSize, thumbSize);
                        else { ctx.fillStyle = '#27272a'; ctx.fillRect(x, y, thumbSize, thumbSize); }
                        ctx.restore();
                    }
                    if (showInfo) {
                        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                        const titleX = x + (showCover ? thumbSize + 25 * scale : 0), titleSize = 28 * scale, titleY = y + thumbSize / 2 - titleSize;
                        if (renderConfig?.showTitle ?? true) {
                            ctx.font = `bold ${titleSize}px ${fontFamily}`; ctx.fillStyle = '#ffffff';
                            ctx.fillText(metadata.title, titleX, titleY);
                        }
                        if (renderConfig?.showArtist ?? true) {
                            ctx.font = `${18 * scale}px ${fontFamily}`; ctx.fillStyle = '#d4d4d8';
                            ctx.fillText(metadata.artist, titleX, titleY + ((renderConfig?.showTitle ?? true) ? titleSize + 5 * scale : 0));
                        }
                    }
                }
            }
        }
    }
};
