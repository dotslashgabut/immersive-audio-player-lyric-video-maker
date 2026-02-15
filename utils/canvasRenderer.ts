import { LyricLine, VideoPreset, VisualSlide, AudioMetadata, RenderConfig, LyricWord } from '../types';

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
    isBlurEnabled: boolean, // Deprecated, use renderConfig.backgroundBlurStrength
    duration: number,
    renderConfig?: RenderConfig,
    isLastSongInPlaylist: boolean = true,
    isFirstSongInPlaylist: boolean = true
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

    // Helper used for background scaling
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
        } else if (effect === 'cyberpunk') {
            // Cyan (Back)
            ctx.save();
            ctx.fillStyle = '#05d9e8';
            ctx.fillText(text, x - 1, y - 1);
            ctx.restore();

            // Black (Middle)
            ctx.save();
            ctx.fillStyle = '#000000';
            ctx.fillText(text, x + 2, y + 2);
            ctx.restore();

            // Main (Front)
            ctx.save();
            ctx.fillStyle = '#fcee0a';
            ctx.fillText(text, x, y);
            ctx.restore();
        } else if (effect === 'glitch-text') {
            const jitterX = (Math.random() - 0.5) * 5;
            const jitterY = (Math.random() - 0.5) * 2;
            ctx.save();
            ctx.fillStyle = 'red';
            ctx.fillText(text, x + jitterX, y + jitterY);
            ctx.restore();

            ctx.save();
            ctx.fillStyle = 'cyan';
            ctx.fillText(text, x - jitterX, y - jitterY);
            ctx.restore();

            ctx.fillStyle = '#ffffff';
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

    const drawKaraokeText = (
        ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
        line: LyricLine,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number,
        time: number,
        renderConfig: RenderConfig,
        fontFamily: string,
        baseFontSize: number,
        weight: string,
        style: string,
        scale: number
    ) => {
        // 1. Prepare Words & Casing
        const casing = renderConfig?.textCase || 'none';
        const transformText = (txt: string, isFirstWord: boolean) => {
            if (!txt) return txt;
            if (casing === 'upper') return txt.toUpperCase();
            if (casing === 'lower') return txt.toLowerCase();
            if (casing === 'title') return txt.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());
            if (casing === 'sentence') {
                const lower = txt.toLowerCase();
                return isFirstWord ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
            }
            if (casing === 'invert') return txt.replace(/\w\S*/g, (t) => t.charAt(0).toLowerCase() + t.slice(1).toUpperCase());
            return txt;
        };

        let words: LyricWord[] = line.words || [];

        if (words.length === 0) {
            // Fallback: Split by space but preserve newlines
            const rawLines = line.text.split('\n');
            words = [];
            rawLines.forEach((lText, lIdx) => {
                // Split by spaces
                const lWords = lText.split(' ').map(t => ({ text: t, startTime: line.time, endTime: line.endTime || (line.time + 3) }));
                words.push(...lWords);
                // valid word check is done later
                if (lIdx < rawLines.length - 1) {
                    // Insert explicit newline marker
                    words.push({ text: '\n', startTime: line.time, endTime: line.endTime });
                }
            });
        }

        const displayWords = words
            .filter(w => w.text === '\n' || w.text.trim().length > 0)
            .map((w, index) => ({ ...w, text: w.text === '\n' ? '\n' : transformText(w.text, index === 0).trim() }));

        if (renderConfig?.highlightEffect?.includes('cyberpunk') || renderConfig?.textEffect === 'cyberpunk') {
            fontFamily = "'Orbitron', sans-serif";
        }

        // Explicitly set font for measurement
        ctx.font = `${style} ${weight} ${baseFontSize}px ${fontFamily}`;

        // 2. Wrap Words into Lines
        const lines: LyricWord[][] = [];
        let currentLine: LyricWord[] = [];
        let currentLineWidth = 0;
        // Reverted manual reduction. Now respecting file spacing.
        // Adjusted spacing: 0.25 for default/custom, 0.5 for monospace, 0.3 for others.
        // Monospace needs explicit extra spacing.
        let spaceMultiplier = 0.3;
        if (['default', 'custom'].includes(activePreset)) spaceMultiplier = 0.25;
        else if (activePreset === 'monospace') spaceMultiplier = 0.5;

        const spaceWidth = ctx.measureText('M').width * spaceMultiplier;

        displayWords.forEach((word, index) => {
            if (word.text === '\n') {
                if (currentLine.length > 0) lines.push(currentLine);
                currentLine = [];
                currentLineWidth = 0;
                return;
            }

            const wordWidth = ctx.measureText(word.text).width;

            // Check spacing with next word
            const hasTrailingSpace = word.text.endsWith(' ');
            let addSpace = !hasTrailingSpace;

            // Regex for various hyphens (Hyphen, Hyphen-Minus, Figure Dash, En Dash, Em Dash, Horizontal Bar)
            const hyphenEndRegex = /[-‐‑‒–—―]$/;
            const hyphenStartRegex = /^[-‐‑‒–—―]/;

            if (hyphenEndRegex.test(word.text.trim())) addSpace = false;

            const nextWord = displayWords[index + 1];
            if (nextWord && (hyphenStartRegex.test(nextWord.text.trim()) || nextWord.text === '\n')) addSpace = false;

            const spaceToAdd = addSpace ? spaceWidth : 0;

            if (currentLineWidth + wordWidth > maxWidth && currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = [];
                currentLineWidth = 0;
            }
            currentLine.push(word);

            // Smart Spacing
            currentLineWidth += wordWidth + spaceToAdd;
        });
        if (currentLine.length > 0) lines.push(currentLine);

        // 3. Draw Lines
        const startY = y - ((lines.length - 1) * lineHeight) / 2;

        // Resolve Colors
        let highlightColor = renderConfig.highlightColor || '#fb923c';
        let bgColor = renderConfig.highlightBackground || '#ffffff';
        const effect = renderConfig.highlightEffect || 'none';

        if (!renderConfig.useCustomHighlightColors) {
            // Preset Colors Mapping
            if (effect.includes('blue') || effect.includes('cyan')) { highlightColor = '#3b82f6'; bgColor = '#3b82f6'; }
            else if (effect.includes('purple')) { highlightColor = '#a855f7'; bgColor = '#a855f7'; }
            else if (effect.includes('green')) { highlightColor = '#22c55e'; bgColor = '#22c55e'; }
            else if (effect.includes('pink')) { highlightColor = '#ec4899'; bgColor = '#ec4899'; }
            else if (effect.includes('neon')) { highlightColor = '#ffffff'; bgColor = '#ffffff'; }
            else if (effect.includes('gold')) { highlightColor = '#FFD700'; bgColor = '#B8860B'; }
            else if (effect.includes('chrome')) { highlightColor = '#E0E0E0'; bgColor = '#757575'; }
            else if (effect.includes('fire')) { highlightColor = '#FF4500'; bgColor = '#FF0000'; }
            else if (effect.includes('glass')) { highlightColor = '#ffffff'; bgColor = 'rgba(255,255,255,0.1)'; }
            else if (effect === 'karaoke') { highlightColor = '#fb923c'; bgColor = '#fb923c'; } // Default Orange
        }

        let baseColor = renderConfig.fontColor || '#ffffff';
        if (renderConfig.highlightEffect === 'karaoke-smooth-white') {
            baseColor = '#ffffff';
        }

        lines.forEach((l, i) => {
            const lineY = startY + (i * lineHeight);

            // Calculate line width for alignment
            let totalW = 0;
            l.forEach((w, j) => {
                totalW += ctx.measureText(w.text).width;
                if (j < l.length - 1) {
                    const hasTrailingSpace = w.text.endsWith(' ');
                    let addSpace = !hasTrailingSpace;

                    const hyphenEndRegex = /[-‐‑‒–—―]$/;
                    const hyphenStartRegex = /^[-‐‑‒–—―]/;

                    if (hyphenEndRegex.test(w.text.trim())) addSpace = false;
                    const nextW = l[j + 1];
                    if (nextW && hyphenStartRegex.test(nextW.text.trim())) addSpace = false;

                    totalW += (addSpace ? spaceWidth : 0);
                }
            });

            let currentX = x;
            if (ctx.textAlign === 'center') currentX = x - (totalW / 2);
            else if (ctx.textAlign === 'right') currentX = x - totalW;


            // Force Left Align for manual word positioning
            ctx.save();
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle'; // Ensure vertical centering matches lineY calculation

            // Draw words
            l.forEach((word, j) => {
                const wWidth = ctx.measureText(word.text).width;
                const isPassed = time >= word.startTime;
                const isCurrentWord = time >= word.startTime && time < word.endTime;

                // Color Selection
                let fill: string | CanvasGradient = baseColor;

                // Determine if we should highlight this word
                const isFillType = effect.includes('fill') || effect.includes('smooth');
                const shouldHighlight = isFillType ? isPassed : isCurrentWord;

                if (shouldHighlight && effect !== 'none') {
                    if (effect === 'karaoke-smooth' || effect === 'karaoke-smooth-white') {
                        if (isCurrentWord) {
                            // Calculate smooth progress
                            const duration = word.endTime - word.startTime;
                            const elapsed = time - word.startTime;
                            const progress = Math.max(0, Math.min(1, elapsed / duration));

                            // Create gradient for smooth wipe
                            // Note: Linear Gradient coordinates are relative to canvas, not text
                            const grad = ctx.createLinearGradient(currentX, 0, currentX + wWidth, 0);
                            grad.addColorStop(progress, highlightColor);
                            // Sharp transition
                            grad.addColorStop(Math.min(1, progress + 0.001), baseColor);
                            fill = grad;
                        } else {
                            fill = highlightColor;
                        }
                    } else {
                        fill = highlightColor;
                    }
                }

                // Effects
                ctx.save();
                ctx.fillStyle = fill;

                // --- Background Shapes (Pill/Box/Fill) ---
                if (isCurrentWord || (isFillType && isPassed)) {
                    // Logic: 'fill' type fills history (isPassed). Shapes (Pill/Box) are Active Only (isCurrentWord).
                    // We need to distinguish.
                    // If effect is 'karaoke-fill', it respects isFillType (so all passed are filled).
                    // If effect is 'karaoke-pill/box', it is NOT isFillType (so only current).

                    if (effect.includes('pill') || effect.includes('box') || effect.includes('rounded') || effect.includes('fill') || effect.includes('glass')) {
                        if (shouldHighlight) {
                            const padding = effect.includes('pill') ? baseFontSize * 0.4 : baseFontSize * 0.15;
                            ctx.fillStyle = bgColor;

                            let r = 4 * scale;
                            if (effect.includes('pill')) r = 999;
                            else if (effect.includes('rounded') || effect.includes('glass')) r = 8 * scale;
                            else if (effect.includes('box')) r = 0;

                            if (effect.includes('glass')) {
                                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                                ctx.shadowColor = 'rgba(255,255,255,0.2)';
                                ctx.shadowBlur = 10;
                            }

                            ctx.beginPath();
                            if (ctx.roundRect) ctx.roundRect(currentX - padding, lineY - lineHeight / 2, wWidth + padding * 2, lineHeight, r);
                            else ctx.rect(currentX - padding, lineY - lineHeight / 2, wWidth + padding * 2, lineHeight);
                            ctx.fill();

                            if (effect.includes('glass')) {
                                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                                ctx.lineWidth = 1;
                                ctx.stroke();
                            }

                            // Reset fill to text color
                            if (effect.includes('fill') || effect.includes('pill') || effect.includes('box') || effect.includes('rounded')) {
                                ctx.fillStyle = '#000000';
                                fill = '#000000';
                            } else {
                                ctx.fillStyle = highlightColor;
                            }
                        }
                    }
                }

                // --- Text Effects (Glow/Neon/Underline) ---
                if (shouldHighlight) {
                    if (effect.includes('underline')) {
                        const underlineH = Math.max(2, baseFontSize * 0.08); // Thickness
                        const underlineY = lineY + (baseFontSize * 0.6); // Position below baseline

                        // Draw line
                        ctx.fillStyle = highlightColor;
                        ctx.fillRect(currentX, underlineY, wWidth, underlineH);

                        // Restore fill for text
                        ctx.fillStyle = fill;
                    }

                    if (effect.includes('glow') || effect.includes('neon')) {
                        if (effect.includes('neon')) {
                            ctx.fillStyle = '#ffffff'; // Neon core is white
                            ctx.shadowColor = highlightColor;
                            ctx.shadowBlur = 20;
                        } else {
                            ctx.shadowColor = highlightColor;
                            ctx.shadowBlur = 10;
                        }
                    }

                    if (effect.includes('outline')) {
                        ctx.strokeStyle = highlightColor;
                        ctx.lineWidth = 2 * scale;
                        ctx.strokeText(word.text, currentX, lineY);
                        ctx.fillStyle = 'transparent'; // Outline only? Or Fill + Outline? 
                        // App.tsx implies text is transparent with stroke.
                        if (effect === 'karaoke-outline') {
                            // Only stroke, transparent fill
                            fill = 'transparent';
                            ctx.fillStyle = 'transparent';
                        }
                    }

                    if (effect.includes('shadow')) {
                        ctx.shadowColor = '#000000';
                        ctx.shadowOffsetX = 3 * scale;
                        ctx.shadowOffsetY = 3 * scale;
                        ctx.shadowBlur = 0;
                    }

                    if (effect.includes('gradient')) {
                        const grad = ctx.createLinearGradient(currentX, lineY - lineHeight / 2, currentX + wWidth, lineY + lineHeight / 2);
                        grad.addColorStop(0, highlightColor);
                        grad.addColorStop(1, bgColor);
                        ctx.fillStyle = grad;
                        fill = grad;
                    }
                }

                // --- Animations & Transforms (Continuous & One-Shot) ---
                let wordY = lineY;
                let wordX = currentX;
                let rot = 0;
                let scaleX = 1;
                let scaleY = 1;
                let animAlpha = 1;
                let animBlur = 0;

                if (shouldHighlight) {
                    const elapsed = time - word.startTime;

                    // -- Continuous Animations --
                    if (effect.includes('bounce') || effect === 'karaoke-bounce') wordY -= 10 * scale;
                    else if (effect.includes('wave')) wordY += Math.sin(time * 5 + j) * 8 * scale;
                    else if (effect.includes('pulse')) { const s = 1 + Math.sin(time * 6) * 0.1; scaleX = s; scaleY = s; }
                    else if (effect.includes('shake')) { wordX += (Math.random() - 0.5) * 6 * scale; wordY += (Math.random() - 0.5) * 6 * scale; }
                    else if (effect.includes('wobble')) { rot = Math.sin(time * 6) * 0.1; }
                    else if (effect.includes('rotate') && !effect.includes('in')) { rot = Math.sin(time * 3) * 0.1; }
                    else if (effect.includes('spin')) { rot = (time * 3) % (Math.PI * 2); }
                    else if (effect.includes('jello')) { scaleX = 1 + Math.sin(time * 8) * 0.15; scaleY = 1 - Math.sin(time * 8) * 0.15; }
                    else if (effect.includes('heartbeat')) { const hb = (time * 2) % 1; if (hb < 0.15 || (hb > 0.3 && hb < 0.45)) { scaleX = 1.15; scaleY = 1.15; } }
                    else if (effect.includes('flash')) { animAlpha = 0.5 + Math.sin(time * 10) * 0.5; }
                    else if (effect.includes('tada')) { const t = (time * 2) % 1; if (t < 0.1) { rot = -0.05; scaleX = 0.9; } else if (t < 0.2) { rot = 0.05; scaleX = 1.1; } }
                    else if (effect.includes('swing')) { rot = Math.sin(time * 4) * 0.15; }
                    else if (effect.includes('glitch')) { if (Math.sin(time * 15) > 0.8) { wordX += (Math.random() - 0.5) * 10; wordY += (Math.random() - 0.5) * 10; } }

                    // -- Feature (One-Shot) Transitions --
                    const transDur = 0.3;
                    if (elapsed < transDur) {
                        const p = elapsed / transDur;
                        const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
                        const ep = easeOut(p);

                        if (effect.includes('fade')) { animAlpha = p; }
                        else if (effect.includes('slide')) { wordY += (1 - ep) * 30 * scale; animAlpha = ep; }
                        else if (effect.includes('drop')) { wordY -= (1 - ep) * 50 * scale; animAlpha = ep; }
                        else if (effect.includes('zoom') || effect.includes('scale')) { const s = 0.5 + 0.5 * ep; scaleX *= s; scaleY *= s; }
                        else if (effect.includes('elastic')) { const s = p === 0 ? 0 : p === 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI) / 3) + 1; scaleX *= s; scaleY *= s; }
                        else if (effect.includes('flip')) { scaleY *= ep; }
                        else if (effect.includes('rotate-in')) { rot += (1 - ep) * -1; animAlpha = ep; }
                        else if (effect.includes('roll')) { wordX -= (1 - ep) * 50 * scale; rot -= (1 - ep) * Math.PI; animAlpha = ep; }
                        else if (effect.includes('lightspeed')) { wordX += (1 - ep) * 100 * scale; animAlpha = ep; }
                        else if (effect.includes('blur')) { animBlur = (1 - ep) * 10; animAlpha = ep; }
                        else if (effect.includes('shatter')) { const s = 1 + (1 - ep) * 2; scaleX *= s; scaleY *= s; animBlur = (1 - ep) * 10; animAlpha = ep; }
                        else if (effect.includes('spiral')) { scaleX *= ep; scaleY *= ep; rot += (1 - ep) * Math.PI * 2; }
                    } else if (effect.includes('scale')) {
                        scaleX *= 1.3; scaleY *= 1.3;
                    }
                }

                // Draw
                ctx.save();
                if (animAlpha < 1) ctx.globalAlpha *= animAlpha;
                if (animBlur > 0) ctx.filter = `blur(${animBlur}px)`;

                // Apply Transforms
                if (rot !== 0 || scaleX !== 1 || scaleY !== 1) {
                    const cx = wordX + wWidth / 2;
                    const cy = wordY;
                    ctx.translate(cx, cy);
                    ctx.rotate(rot);
                    ctx.scale(scaleX, scaleY);
                    ctx.translate(-cx, -cy);
                }

                if (shouldHighlight) {
                    // Fancy Draws
                    if (effect === 'karaoke-smooth-plus') {
                        const textEffect = renderConfig.textEffect || 'none';
                        if (isCurrentWord) {
                            const duration = word.endTime - word.startTime;
                            const elapsed = time - word.startTime;
                            const progress = Math.max(0, Math.min(1, elapsed / duration));

                            // Calculate cutoff point
                            const cutoff = wordX + (wWidth * progress);

                            // Decoration Logic: Handle decoration manually inside clipping to avoid gradient issues
                            const decoration = renderConfig?.textDecoration || 'none';
                            const drawSplitDecoration = (color: string) => {
                                if (decoration !== 'none') {
                                    ctx.lineWidth = Math.max(2, 3 * scale);
                                    ctx.strokeStyle = color;
                                    ctx.beginPath();
                                    const dy = wordY + (baseFontSize * 0.45); // Match global offset
                                    if (decoration.includes('underline')) {
                                        ctx.moveTo(wordX, dy);
                                        ctx.lineTo(wordX + wWidth, dy);
                                    }
                                    if (decoration.includes('line-through')) {
                                        ctx.moveTo(wordX, wordY);
                                        ctx.lineTo(wordX + wWidth, wordY);
                                    }
                                    ctx.stroke();
                                }
                            };

                            // Highlighted part (Left side)
                            ctx.save();
                            ctx.beginPath();
                            // Clip highlight region
                            ctx.rect(wordX - 50, wordY - lineHeight, (cutoff - (wordX - 50)), lineHeight * 2);
                            ctx.clip();
                            ctx.fillStyle = highlightColor;
                            drawLineWithEffects(ctx, word.text, wordX, wordY, textEffect);
                            // Draw Highlight Decoration
                            drawSplitDecoration(highlightColor);
                            ctx.restore();

                            // Unhighlighted part (Right side)
                            ctx.save();
                            ctx.beginPath();
                            // Clip unhighlighted region
                            ctx.rect(cutoff, wordY - lineHeight, (wordX + wWidth + 50) - cutoff, lineHeight * 2);
                            ctx.clip();
                            ctx.fillStyle = baseColor;
                            // Draw as standard base text (no effects)
                            ctx.fillText(word.text, wordX, wordY);
                            // Draw Base Decoration
                            drawSplitDecoration(baseColor);
                            ctx.restore();

                            // Suppress global decoration block
                            fill = 'rgba(0,0,0,0)';
                        } else {
                            // Passed Word (Fully Highlighted)
                            ctx.fillStyle = highlightColor;
                            drawLineWithEffects(ctx, word.text, wordX, wordY, textEffect);

                            // Handle decoration here manually to ensure consistency (or let global block handle it?)
                            // If we let global block handle it, it uses '0.45' offset which matches. 
                            // But we need to ensure 'fill' is correct.
                            // 'fill' is currently set to 'baseColor' at top of loop, but we didn't update it to 'highlightColor' for this block?
                            // Wait, 'fill' variable is initialized to baseColor.
                            // In 'karaoke-smooth', fill = highlightColor is set.
                            // Here, we just set ctx.fillStyle.
                            // So we MUST update 'fill' variable to highlightColor so global block picks it up.
                            fill = highlightColor;
                        }
                    } else if (effect.includes('gradient') || effect.includes('chrome') || effect.includes('gold')) {
                        const grad = ctx.createLinearGradient(wordX, wordY - lineHeight / 2, wordX, wordY + lineHeight / 2);
                        if (effect.includes('gold')) { grad.addColorStop(0, '#d4af37'); grad.addColorStop(1, '#C5A028'); }
                        else if (effect.includes('chrome')) { grad.addColorStop(0, '#ebebeb'); grad.addColorStop(0.5, '#616161'); grad.addColorStop(0.51, '#ebebeb'); grad.addColorStop(1, '#ebebeb'); }
                        else { grad.addColorStop(0, highlightColor); grad.addColorStop(1, bgColor); }
                        ctx.fillStyle = grad;
                    }

                    if (effect.includes('shadow')) {
                        ctx.save();
                        ctx.fillStyle = '#000000';
                        ctx.fillText(word.text, wordX + 2 * scale, wordY + 2 * scale);
                        ctx.restore();
                    }

                    if (effect.includes('3d')) {
                        const c = ctx.fillStyle;
                        ctx.fillStyle = 'rgba(0,0,0,0.5)';
                        for (let k = 1; k <= 3; k++) ctx.fillText(word.text, wordX + k * scale, wordY + k * scale);
                        ctx.fillStyle = c;
                    }

                    if (effect.includes('neon-multi')) {
                        ctx.shadowBlur = 10; ctx.shadowColor = '#fff'; ctx.fillText(word.text, wordX, wordY);
                        ctx.shadowBlur = 20; ctx.shadowColor = '#ff00de'; ctx.fillText(word.text, wordX, wordY);
                        ctx.shadowBlur = 35; ctx.shadowColor = '#00ffff'; ctx.fillText(word.text, wordX, wordY);
                    } else if (effect.includes('cyberpunk')) {
                        ctx.save();
                        ctx.fillStyle = '#05d9e8';
                        ctx.fillText(word.text, wordX - 1, wordY - 1);
                        ctx.restore();

                        ctx.save();
                        ctx.fillStyle = '#000000';
                        ctx.fillText(word.text, wordX + 2, wordY + 2);
                        ctx.restore();

                        ctx.fillStyle = '#fcee0a';
                        ctx.fillText(word.text, wordX, wordY);
                    } else if (effect.includes('glitch-text')) {
                        const jitterX = (Math.random() - 0.5) * 5;
                        const jitterY = (Math.random() - 0.5) * 2;

                        ctx.save();
                        ctx.fillStyle = 'red';
                        ctx.fillText(word.text, wordX + jitterX, wordY + jitterY);
                        ctx.restore();

                        ctx.save();
                        ctx.fillStyle = 'cyan';
                        ctx.fillText(word.text, wordX - jitterX, wordY - jitterY);
                        ctx.restore();

                        ctx.fillStyle = '#ffffff';
                        ctx.fillText(word.text, wordX, wordY);
                    } else if (effect.includes('retro') || effect.includes('vhs')) {
                        // Dynamic VHS Drift
                        const drift = Math.sin(time * 5) * 2 * scale;
                        const vJump = Math.random() > 0.95 ? (Math.random() - 0.5) * 5 : 0; // Occasional vertical jitter

                        ctx.globalCompositeOperation = 'screen';
                        ctx.fillStyle = '#ff0000'; ctx.fillText(word.text, wordX - 3 * scale + drift, wordY + vJump);
                        ctx.fillStyle = '#00ff00'; ctx.fillText(word.text, wordX + vJump, wordY - drift);
                        ctx.fillStyle = '#0000ff'; ctx.fillText(word.text, wordX + 3 * scale - drift, wordY + vJump);
                    } else if (effect.includes('fire')) {
                        // Dynamic Fire Animation
                        const flicker = Math.abs(Math.sin(time * 15)) * 5; // 0 to 5 blur variation
                        const moveY = Math.sin(time * 20) * 1 * scale; // Vertical heat wave

                        ctx.shadowBlur = 5 + flicker;
                        ctx.shadowColor = '#ff0000';
                        ctx.fillStyle = '#ff4500';
                        ctx.fillText(word.text, wordX, wordY + moveY);

                        ctx.shadowBlur = 2;
                        ctx.shadowColor = '#ffff00';
                        ctx.fillStyle = '#ffcc00';
                        // Yellow core shifts slightly
                        ctx.fillText(word.text, wordX + (Math.sin(time * 25) * 1 * scale), wordY - 1 * scale + moveY);
                    } else if (effect.includes('typewriter')) {
                        const elapsed = time - word.startTime;
                        // Duration of word play
                        const duration = word.endTime - word.startTime;
                        // 0 to 1 progress
                        const p = Math.min(1, Math.max(0, elapsed / duration));

                        // Calculate characters to show
                        const charsToShow = Math.floor(word.text.length * p);
                        const partialText = word.text.substring(0, charsToShow);

                        // Draw only partial text
                        if (effect.includes('outline')) {
                            ctx.strokeStyle = highlightColor;
                            ctx.strokeText(partialText, wordX, wordY);
                        } else {
                            ctx.fillText(partialText, wordX, wordY);
                        }

                        // Optional cursor?
                        // const tw = ctx.measureText(partialText).width;
                        // ctx.fillRect(wordX + tw, wordY - fontSize/2, 2, fontSize);
                    } else {
                        // Standard Draw
                        if (!effect.includes('neon-multi') && !effect.includes('retro') && !effect.includes('vhs') && !effect.includes('fire')) {
                            if (effect.includes('outline')) {
                                ctx.strokeStyle = highlightColor;
                                ctx.lineWidth = 2 * scale;
                                ctx.strokeText(word.text, wordX, wordY);
                            } else {
                                ctx.fillText(word.text, wordX, wordY);
                            }
                        }
                    }

                } else {
                    ctx.fillText(word.text, wordX, wordY);
                }

                // --- Global Text Decoration (Underline/Line-through) ---
                const decoration = renderConfig?.textDecoration || 'none';
                if (decoration !== 'none') {
                    ctx.lineWidth = Math.max(2, 3 * scale);
                    ctx.strokeStyle = fill; // Use current word fill color
                    ctx.beginPath();

                    if (decoration.includes('underline')) {
                        // Avoid conflict if effect is already underline?
                        // If effect is 'karaoke-underline', we drew a box rect earlier.
                        // But standard global underline is thin line.
                        // Let's draw it if it's not the specific effect to avoid double drawing? 
                        // Or just draw it.
                        if (!effect.includes('underline')) {
                            const dy = wordY + (baseFontSize * 0.45);
                            ctx.moveTo(wordX, dy);
                            ctx.lineTo(wordX + wWidth, dy);
                        }
                    }
                    if (decoration.includes('line-through')) {
                        ctx.moveTo(wordX, wordY);
                        ctx.lineTo(wordX + wWidth, wordY);
                    }
                    ctx.stroke();
                }

                ctx.restore(); // Restore transforms
                ctx.restore(); // Restore styles

                // Advance X (using ORIGINAL width to avoid spacing issues with scale)
                const hasTrailingSpace = word.text.endsWith(' ');

                let addSpace = !hasTrailingSpace;

                const hyphenEndRegex = /[-‐‑‒–—―]$/;
                const hyphenStartRegex = /^[-‐‑‒–—―]/;

                if (hyphenEndRegex.test(word.text.trim())) addSpace = false;
                // Peek next word in this line
                const nextWordInLine = l[j + 1];
                if (nextWordInLine && hyphenStartRegex.test(nextWordInLine.text.trim())) addSpace = false;

                currentX += wWidth + (addSpace ? spaceWidth : 0);
            });

            // Restore alignment and other line-specific context settings
            ctx.restore();
        });
    };

    // ... (Inside drawCanvasFrame)

    const drawWrappedText = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, effect?: string, decoration?: string) => {
        // ... (existing implementation)
        const lines = getWrappedLines(ctx, text, maxWidth);
        const startY = y - ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((l, i) => {
            const lineY = startY + (i * lineHeight);
            if (effect === 'glass') {
                const textWidth = ctx.measureText(l).width;
                ctx.save();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(x - (ctx.textAlign === 'center' ? textWidth / 2 : ctx.textAlign === 'right' ? textWidth : 0) - 10, lineY - lineHeight / 2, textWidth + 20, lineHeight, 8);
                else ctx.rect(x - (ctx.textAlign === 'center' ? textWidth / 2 : ctx.textAlign === 'right' ? textWidth : 0) - 10, lineY - lineHeight / 2, textWidth + 20, lineHeight);
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

    if (customFontName) fontFamily = 'CustomFont, sans-serif';
    if (renderConfig && renderConfig.fontFamily !== 'sans-serif') fontFamily = renderConfig.fontFamily;

    const isPortrait = width <= height;
    // Adaptive scale for all resolutions (based on 1080p standard)
    const scale = Math.min(width, height) / 1080;

    // Set base background - default to black for timeline/custom to avoid color leaks
    if (renderConfig && (renderConfig.backgroundSource === 'color' || renderConfig.backgroundSource === 'smart-gradient')) {
        ctx.fillStyle = renderConfig.backgroundColor || '#000000';
    } else {
        ctx.fillStyle = '#000000';
    }
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
    } else if (renderConfig?.backgroundSource === 'image' && renderConfig.backgroundImage) {
        // Draw custom background image
        // We expect it to be loaded with key '__custom_bg__'
        const img = images.get('__custom_bg__');
        if (img) {
            drawScaled(img);
        }
    }



    if (renderConfig && renderConfig.backgroundBlurStrength > 0) ctx.filter = `blur(${renderConfig.backgroundBlurStrength}px)`;
    else if (isBlurEnabled) ctx.filter = 'blur(12px)'; // Fallback for legacy
    if (renderConfig ? (renderConfig.backgroundSource === 'timeline' || renderConfig.backgroundSource === 'custom') : true) {
        const useTimeline = renderConfig ? renderConfig.backgroundSource === 'timeline' : false;
        let drawnAny = false;

        if (useTimeline) {
            // 1. Determine Transition Config
            const transitionType = renderConfig?.visualTransitionType || 'none';
            const transitionDuration = renderConfig?.visualTransitionDuration || 1.0;

            // 2. Select Slides: Include active AND fading-out slides if transition is enabled
            // 'fading out' means: currently AFTER endTime but within transitionDuration
            const activeSlides = visualSlides.filter(s => {
                if (s.type === 'audio') return false;
                const isActive = time >= s.startTime && time < s.endTime;
                if (isActive) return true;
                if (transitionType === 'crossfade') {
                    // Check if in fade-out tail
                    if (time >= s.endTime && time < s.endTime + transitionDuration) return true;
                    // Note: Fade-in head is naturally handled because time >= startTime matches isActive.
                    // We don't need to look ahead before startTime, logic handles fading IN during the start of the clip.
                }
                return false;
            });

            // 3. Sort Slides
            // Sort by Layer first (higher layer on top)
            // Then by Start Time (later start time on top -> essential for crossfades of sequential clips)
            activeSlides.sort((a, b) => {
                const layerDiff = (a.layer || 0) - (b.layer || 0);
                if (layerDiff !== 0) return layerDiff;
                return a.startTime - b.startTime;
            });

            if (activeSlides.length > 0) {
                activeSlides.forEach(slide => {
                    // Check visibility
                    const layer = slide.layer || 0;
                    if (renderConfig && renderConfig.layerVisibility?.visual?.[layer] === false) return;

                    const vid = slide.type === 'video' ? videos.get(slide.id) : null;
                    const img = slide.type !== 'video' ? images.get(slide.id) : null;

                    // Calculate Opacity
                    let opacity = 1.0;

                    if (transitionType !== 'none') {
                        // Fade In (Start)
                        if (time < slide.startTime + transitionDuration) {
                            const prog = (time - slide.startTime) / transitionDuration;
                            opacity = Math.max(0, Math.min(1, prog));
                        }

                        // Fade Out (End) - applies if time is approaching endTime or past it
                        // For 'crossfade', we extend past endTime.
                        // For 'fade-to-black', we fade out leading up to endTime?
                        // Actually, 'fade-to-black' is usually disjoint.
                        // Impl: If we are past endTime (extended tail), we fade out.
                        // Does 'fade-to-black' imply fading out BEFORE endTime?
                        // Usually yes. But if we extend, we can fade out AFTER.
                        // Let's stick to Extend-Logic for both to be robust for abutted clips.

                        // IF we are in the "Tail" (time >= s.endTime):
                        if (time >= slide.endTime) {
                            // NEW: Check for adjacent coverage to prevent dip
                            let isCovered = false;
                            if (transitionType === 'crossfade') {
                                isCovered = visualSlides.some(other =>
                                    other.id !== slide.id &&
                                    (other.layer || 0) === (slide.layer || 0) &&
                                    other.startTime >= slide.endTime - 0.1 &&
                                    other.startTime < slide.endTime + 0.2
                                );
                            }

                            if (isCovered) {
                                // Hold Opacity
                            } else {
                                const past = time - slide.endTime;
                                const prog = 1 - (past / transitionDuration);
                                opacity = Math.min(opacity, Math.max(0, Math.min(1, prog)));
                            }
                        } else if (transitionType === 'fade-to-black') {
                            // If fade-to-black, we ALSO fade out approaching endTime (to create the dip)
                            // Logic: Fade Out during last transitionDuration seconds of the clip itself?
                            // No, let's keep it simple. If 'fade-to-black' is selected, we assume gaps or we force dip.
                            // If we force dip: fade out during last T seconds of clip?
                            // If clip is 5s, fade is 1s.
                            // 0-1 Fade In. 4-5 Fade Out.
                            // If clips abut (0-5, 5-10):
                            // A fades out 4-5. B fades in 5-6.
                            // Midpoint 5: A is 0. B is 0. Black. Correct.
                            // So for 'fade-to-black', we modify opacity based on (endTime - time).
                            if (time > slide.endTime - transitionDuration) {
                                const prog = (slide.endTime - time) / transitionDuration;
                                opacity = Math.min(opacity, Math.max(0, Math.min(1, prog)));
                            }
                        }
                    }

                    if (opacity > 0) {
                        ctx.save();
                        ctx.globalAlpha = opacity;
                        if (vid) drawScaled(vid);
                        else if (img) drawScaled(img);
                        ctx.restore();
                    }
                });
                drawnAny = true;
            }
        }

        if (!drawnAny && metadata.coverUrl && (visualSlides.length === 0 || !useTimeline)) {
            const vid = metadata.backgroundType === 'video' ? videos.get('background') : null;
            const img = images.get('cover');
            if (vid) drawScaled(vid); else if (img) drawScaled(img);
        }
    }
    if ((renderConfig && renderConfig.backgroundBlurStrength > 0) || isBlurEnabled) ctx.filter = 'none';

    if (!['just_video', 'none'].includes(activePreset) && !renderConfig?.useRealColorMedia) {
        ctx.fillStyle = (renderConfig && (renderConfig.backgroundSource === 'color' || renderConfig.backgroundSource === 'gradient')) ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, width, height);
    }

    // --- Feature: Bottom-to-Top Black Gradient Overlay ---
    if (renderConfig?.enableGradientOverlay) {
        // Gradient from Bottom (Black) to Top (Transparent)
        // Helps with subtitle readability.
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.95)'); // Strong black at bottom
        gradient.addColorStop(0.35, 'rgba(0, 0, 0, 0.6)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0)'); // Fade to transparent

        ctx.fillStyle = gradient;
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

    const introContent = renderConfig?.introMode === 'manual' && renderConfig.introText
        ? renderConfig.introText
        : `${metadata.title}\n${metadata.artist}`;

    let showIntroTitle = (
        activeIdx === -1 &&
        time < 5 &&
        (renderConfig?.showIntro ?? true) &&
        (renderConfig?.introMode !== 'manual' || isFirstSongInPlaylist) &&
        (lyrics.length === 0 || time < lyrics[0].time)
    );

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
            centerY = height * (0.15 * (renderConfig.marginTopScale ?? 1.0)); // Adjusted to be closer to top edge
        } else if (renderConfig?.contentPosition === 'bottom') {
            centerY = height * (1 - (0.1 * (renderConfig.marginBottomScale ?? 1.0))); // Adjusted to be closer to bottom edge (Subtitle standard)
        }

        let activeLineShift = 0;
        const isBigLayout = ['large', 'large_upper', 'big_center', 'metal', 'kids', 'sad', 'romantic', 'tech', 'gothic', 'testing', 'testing_up', 'one_line', 'one_line_up', 'custom'].includes(activePreset);

        if (isBigLayout || activePreset === 'slideshow' || activePreset === 'subtitle') {
            const activeLine = showIntroTitle ? { time: 0, text: introContent } : (lyrics[activeIdx] || lyrics[virtualActiveIdx]);
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

        // --- DYNAMIC POSITIONING to prevent overlap ---
        const yMap = new Map<number, number>();
        const hMap = new Map<number, number>();
        const shouldUseDynamicLayout = true; // Use simple stacking for guaranteed no-overlap

        if (shouldUseDynamicLayout) {
            const gap = Math.max((isPortrait ? 30 : 40) * scale, lineSpacing - baseFontSize);

            // 1. Measure all lines in range
            for (let i = startI; i <= endI; i++) {
                let h = 0;
                let isCurr = false;

                if (showIntroTitle && i === 0) {
                    const titleLH = baseFontSize * 1.2;
                    const artistLH = secondaryFontSize * 1.2;
                    const parts = introContent.split('\n');
                    const hasArtist = parts.length > 1;
                    h = titleLH + (hasArtist ? artistLH : 0);
                    isCurr = true; // Intro is "current"
                } else {
                    const idx = virtualActiveIdx + i;
                    if (idx >= 0 && idx < lyrics.length) {
                        const line = lyrics[idx];
                        isCurr = (idx === activeIdx);

                        const fs = isCurr ? baseFontSize : secondaryFontSize;
                        let weight = isCurr ? (['large', 'large_upper', 'big_center', 'metal', 'tech'].includes(activePreset) ? '900' : 'bold') : '400';
                        let style = (['classic', 'romantic'].includes(activePreset)) ? 'italic' : 'normal';

                        if (activePreset === 'custom') {
                            const targetMode = renderConfig?.lyricStyleTarget || 'active-only';
                            const shouldApply = targetMode === 'all' || isCurr;
                            if (shouldApply) {
                                if (renderConfig?.fontWeight) weight = renderConfig.fontWeight;
                                if (renderConfig?.fontStyle) style = renderConfig.fontStyle;
                            } else {
                                weight = '400';
                                style = 'normal';
                            }
                        }

                        ctx.font = `${style} ${weight} ${fs}px ${fontFamily}`;

                        let text = line.text;
                        let casing = renderConfig?.textCase || 'none';
                        if (casing === 'none' && isCurr && ['large_upper', 'big_center', 'metal', 'tech', 'testing_up', 'one_line_up'].includes(activePreset)) {
                            casing = 'upper';
                        }

                        if (casing === 'upper') text = text.toUpperCase();
                        else if (casing === 'lower') text = text.toLowerCase();
                        else if (casing === 'title') text = text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
                        else if (casing === 'sentence') text = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
                        else if (casing === 'invert') text = text.replace(/\w\S*/g, (txt) => txt.charAt(0).toLowerCase() + txt.slice(1).toUpperCase());

                        const lines = getWrappedLines(ctx, text, width * 0.9);
                        h = lines.length * (fs * 1.2);
                    }
                }
                hMap.set(i, h);
            }

            // 2. Calculate Y Positions
            yMap.set(0, centerY);

            // Downwards
            for (let i = 1; i <= endI; i++) {
                const prevY = yMap.get(i - 1) ?? centerY;
                const prevH = hMap.get(i - 1) ?? 0;
                const curH = hMap.get(i) ?? 0;
                yMap.set(i, prevY + (prevH / 2) + gap + (curH / 2));
            }

            // Upwards
            for (let i = -1; i >= startI; i--) {
                const nextY = yMap.get(i + 1) ?? centerY;
                const nextH = hMap.get(i + 1) ?? 0;
                const curH = hMap.get(i) ?? 0;
                yMap.set(i, nextY - (nextH / 2) - gap - (curH / 2));
            }
        }

        for (let i = startI; i <= endI; i++) {
            let line: LyricLine | null = null;
            let isCurrent = false;

            if (showIntroTitle) {
                if (i === 0) {
                    line = { time: 0, text: introContent };
                    isCurrent = true;
                }
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
                    if (renderConfig?.highlightEffect === 'karaoke-smooth-white') {
                        fillStyle = '#ffffff';
                    } else {
                        const rgb = hexToRgb(baseColorHex);
                        fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
                    }
                }

                let weight = isCurrent ? (['large', 'large_upper', 'big_center', 'metal', 'tech'].includes(activePreset) ? '900' : 'bold') : '400';
                let style = (['classic', 'romantic'].includes(activePreset)) ? 'italic' : 'normal';
                let decoration = 'none';

                if (activePreset === 'custom' || activePreset === 'default') {
                    const targetMode = renderConfig?.lyricStyleTarget || 'active-only';
                    const shouldApply = targetMode === 'all' || isCurrent;
                    if (shouldApply) {
                        if (renderConfig?.fontWeight) weight = renderConfig.fontWeight;
                        if (renderConfig?.fontStyle) style = renderConfig.fontStyle;
                        if (renderConfig?.textDecoration) decoration = renderConfig.textDecoration;
                    } else {
                        weight = '400';
                        style = 'normal';
                        decoration = 'none';
                    }
                }

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
                let textToDraw = line.text;

                // Determine casing
                let casing = renderConfig?.textCase || 'none';

                // Fallback to preset defaults if 'none'
                if (casing === 'none' && isCurrent && ['large_upper', 'big_center', 'metal', 'tech', 'testing_up', 'one_line_up'].includes(activePreset)) {
                    casing = 'upper';
                }

                // Apply casing
                if (casing === 'upper') textToDraw = textToDraw.toUpperCase();
                else if (casing === 'lower') textToDraw = textToDraw.toLowerCase();
                else if (casing === 'title') {
                    textToDraw = textToDraw.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
                }
                else if (casing === 'sentence') {
                    textToDraw = textToDraw.charAt(0).toUpperCase() + textToDraw.slice(1).toLowerCase();
                }
                else if (casing === 'invert') {
                    textToDraw = textToDraw.replace(/\w\S*/g, (txt) => txt.charAt(0).toLowerCase() + txt.slice(1).toUpperCase());
                }

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
                let yPos = 0;

                if (yMap.has(i)) {
                    yPos = yMap.get(i)! + (i === 0 ? offsetY : 0);
                } else {
                    // Fallback (Legacy)
                    yPos = (activePreset === 'subtitle' && i === 0 && renderConfig?.lyricDisplayMode !== 'all')
                        ? (height - 140 * scale)
                        : (centerY + (i * lineSpacing) + (i === 0 ? offsetY : 0));

                    if (activePreset !== 'custom') {
                        if (i < 0) yPos -= activeLineShift; else if (i > 0) yPos += activeLineShift;
                    }
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

                const isAutoIntro = showIntroTitle && i === 0 && renderConfig?.introMode !== 'manual';

                if (isAutoIntro) {
                    const parts = textToDraw.split('\n');
                    const titleStr = parts[0];
                    const artistStr = parts.slice(1).join('\n');

                    const titleLH = baseFontSize * 1.2;
                    const artistLH = secondaryFontSize * 1.2;

                    // Center the block around yPos
                    // If artist exists, shift title up and artist down
                    const gap = 20 * scale;
                    let titleY = yPos;
                    if (artistStr) {
                        titleY = yPos - (artistLH / 2) - (gap / 2);
                    }
                    const artistY = yPos + (titleLH / 2) + (gap / 2);

                    // Draw Title (Keep current weight)
                    ctx.font = `${style} ${weight} ${baseFontSize}px ${fontFamily}`;
                    drawWrappedText(ctx, titleStr, xPos, titleY, width * 0.9, titleLH, textEffect, decoration);

                    // Draw Artist (Smaller/Normal weight)
                    if (artistStr) {
                        // Use '400' weight for artist to match "next line" look, unless explicitly custom
                        const artistWeight = (activePreset === 'custom' && renderConfig?.fontWeight) ? renderConfig.fontWeight : '400';
                        ctx.font = `${style} ${artistWeight} ${secondaryFontSize}px ${fontFamily}`;
                        drawWrappedText(ctx, artistStr, xPos, artistY, width * 0.9, artistLH, textEffect, decoration);
                    }

                } else {
                    const fs = isCurrent ? baseFontSize : secondaryFontSize;
                    const isKaraokeMode = renderConfig && renderConfig.highlightEffect && renderConfig.highlightEffect !== 'none';

                    if (isCurrent && line) {
                        drawKaraokeText(ctx, line, xPos, yPos, width * 0.9, fs * (renderConfig?.lyricLineHeight || 1.2), time, renderConfig!, fontFamily, fs, weight, style, scale);
                    } else {
                        drawWrappedText(ctx, textToDraw, xPos, yPos, width * 0.9, fs * (renderConfig?.lyricLineHeight || 1.2), textEffect, decoration);
                    }
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
            // Fixed double channel info issue: Disabled duplicate rendering block
            if (false && renderConfig?.showChannelInfo && !['subtitle', 'just_video', 'none'].includes(activePreset)) {
                const cPos = renderConfig.channelInfoPosition || 'bottom-right';
                const cStyle = renderConfig.channelInfoStyle || 'classic';
                const cScale = (renderConfig.channelInfoSizeScale ?? 1.0);
                const marginScale = (renderConfig.channelInfoMarginScale ?? 1.0);

                const cImg = images.get('__channel_info__');
                const cText = renderConfig.channelInfoText;

                // Early exit if nothing to draw
                if (!cImg && !cText) { } // Do nothing
                else if (cStyle === 'logo' && !cImg) { }
                else if (cStyle === 'minimal' && !cText) { }
                else {
                    ctx.save();

                    const margin = 40 * scale * marginScale;
                    const imgSize = 80 * scale * cScale;
                    // Modern/Col style might want larger image?
                    const finalImgSize = (cStyle === 'modern' || cStyle === 'logo') ? imgSize * 1.2 : imgSize;

                    const fontSize = 20 * scale * cScale;
                    // Check for pre-loaded SVG text image
                    const cTextSvgImg = images.get('__channel_info_text_svg__');
                    const isSvgText = !!cTextSvgImg;

                    let textW = 0;
                    let textH = fontSize; // Approximate cap height

                    if (isSvgText && cTextSvgImg) {
                        // SVG Logic: Height should match the visual font size block
                        // Since our generated SVG is based on font-metrics, the height roughly equals the line-height/cap-height
                        // In App.tsx generation we used 100px.
                        // Here we want it to match 'fontSize' (e.g. 20px).
                        // But wait, the generated SVG includes 1.5em icons which might be taller than text.
                        // We should scale HEIGHT relative to fontSize but respect aspect ratio.
                        // If the SVG was generated with 100px font, and results in H height.
                        // We want to draw it with height `fontSize * (H/100)`.
                        // Actually, simplest is to just anchor on fontSize.
                        // Let's assume the "Text" part is the anchor.
                        // If we set textH = fontSize, it might clip if the icon is 1.5em.
                        // So textH should probably be slightly larger?
                        // Actually, if we just keep aspect ratio, we can define height freely.
                        // Let's set the height of the drawn image to be e.g. 1.5 * fontSize to accommodate the icons safely?
                        // Or just use the aspect ratio?
                        // Let's standardize on the height being 1.5 * fontSize (since icon is 1.5em).
                        // Or better, let's trust the input image aspect ratio.

                        // The generated image corresponds to font-size 100.
                        // We want to render at `fontSize`.
                        // So the target height (in canvas pixels) is roughly `fontSize` but accounting for the icon.
                        // If we assume the CONTENT height is dominated by the 1.5em icon.
                        // Then correct drawing height is `fontSize * 1.5`.
                        textH = fontSize * 1.5;
                        const ratio = cTextSvgImg.width / cTextSvgImg.height;
                        textW = textH * ratio;
                    } else {
                        ctx.font = `bold ${fontSize}px sans-serif`;
                        if (cText && cStyle !== 'logo') {
                            textW = ctx.measureText(cText).width;
                        }
                    }

                    const gap = 12 * scale * cScale;
                    const padX = 12 * scale * cScale;
                    const padY = 8 * scale * cScale;

                    // Calculate Block Dimensions (Box)
                    let blockW = 0;
                    let blockH = 0;

                    if (cStyle === 'modern') {
                        // Col
                        const contentW = Math.max((cImg ? finalImgSize : 0), textW);
                        blockW = contentW + (padX * 2);
                        const contentH = (cImg ? finalImgSize : 0) + (cText ? fontSize * 1.5 + (cImg ? gap : 0) : 0);
                        blockH = contentH + (padY * 2);
                    } else if (cStyle === 'logo') {
                        blockW = finalImgSize + (padX * 2);
                        blockH = finalImgSize + (padY * 2);
                    } else if (cStyle === 'minimal') {
                        blockW = textW + (padX * 2);
                        blockH = textH + (padY * 2); // Text only
                    } else {
                        // Row (Classic, Box, Circle)
                        const contentW = (cImg ? finalImgSize : 0) + (cText ? textW + (cImg ? gap : 0) : 0);
                        blockW = contentW + (padX * 2);
                        const contentH = Math.max((cImg ? finalImgSize : 0), textH);
                        blockH = contentH + (padY * 2);
                    }

                    // Determine Anchor
                    let anchorX = 0;
                    let anchorY = 0;

                    if (cPos.includes('left')) anchorX = margin;
                    else if (cPos.includes('right')) anchorX = width - margin;
                    else anchorX = width / 2;

                    if (cPos.includes('top')) anchorY = margin;
                    else anchorY = height - margin;

                    // Determine Box Layout
                    let boxX = 0;
                    let boxY = 0;

                    if (cPos.includes('left')) boxX = anchorX;
                    else if (cPos.includes('right')) boxX = anchorX - blockW;
                    else boxX = anchorX - (blockW / 2);

                    if (cPos.includes('top')) boxY = anchorY;
                    else boxY = anchorY - blockH;

                    // Draw Background Box
                    if (cStyle === 'box') {
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                        ctx.shadowColor = 'rgba(0,0,0,0.3)';
                        ctx.shadowBlur = 10;
                        ctx.beginPath();
                        ctx.roundRect(boxX, boxY, blockW, blockH, 12 * scale);
                        ctx.fill();
                        ctx.shadowBlur = 0;
                        // Border
                        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    } else if (cStyle !== 'minimal' && cStyle !== 'logo') {
                        // Background Pill? Classic usually has bg in app preview.
                        // App.tsx preview has 'bg-black/20 rounded-lg'.
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                        ctx.beginPath();
                        ctx.roundRect(boxX, boxY, blockW, blockH, 8 * scale);
                        ctx.fill();
                    }

                    // Draw Content
                    const contentStartX = boxX + padX;
                    const contentStartY = boxY + padY;
                    const contentW = blockW - (padX * 2);
                    const contentH = blockH - (padY * 2);

                    if (cStyle === 'modern') {
                        // Column
                        const centerX = contentStartX + (contentW / 2);
                        let currentY = contentStartY;

                        // Image
                        if (cImg) {
                            const imgX = centerX - (finalImgSize / 2);
                            ctx.save();
                            ctx.beginPath();
                            // Circle check? Modern usually square/rounded in logic but circle in style? 
                            // RenderSettings options: 'circle' is a separate style. Modern is Col.
                            ctx.roundRect(imgX, currentY, finalImgSize, finalImgSize, 12 * scale);
                            ctx.clip();
                            ctx.drawImage(cImg, imgX, currentY, finalImgSize, finalImgSize);
                            ctx.restore();
                            currentY += finalImgSize + gap;
                        }

                        // Text
                        if (cText) {
                            if (isSvgText && cTextSvgImg) {
                                const imgX = centerX - (textW / 2);
                                // Center vertically in remaining space?
                                ctx.drawImage(cTextSvgImg, imgX, currentY, textW, textH);
                            } else {
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'top';
                                ctx.fillStyle = '#ffffff';
                                ctx.font = `bold ${fontSize}px sans-serif`;
                                ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4;
                                ctx.fillText(cText, centerX, currentY);
                            }
                        }

                    } else if (cStyle === 'logo') {
                        if (cImg) {
                            ctx.drawImage(cImg, contentStartX, contentStartY, finalImgSize, finalImgSize);
                        }
                    } else if (cStyle === 'minimal') {
                        // Text only
                        if (cText) {
                            if (isSvgText && cTextSvgImg) {
                                ctx.drawImage(cTextSvgImg, contentStartX, contentStartY, textW, textH);
                            } else {
                                ctx.textAlign = 'left';
                                ctx.textBaseline = 'top';
                                ctx.fillStyle = '#ffffff';
                                ctx.font = `bold ${fontSize}px sans-serif`;
                                ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4;
                                ctx.fillText(cText, contentStartX, contentStartY);
                            }
                        }
                    } else {
                        // Row (Classic, Box, Circle)
                        let drawX = contentStartX;
                        const centerY = contentStartY + (contentH / 2);

                        if (cImg) {
                            const imgY = centerY - (finalImgSize / 2);
                            ctx.save();
                            ctx.beginPath();
                            if (cStyle === 'circle') ctx.arc(drawX + finalImgSize / 2, imgY + finalImgSize / 2, finalImgSize / 2, 0, Math.PI * 2);
                            else ctx.roundRect(drawX, imgY, finalImgSize, finalImgSize, 8 * scale);
                            ctx.clip();
                            ctx.drawImage(cImg, drawX, imgY, finalImgSize, finalImgSize);
                            ctx.restore();
                            drawX += finalImgSize + gap;
                        }

                        if (cText) {
                            const textY = centerY - (textH / 2);
                            if (isSvgText && cTextSvgImg) {
                                ctx.drawImage(cTextSvgImg, drawX, textY, textW, textH);
                            } else {
                                ctx.textAlign = 'left';
                                ctx.textBaseline = 'middle'; // Center in row
                                ctx.fillStyle = '#ffffff';
                                ctx.font = `bold ${fontSize}px sans-serif`;
                                ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4;
                                // Use centerY for middle baseline
                                ctx.fillText(cText, drawX, centerY);
                            }
                        }
                    }

                    ctx.restore();
                }
            }

            if (activePreset === 'custom' || activePreset === 'default') {
                // --- CUSTOM FLEXIBLE LAYOUT ---
                // --- CUSTOM FLEXIBLE LAYOUT ---
                const pos = renderConfig?.infoPosition || 'top-left';
                const style = renderConfig?.infoStyle || 'classic';
                const isBox = style === 'box';
                const borderRadius = isBox ? 16 * scale : 12 * scale;
                const margin = 40 * scale * (renderConfig?.infoMarginScale ?? 1);

                let align: 'left' | 'center' | 'right' = 'left';
                let vertical: 'top' | 'bottom' = 'top';

                if (pos.includes('left')) align = 'left';
                else if (pos.includes('right')) align = 'right';
                else align = 'center';

                if (pos.includes('top')) vertical = 'top';
                else vertical = 'bottom';

                const infoScale = (renderConfig?.infoSizeScale ?? 1);
                const coverSize = ((style === 'minimal' || style === 'modern') ? 0 : 100 * scale) * infoScale;
                const hasCover = showCover && coverSize > 0 && (metadata.coverUrl !== null);
                const coverImg = hasCover ? (metadata.backgroundType === 'video' ? videos.get('background') : images.get('cover')) : null;

                const titleBaseSize = (style === 'minimal' ? 20 : (style === 'modern' || style === 'modern_art') ? 40 : 28) * scale;
                const artistBaseSize = (style === 'minimal' ? 14 : (style === 'modern' || style === 'modern_art') ? 24 : 18) * scale;

                const titleSize = titleBaseSize * infoScale;
                const artistSize = artistBaseSize * infoScale;

                const infoFont = renderConfig?.infoFontFamily || fontFamily;
                const infoWeight = renderConfig?.infoFontWeight || 'bold';
                const infoFontStyle = renderConfig?.infoFontStyle || 'normal';

                const titleFont = `${infoFontStyle} ${infoWeight} ${titleSize}px ${infoFont}`;
                const artistFont = `${infoFontStyle} ${infoWeight} ${artistSize}px ${infoFont}`;

                const gap = 20 * scale;
                const padding = isBox ? 24 * scale : 0;

                const mainColor = renderConfig?.infoFontColor || '#ffffff';
                const artistColor = (style === 'modern' || style === 'modern_art') ? mainColor : (renderConfig?.infoFontColor || '#d4d4d8');

                // Measure Text
                ctx.font = titleFont;
                const titleMetrics = ctx.measureText(metadata.title);
                const titleW = renderConfig?.showTitle ? titleMetrics.width : 0;

                ctx.font = artistFont;
                const artistMetrics = ctx.measureText(metadata.artist);
                const artistW = renderConfig?.showArtist ? artistMetrics.width : 0;

                // Calculate Block Dimensions
                let blockW = 0;
                let blockH = 0;

                if (align === 'center') {
                    // Stacked (Vertical)
                    const contentW = Math.max(
                        (hasCover && coverImg ? coverSize : 0),
                        titleW,
                        artistW
                    );
                    blockW = contentW + (padding * 2);

                    let contentH = 0;
                    if (hasCover && coverImg) contentH += coverSize;
                    if (renderConfig?.showTitle ?? true) contentH += (hasCover && coverImg ? gap : 0) + titleSize;
                    if (renderConfig?.showArtist ?? true) contentH += ((hasCover && coverImg || (renderConfig?.showTitle ?? true)) ? 5 * scale : 0) + artistSize;

                    blockH = contentH + (padding * 2);
                } else {
                    // Side-by-Side
                    const textW = Math.max(titleW, artistW);
                    const coverW = (hasCover && coverImg) ? coverSize + gap : 0;
                    blockW = coverW + textW + (padding * 2);

                    const textH = (renderConfig?.showTitle ? titleSize : 0) + (renderConfig?.showArtist ? artistSize + 5 * scale : 0);
                    const coverH = (hasCover && coverImg) ? coverSize : 0;
                    blockH = Math.max(textH, coverH) + (padding * 2);
                }

                // Determine Layout Anchor Point (X, Y) 
                // X, Y represents the specific corner based on alignment
                let anchorX = 0;
                let anchorY = 0;

                if (align === 'left') anchorX = margin;
                else if (align === 'right') anchorX = width - margin;
                else anchorX = width / 2;

                if (vertical === 'top') anchorY = margin;
                else anchorY = height - margin;

                // Determine Top-Left of Box for Drawing
                let boxX = 0;
                let boxY = 0;

                if (align === 'left') boxX = anchorX;
                else if (align === 'right') boxX = anchorX - blockW;
                else boxX = anchorX - (blockW / 2);

                if (vertical === 'top') boxY = anchorY;
                else boxY = anchorY - blockH;

                // DRAW BOX BACKGROUND
                if (isBox) {
                    ctx.save();
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Semi-transparent black box
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.shadowBlur = 20;
                    ctx.beginPath();
                    ctx.roundRect(boxX, boxY, blockW, blockH, borderRadius);
                    ctx.fill();
                    ctx.restore();
                }

                // DRAW CONTENT
                // We draw relative to boxX, boxY + padding
                const contentStartX = boxX + padding;
                const contentStartY = boxY + padding;
                const contentW = blockW - (padding * 2);
                const contentH = blockH - (padding * 2);

                if (align === 'center') {
                    // Stacked
                    let currentY = contentStartY;

                    // Center vertically if needed? No, stacked flows. But let's center items horizontally in the block.
                    const centerX = contentStartX + (contentW / 2);
                    ctx.textAlign = 'center';

                    if (vertical === 'top') {
                        // Image -> Title -> Artist
                        if (hasCover && coverImg) {
                            ctx.save();
                            ctx.beginPath();
                            const imgX = centerX - (coverSize / 2);
                            if (style === 'circle_art') ctx.arc(centerX, currentY + coverSize / 2, coverSize / 2, 0, Math.PI * 2);
                            else ctx.roundRect(imgX, currentY, coverSize, coverSize, borderRadius / 2);
                            ctx.clip();
                            ctx.drawImage(coverImg, imgX, currentY, coverSize, coverSize);
                            ctx.restore();
                            currentY += coverSize + gap;
                        }
                        if (renderConfig?.showTitle ?? true) {
                            ctx.fillStyle = mainColor; ctx.font = titleFont; ctx.textBaseline = 'top';
                            ctx.fillText(metadata.title, centerX, currentY);
                            currentY += titleSize + 5 * scale;
                        }
                        if (renderConfig?.showArtist ?? true) {
                            ctx.fillStyle = artistColor; ctx.font = artistFont; ctx.textBaseline = 'top';
                            ctx.fillText(metadata.artist, centerX, currentY);
                        }
                    } else {
                        // Bottom (Artist -> Title -> Image) (Visual Order Upwards in standard UI, but here we draw downwards?)
                        // If vertical is bottom, we usually stack upwards from bottom. 
                        // But our BoxY calculation ensures the Box is placed ABOVE the margin.
                        // So inside the box, we can just draw Top-Down as usual or specifically reverse?
                        // Standard UI: Image is Usually "Top" relative to text, even at bottom?
                        // Actually, lines 797-821 (original) reversed the order: Artist -> Title -> Image (Drawing upwards).
                        // Let's stick to standard "Image on Top" flow inside the box, unless it looks weird at bottom.
                        // Usually "Image on Top" is fine even at bottom.
                        // Let's keep Image -> Title -> Artist flow inside the box for consistency.

                        if (hasCover && coverImg) {
                            ctx.save(); ctx.beginPath();
                            const imgX = centerX - (coverSize / 2);
                            if (style === 'circle_art') ctx.arc(centerX, currentY + coverSize / 2, coverSize / 2, 0, Math.PI * 2);
                            else ctx.roundRect(imgX, currentY, coverSize, coverSize, borderRadius / 2);
                            ctx.clip();
                            ctx.drawImage(coverImg, imgX, currentY, coverSize, coverSize);
                            ctx.restore();
                            currentY += coverSize + gap;
                        }
                        if (renderConfig?.showTitle ?? true) {
                            ctx.fillStyle = mainColor; ctx.font = titleFont; ctx.textBaseline = 'top';
                            ctx.fillText(metadata.title, centerX, currentY);
                            currentY += titleSize + 5 * scale;
                        }
                        if (renderConfig?.showArtist ?? true) {
                            ctx.fillStyle = artistColor; ctx.font = artistFont; ctx.textBaseline = 'top';
                            ctx.fillText(metadata.artist, centerX, currentY);
                        }
                    }

                } else {
                    // Side-by-Side (Left or Right)
                    // Image Left, Text Right (Always? Or flips for Right Align?)
                    // Original code: Image was "outer" side?
                    // Left Align: Img [Gap] Text
                    // Right Align: Text [Gap] Img

                    const isRight = align === 'right';

                    // Vertical Center of Block
                    const centerY = contentStartY + (contentH / 2);

                    let drawX = contentStartX;
                    if (isRight) drawX = contentStartX + contentW; // Start from right edge

                    // Draw Cover
                    if (hasCover && coverImg) {
                        const imgY = centerY - (coverSize / 2);
                        const imgX = isRight ? (drawX - coverSize) : drawX;

                        ctx.save(); ctx.beginPath();
                        if (style === 'circle_art') ctx.arc(imgX + coverSize / 2, imgY + coverSize / 2, coverSize / 2, 0, Math.PI * 2);
                        else ctx.roundRect(imgX, imgY, coverSize, coverSize, borderRadius / 2);
                        ctx.clip();
                        ctx.drawImage(coverImg, imgX, imgY, coverSize, coverSize);
                        ctx.restore();

                        if (isRight) drawX -= (coverSize + gap);
                        else drawX += (coverSize + gap);
                    }

                    // Draw Text
                    // Calculate Text block height to center it
                    const textH = (renderConfig?.showTitle ? titleSize : 0) + (renderConfig?.showArtist ? artistSize + 5 * scale : 0);
                    let textStartY = centerY - (textH / 2);

                    ctx.textAlign = isRight ? 'right' : 'left';
                    ctx.textBaseline = 'top';

                    if (renderConfig?.showTitle ?? true) {
                        ctx.fillStyle = mainColor; ctx.font = titleFont;
                        ctx.fillText(metadata.title, drawX, textStartY);
                        textStartY += titleSize + 5 * scale;
                    }
                    if (renderConfig?.showArtist ?? true) {
                        ctx.fillStyle = artistColor; ctx.font = artistFont;
                        ctx.fillText(metadata.artist, drawX, textStartY);
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
                        const infoFont = renderConfig?.infoFontFamily || fontFamily;
                        const infoColor = renderConfig?.infoFontColor || '#ffffff';
                        const artistColor = renderConfig?.infoFontColor || '#d4d4d8'; // Use custom if set

                        const infoFontWeight = renderConfig?.infoFontWeight || 'bold';
                        const infoFontStyle = renderConfig?.infoFontStyle || 'normal';

                        if (renderConfig?.showTitle ?? true) {
                            ctx.font = `${infoFontStyle} ${infoFontWeight} ${(isSq ? 26 : 36) * scale}px ${infoFont}`; ctx.fillStyle = infoColor;
                            ctx.fillText(metadata.title, centerX, titleY);
                        }
                        if (renderConfig?.showArtist ?? true) {
                            ctx.font = `${infoFontStyle} ${infoFontWeight} ${(isSq ? 18 : 24) * scale}px ${infoFont}`; ctx.fillStyle = artistColor;
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
                        const infoFont = renderConfig?.infoFontFamily || fontFamily;
                        const infoColor = renderConfig?.infoFontColor || '#ffffff';
                        const artistColor = renderConfig?.infoFontColor || '#d4d4d8';

                        const infoFontWeight = renderConfig?.infoFontWeight || 'bold';
                        const infoFontStyle = renderConfig?.infoFontStyle || 'normal';

                        const titleX = x + (showCover ? thumbSize + 25 * scale : 0), titleSize = 28 * scale, titleY = y + thumbSize / 2 - titleSize;
                        if (renderConfig?.showTitle ?? true) {
                            ctx.font = `${infoFontStyle} ${infoFontWeight} ${titleSize}px ${infoFont}`; ctx.fillStyle = infoColor;
                            ctx.fillText(metadata.title, titleX, titleY);
                        }
                        if (renderConfig?.showArtist ?? true) {
                            ctx.font = `${infoFontStyle} ${infoFontWeight} ${18 * scale}px ${infoFont}`; ctx.fillStyle = artistColor;
                            ctx.fillText(metadata.artist, titleX, titleY + ((renderConfig?.showTitle ?? true) ? titleSize + 5 * scale : 0));
                        }
                    }
                }

            }
        }
    }

    // 6. Channel Info / Watermark (Global Overlay)
    if (renderConfig?.showChannelInfo && !['subtitle', 'just_video', 'none'].includes(activePreset)) {
        const cPos = renderConfig.channelInfoPosition || 'bottom-right';
        const cStyle = renderConfig.channelInfoStyle || 'classic';
        const cScale = (renderConfig.channelInfoSizeScale ?? 1.0);
        const marginScale = (renderConfig.channelInfoMarginScale ?? 1.0);

        const cImg = images.get('__channel_info__');
        const cText = renderConfig.channelInfoText;

        // Early exit if nothing to draw
        if (!cImg && !cText) { } // Do nothing
        else if (cStyle === 'logo' && !cImg) { }
        else if (cStyle === 'minimal' && !cText) { }
        else {
            ctx.save();

            const margin = 40 * scale * marginScale;
            const imgSize = 80 * scale * cScale;
            // Modern/Col style might want larger image?
            const finalImgSize = (cStyle === 'modern' || cStyle === 'logo') ? imgSize * 1.2 : imgSize;

            const fontSize = 20 * scale * cScale;
            // Check for pre-loaded SVG text image
            const cTextSvgImg = images.get('__channel_info_text_svg__');
            const isSvgText = !!cTextSvgImg;

            let textW = 0;
            let textH = fontSize; // Approximate cap height

            if (isSvgText && cTextSvgImg) {
                // SVG Logic: Height should match the visual font size block
                // Since our generated SVG is based on font-metrics, the height roughly equals the line-height/cap-height
                // In App.tsx generation we used 100px.
                // Here we want it to match 'fontSize' (e.g. 20px).
                // But wait, the generated SVG includes 1.5em icons which might be taller than text.
                // We should scale HEIGHT relative to fontSize but respect aspect ratio.
                // If the SVG was generated with 100px font, and results in H height.
                // We want to draw it with height `fontSize * (H/100)`.
                // Actually, simplest is to just anchor on fontSize.
                // Let's assume the "Text" part is the anchor.
                // If we set textH = fontSize, it might clip if the icon is 1.5em.
                // So textH should probably be slightly larger?
                // Actually, if we just keep aspect ratio, we can define height freely.
                // Let's set the height of the drawn image to be e.g. 1.5 * fontSize to accommodate the icons safely?
                // Or just use the aspect ratio?
                // Let's standardize on the height being 1.5 * fontSize (since icon is 1.5em).
                // Or better, let's trust the input image aspect ratio.

                // The generated image corresponds to font-size 100.
                // We want to render at `fontSize`.
                // So the target height (in canvas pixels) is roughly `fontSize` but accounting for the icon.
                // If we assume the CONTENT height is dominated by the 1.5em icon.
                // Then correct drawing height is `fontSize * 1.5`.
                textH = fontSize * 1.5;
                const ratio = cTextSvgImg.width / cTextSvgImg.height;
                textW = textH * ratio;
            } else {
                const cFontWeight = renderConfig.channelInfoFontWeight || 'bold';
                const cFontStyle = renderConfig.channelInfoFontStyle || 'normal';
                ctx.font = `${cFontStyle} ${cFontWeight} ${fontSize}px ${renderConfig.channelInfoFontFamily || 'sans-serif'}`;
                if (cText && cStyle !== 'logo') {
                    textW = ctx.measureText(cText).width;
                }
            }

            const gap = 12 * scale * cScale;
            const padX = 12 * scale * cScale;
            const padY = 8 * scale * cScale;

            let w = 0, h = 0;
            const showImg = !!cImg && cStyle !== 'minimal';
            const showText = !!cText && cStyle !== 'logo';

            // Layout Calculation
            if (cStyle === 'modern') {
                // Column: Image Top, Text Bottom
                w = Math.max(showImg ? finalImgSize : 0, showText ? (textW + padX * 2) : 0);
                h = (showImg ? finalImgSize : 0) + (showImg && showText ? gap : 0) + (showText ? (textH + padY * 2) : 0);
            } else if (cStyle === 'box') {
                // Boxed Row
                w = (showImg ? finalImgSize : 0) + (showImg && showText ? gap : 0) + (showText ? textW : 0) + padX * 2;
                h = Math.max(showImg ? finalImgSize : 0, showText ? textH : 0) + padY * 2;
            } else if (cStyle === 'minimal') {
                // Text Only (Pill)
                w = showText ? (textW + padX * 2) : 0;
                h = showText ? (textH + padY * 2) : 0;
            } else if (cStyle === 'logo') {
                // Logo Only
                w = finalImgSize;
                h = finalImgSize;
            } else {
                // Classic (Row with Pill Text) or Circle (Avatar Row)
                w = (showImg ? finalImgSize : 0) + (showImg && showText ? gap : 0) + (showText ? (textW + padX * 2) : 0);
                h = Math.max(showImg ? finalImgSize : 0, showText ? (textH + padY * 2) : 0);
            }

            // Position (Origin: Top-Left of Block)
            let x = 0, y = 0;

            if (cPos.includes('left')) x = margin;
            else if (cPos.includes('right')) x = width - margin - w;
            else if (cPos.includes('center')) x = (width - w) / 2;

            if (cPos.includes('top')) y = margin;
            else if (cPos.includes('bottom')) y = height - margin - h;

            // --- Drawing ---

            // 1. Box Background
            if (cStyle === 'box') {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10;
                if (ctx.roundRect) {
                    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12 * scale * cScale); ctx.fill();
                } else ctx.fillRect(x, y, w, h);
                ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
            }

            // 2. Content
            // Helper for Text Pill
            const drawPill = (px: number, py: number, contentW: number, contentH: number, label: string) => {
                // Background
                if (cStyle !== 'box' && cStyle !== 'minimal') {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                    if (ctx.roundRect) {
                        ctx.beginPath(); ctx.roundRect(px, py, contentW, contentH, 8 * scale * cScale); ctx.fill();
                    } else ctx.fillRect(px, py, contentW, contentH);
                }

                if (isSvgText && cTextSvgImg) {
                    // Center SVG in pill
                    const tx = px + (contentW - textW) / 2;
                    const ty = py + (contentH - textH) / 2;
                    ctx.drawImage(cTextSvgImg, tx, ty, textW, textH);
                } else {
                    // Text
                    ctx.fillStyle = renderConfig.channelInfoFontColor || '#ffffff';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4;
                    // Center text in pill/box area
                    const tx = px + (contentW - textW) / 2;
                    const ty = py + (contentH - textH) / 2 + (textH * 0.1); // subtle visual check
                    ctx.fillText(label, tx, ty);
                    ctx.shadowColor = 'transparent';
                }
            };

            if (cStyle === 'modern') {
                // Col Layout
                let cy = y;
                if (showImg) {
                    const ix = x + (w - finalImgSize) / 2;
                    ctx.drawImage(cImg!, ix, cy, finalImgSize, finalImgSize);
                    cy += finalImgSize + gap;
                }
                if (showText) {
                    const tw = textW + padX * 2;
                    const th = textH + padY * 2;
                    const tx = x + (w - tw) / 2;
                    drawPill(tx, cy, tw, th, cText!);
                }
            } else {
                // Row Layout (Classic, Box, Circle)
                const isRight = cPos.includes('right');

                let curX = x + (cStyle === 'box' ? padX : 0);
                const midY = y + h / 2;

                if (isRight && (cStyle === 'classic' || cStyle === 'circle')) {
                    // Text -> Gap -> Img
                    if (showText) {
                        const tw = textW + padX * 2;
                        const th = textH + padY * 2;
                        drawPill(curX, midY - th / 2, tw, th, cText!);
                        curX += tw + gap;
                    }
                    if (showImg) {
                        if (cStyle === 'circle') {
                            ctx.save();
                            ctx.beginPath();
                            ctx.arc(curX + finalImgSize / 2, midY, finalImgSize / 2, 0, Math.PI * 2);
                            ctx.closePath();
                            ctx.clip();
                            ctx.drawImage(cImg!, curX, midY - finalImgSize / 2, finalImgSize, finalImgSize);
                            ctx.restore();
                        } else {
                            ctx.drawImage(cImg!, curX, midY - finalImgSize / 2, finalImgSize, finalImgSize);
                        }
                    }
                } else {
                    // Img -> Gap -> Text
                    if (showImg) {
                        if (cStyle === 'circle') {
                            ctx.save();
                            ctx.beginPath();
                            ctx.arc(curX + finalImgSize / 2, midY, finalImgSize / 2, 0, Math.PI * 2);
                            ctx.closePath();
                            ctx.clip();
                            ctx.drawImage(cImg!, curX, midY - finalImgSize / 2, finalImgSize, finalImgSize);
                            ctx.restore();
                        } else {
                            ctx.drawImage(cImg!, curX, midY - finalImgSize / 2, finalImgSize, finalImgSize);
                        }
                        curX += finalImgSize + gap;
                    }
                    if (showText) {
                        const tw = textW + (cStyle === 'box' ? 0 : padX * 2);
                        const th = textH + (cStyle === 'box' ? 0 : padY * 2);

                        // If box, no pill bg, just text draw
                        if (cStyle === 'box') {
                            if (isSvgText && cTextSvgImg) {
                                ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4;
                                ctx.drawImage(cTextSvgImg, curX, midY - textH / 2, textW, textH);
                                ctx.shadowColor = 'transparent';
                            } else {
                                ctx.fillStyle = renderConfig.channelInfoFontColor || '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                                ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4;
                                ctx.fillText(cText!, curX, midY + (textH * 0.1));
                                ctx.shadowColor = 'transparent';
                            }
                        } else {
                            drawPill(curX, midY - th / 2, tw, th, cText!);
                        }
                    }
                }
            }

            ctx.restore();
        }
    }
};
