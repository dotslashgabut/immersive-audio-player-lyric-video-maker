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
            // Fallback: Split by space if no timings
            const rawWords = line.text.split(' ');
            words = rawWords.map(t => ({ text: t, startTime: line.time, endTime: line.endTime || (line.time + 3) }));
        }

        const displayWords = words.map((w, index) => ({ ...w, text: transformText(w.text, index === 0) }));

        // Explicitly set font for measurement
        ctx.font = `${style} ${weight} ${baseFontSize}px ${fontFamily}`;

        // 2. Wrap Words into Lines
        const lines: LyricWord[][] = [];
        let currentLine: LyricWord[] = [];
        let currentLineWidth = 0;
        const spaceWidth = ctx.measureText(' ').width;

        displayWords.forEach(word => {
            const wordWidth = ctx.measureText(word.text).width;
            if (currentLineWidth + wordWidth > maxWidth && currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = [];
                currentLineWidth = 0;
            }
            currentLine.push(word);
            currentLineWidth += wordWidth + spaceWidth;
        });
        if (currentLine.length > 0) lines.push(currentLine);

        // 3. Draw Lines
        const startY = y - ((lines.length - 1) * lineHeight) / 2;

        // Resolve Colors
        let highlightColor = renderConfig.highlightColor || '#ef4444';
        let bgColor = renderConfig.highlightBackground || '#ffffff';
        const effect = renderConfig.highlightEffect || 'none';

        if (!renderConfig.useCustomHighlightColors) {
            // Preset Colors Mapping
            if (effect.includes('blue') || effect.includes('cyan')) { highlightColor = '#3b82f6'; bgColor = '#3b82f6'; }
            else if (effect.includes('purple')) { highlightColor = '#a855f7'; bgColor = '#a855f7'; }
            else if (effect.includes('green')) { highlightColor = '#22c55e'; bgColor = '#22c55e'; }
            else if (effect.includes('pink')) { highlightColor = '#ec4899'; bgColor = '#ec4899'; }
            else if (effect.includes('neon')) { highlightColor = '#ffffff'; bgColor = '#ffffff'; } // Neon usually white center
            else if (effect === 'karaoke') { highlightColor = '#ef4444'; bgColor = '#ef4444'; } // Default Red
        }

        const baseColor = renderConfig.fontColor || '#ffffff';

        lines.forEach((l, i) => {
            const lineY = startY + (i * lineHeight);

            // Calculate line width for alignment
            let totalW = 0;
            l.forEach((w, j) => {
                totalW += ctx.measureText(w.text).width;
                if (j < l.length - 1) totalW += spaceWidth;
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
                let fill = baseColor;

                // Determine if we should highlight this word
                const isFillType = effect.includes('fill');
                const shouldHighlight = isFillType ? isPassed : isCurrentWord;

                if (shouldHighlight) fill = highlightColor;

                // Effects
                ctx.save();
                ctx.fillStyle = fill;

                // --- Background Shapes (Pill/Box/Fill) ---
                if (isCurrentWord || (isFillType && isPassed)) {
                    // Logic: 'fill' type fills history (isPassed). Shapes (Pill/Box) are Active Only (isCurrentWord).
                    // We need to distinguish.
                    // If effect is 'karaoke-fill', it respects isFillType (so all passed are filled).
                    // If effect is 'karaoke-pill/box', it is NOT isFillType (so only current).

                    if (effect.includes('pill') || effect.includes('box') || effect.includes('rounded') || effect.includes('fill')) {
                        // Double check strictly for pill/box/rounded to be active only?
                        // Previously I forced isFillType = includes('fill').
                        // So 'karaoke-fill' IS fill type. 'karaoke-pill' is NOT.
                        // So checking `shouldHighlight` covers this?
                        // If `shouldHighlight` is true, we draw the background.

                        if (shouldHighlight) {
                            const padding = effect.includes('pill') ? baseFontSize * 0.4 : baseFontSize * 0.15;
                            ctx.fillStyle = bgColor;

                            let r = 4 * scale; // Default for 'fill'
                            if (effect.includes('pill')) r = 999;
                            else if (effect.includes('rounded')) r = 12 * scale;
                            else if (effect.includes('box')) r = 0;

                            ctx.beginPath();
                            if (ctx.roundRect) {
                                ctx.roundRect(currentX - padding, lineY - lineHeight / 2, wWidth + padding * 2, lineHeight, r);
                            } else {
                                ctx.rect(currentX - padding, lineY - lineHeight / 2, wWidth + padding * 2, lineHeight);
                            }
                            ctx.fill();

                            // Reset fill to text color (which might be highlightColor or black for fill)
                            if (effect.includes('fill') || effect.includes('pill') || effect.includes('box') || effect.includes('rounded')) {
                                ctx.fillStyle = '#000000'; // CSS sets text to black for these backgrounds
                                fill = '#000000'; // Ensure subsequent logic uses black
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
                }

                // --- Animations & Transforms ---
                let wordY = lineY;
                let wordX = currentX;
                let rot = 0;
                let scaleX = 1;
                let scaleY = 1;

                if (shouldHighlight) {
                    if (effect.includes('bounce')) {
                        // CSS is static translateY(-10px) (approx -0.2em)
                        // If it's 'karaoke-bounce', static. If generic animation, maybe keep wave?
                        // App.tsx: karaoke-bounce -> translateY(-10px).
                        wordY -= 10 * scale;
                    } else if (effect.includes('wave')) {
                        wordY += Math.sin(time * 5 + j) * 8 * scale;
                    } else if (effect.includes('scale')) {
                        scaleX = 1.3;
                        scaleY = 1.3;
                    }
                }

                // Draw
                // Handle Gradient / Outline / Shadow overrides
                if (shouldHighlight) {
                    if (effect.includes('gradient')) {
                        const grad = ctx.createLinearGradient(wordX, wordY - lineHeight / 2, wordX + wWidth, wordY + lineHeight / 2);
                        grad.addColorStop(0, highlightColor);
                        grad.addColorStop(1, bgColor);
                        ctx.fillStyle = grad;
                    }
                    if (effect.includes('shadow')) {
                        // Retro shadow: 3px 3px 0 #000
                        ctx.save();
                        ctx.fillStyle = '#000000';
                        ctx.fillText(word.text, wordX + 3 * scale, wordY + 3 * scale);
                        ctx.fillText(word.text, wordX - 1 * scale, wordY - 1 * scale); // CSS has multiple shadows
                        ctx.restore();
                    }
                }

                // Apply Transforms
                if (rot !== 0 || scaleX !== 1 || scaleY !== 1) {
                    // Translate to center of word for scaling/rotation
                    const cx = wordX + wWidth / 2;
                    const cy = wordY;
                    ctx.translate(cx, cy);
                    ctx.rotate(rot);
                    ctx.scale(scaleX, scaleY);
                    ctx.translate(-cx, -cy);
                }

                if (shouldHighlight && effect.includes('outline')) {
                    ctx.strokeStyle = highlightColor;
                    ctx.lineWidth = 2 * scale;
                    ctx.strokeText(word.text, wordX, wordY);
                    // Transparent fill? CSS says color transparent.
                    // So we do NOT fillText.
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

                ctx.restore(); // Restore word-specific context (including transforms)

                // Advance X (using ORIGINAL width to avoid spacing issues with scale)
                currentX += wWidth + spaceWidth;
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

    if (customFontName) fontFamily = `"${customFontName}", sans-serif`;
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

    if (renderConfig && renderConfig.backgroundBlurStrength > 0) ctx.filter = `blur(${renderConfig.backgroundBlurStrength}px)`;
    else if (isBlurEnabled) ctx.filter = 'blur(12px)'; // Fallback for legacy
    if (renderConfig ? (renderConfig.backgroundSource === 'timeline' || renderConfig.backgroundSource === 'custom') : true) {
        const useTimeline = renderConfig ? renderConfig.backgroundSource === 'timeline' : true;
        let drawnAny = false;

        if (useTimeline) {
            const activeSlides = visualSlides.filter(s => s.type !== 'audio' && time >= s.startTime && time < s.endTime);
            // Sort by layer (0 first, then 1) so 1 draws on top
            activeSlides.sort((a, b) => (a.layer || 0) - (b.layer || 0));

            if (activeSlides.length > 0) {
                activeSlides.forEach(slide => {
                    // Check visibility
                    const layer = slide.layer || 0;
                    if (renderConfig && renderConfig.layerVisibility?.visual?.[layer] === false) return;

                    const vid = slide.type === 'video' ? videos.get(slide.id) : null;
                    const img = slide.type !== 'video' ? images.get(slide.id) : null;
                    if (vid) drawScaled(vid);
                    else if (img) drawScaled(img);
                });
                drawnAny = true; // Mark as drawn even if filtered? No, only if actually drawn.
                // Wait, if all are hidden, drawnAny stays false, so we fall back to cover?
                // Probably desired behavior: if you hide video layers, show default cover.
            }
        }

        if (!drawnAny && metadata.coverUrl && visualSlides.length === 0) {
            const vid = metadata.backgroundType === 'video' ? videos.get('background') : null;
            const img = images.get('cover');
            if (vid) drawScaled(vid); else if (img) drawScaled(img);
        }
    }
    if ((renderConfig && renderConfig.backgroundBlurStrength > 0) || isBlurEnabled) ctx.filter = 'none';

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

    const introContent = renderConfig?.introMode === 'manual' && renderConfig.introText
        ? renderConfig.introText
        : `${metadata.title}\n${metadata.artist}`;

    let showIntroTitle = (
        activeIdx === -1 &&
        time < 5 &&
        (renderConfig?.showIntro ?? true) &&
        (renderConfig?.introMode !== 'manual' || isFirstSongInPlaylist)
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
            centerY = height * 0.25;
        } else if (renderConfig?.contentPosition === 'bottom') {
            centerY = height * 0.75;
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
                        if (activePreset === 'custom' && renderConfig?.fontWeight) weight = renderConfig.fontWeight;
                        const style = (activePreset === 'custom' && renderConfig?.fontStyle) ? renderConfig.fontStyle : 'normal';

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
                        ? (height - 120 * scale)
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
                    let titleY = yPos;
                    if (artistStr) {
                        titleY = yPos - (artistLH / 2);
                    }
                    const artistY = yPos + (titleLH / 2);

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

                    if (isCurrent && isKaraokeMode && line) {
                        drawKaraokeText(ctx, line, xPos, yPos, width * 0.9, fs * 1.2, time, renderConfig!, fontFamily, fs, weight, style, scale);
                    } else {
                        drawWrappedText(ctx, textToDraw, xPos, yPos, width * 0.9, fs * 1.2, textEffect, decoration);
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
            if (activePreset === 'custom') {
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

                const titleFont = `bold ${titleSize}px ${fontFamily}`;
                const artistFont = `${artistSize}px ${fontFamily}`;

                const gap = 20 * scale;
                const padding = isBox ? 24 * scale : 0;

                const mainColor = renderConfig?.fontColor || '#ffffff';
                const artistColor = (style === 'modern' || style === 'modern_art') ? mainColor : (renderConfig?.fontColor || '#d4d4d8');

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
