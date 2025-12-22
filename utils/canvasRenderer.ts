import { LyricLine, VideoPreset, VisualSlide, AudioMetadata } from '../types';

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
    isBlurEnabled: boolean
) => {
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

    const drawWrappedText = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const lines = getWrappedLines(ctx, text, maxWidth);
        const startY = y - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((l, i) => {
            ctx.fillText(l, x, startY + (i * lineHeight));
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

    if (customFontName) fontFamily = `"${customFontName}", sans-serif`;

    const isPortrait = width <= height;
    const scale = (Math.max(width, height) === 1080 || Math.max(width, height) === 1920) ? 1 : 0.666;

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // 1. Draw Background
    const currentSlide = visualSlides.find(s => s.type !== 'audio' && time >= s.startTime && time < s.endTime);

    const drawScaled = (img: ImageBitmap | HTMLImageElement | HTMLVideoElement) => {
        let w = 0;
        let h = 0;

        if (img instanceof ImageBitmap) {
            w = img.width;
            h = img.height;
        } else if (img instanceof HTMLVideoElement) {
            w = img.videoWidth;
            h = img.videoHeight;
        } else {
            w = img.width;
            h = img.height;
        }

        if (w && h) {
            const imgScale = Math.max(width / w, height / h);
            const x = (width / 2) - (w / 2) * imgScale;
            const y = (height / 2) - (h / 2) * imgScale;
            ctx.drawImage(img, x, y, w * imgScale, h * imgScale);
        }
    };

    if (isBlurEnabled) {
        ctx.filter = 'blur(12px)';
    }

    if (currentSlide) {
        if (currentSlide.type === 'video' && videos.has(currentSlide.id)) {
            const vid = videos.get(currentSlide.id);
            if (vid) drawScaled(vid);
        } else {
            const img = images.get(currentSlide.id);
            if (img) drawScaled(img);
        }
    } else if (metadata.coverUrl) {
        if (metadata.backgroundType === 'video' && videos.has('background')) {
            const vid = videos.get('background');
            if (vid) drawScaled(vid);
        } else {
            const img = images.get('cover');
            if (img) drawScaled(img);
        }
    }

    if (isBlurEnabled) {
        ctx.filter = 'none';
    }

    if (activePreset !== 'just_video') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        if (currentSlide) ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, width, height);
    }

    if (activePreset === 'just_video') return;

    const activeIdx = lyrics.findIndex((line, index) => {
        if (line.endTime !== undefined) {
            return time >= line.time && time < line.endTime;
        }
        const nextLine = lyrics[index + 1];
        return time >= line.time && (!nextLine || time < nextLine.time);
    });

    // Intro Title Logic: Show title as a fake lyric in the first 5 seconds if no lyric is active
    let showIntroTitle = false;
    if (activeIdx === -1 && time < 5) {
        showIntroTitle = true;
    }

    let baseFontSize = (isPortrait ? 50 : 60) * scale;
    let secondaryFontSize = (isPortrait ? 25 : 30) * scale;
    let lineSpacing = (isPortrait ? 80 : 100) * scale;

    if (activePreset === 'large') {
        baseFontSize = (isPortrait ? 90 : 120) * scale;
        secondaryFontSize = (isPortrait ? 30 : 40) * scale;
        lineSpacing = (isPortrait ? 110 : 140) * scale;
    } else if (activePreset === 'large_upper' || activePreset === 'big_center' || activePreset === 'metal' || activePreset === 'kids' || activePreset === 'tech' || activePreset === 'testing' || activePreset === 'testing_up' || activePreset === 'one_line' || activePreset === 'one_line_up') {
        baseFontSize = (isPortrait ? 80 : 110) * scale;
        secondaryFontSize = (isPortrait ? 30 : 40) * scale;
        lineSpacing = (isPortrait ? 110 : 140) * scale;
    } else if (activePreset === 'sad' || activePreset === 'romantic' || activePreset === 'gothic') {
        baseFontSize = (isPortrait ? 60 : 75) * scale;
        secondaryFontSize = (isPortrait ? 25 : 30) * scale;
        lineSpacing = (isPortrait ? 90 : 120) * scale;
    } else if (activePreset === 'classic') {
        baseFontSize = (isPortrait ? 55 : 65) * scale;
        secondaryFontSize = (isPortrait ? 28 : 34) * scale;
    } else if (activePreset === 'slideshow' || activePreset === 'subtitle') {
        baseFontSize = (isPortrait ? 30 : 40) * scale;
        secondaryFontSize = 0;
        lineSpacing = 0;
    }

    baseFontSize *= fontSizeScale;
    secondaryFontSize *= fontSizeScale;
    lineSpacing *= fontSizeScale;

    if (activeIdx !== -1 || showIntroTitle) {
        const centerY = height / 2;
        let activeLineShift = 0;
        const isBigLayout = ['large', 'large_upper', 'big_center', 'metal', 'kids', 'sad', 'romantic', 'tech', 'gothic', 'testing', 'testing_up', 'one_line', 'one_line_up'].includes(activePreset);

        if (isBigLayout || activePreset === 'slideshow' || activePreset === 'subtitle') {
            let activeLine: LyricLine;
            if (showIntroTitle) {
                activeLine = { time: 0, text: `${metadata.title}\n${metadata.artist}` };
            } else {
                activeLine = lyrics[activeIdx];
            }

            const weight = '900';
            ctx.font = `${weight} ${baseFontSize}px ${fontFamily}`;

            const maxWidth = width * 0.9;
            const textToCheck = (activePreset === 'large_upper' || activePreset === 'big_center' || activePreset === 'metal' || activePreset === 'tech' || activePreset === 'testing_up' || activePreset === 'one_line_up') ? activeLine.text.toUpperCase() : activeLine.text;
            const lines = getWrappedLines(ctx, textToCheck, maxWidth);

            if (lines.length > 1) {
                const wrappedLineHeight = baseFontSize * 1.2;
                activeLineShift = ((lines.length - 1) * wrappedLineHeight) / 2;
            }
        }

        const range = isBigLayout ? 1 : 2;

        for (let i = -range; i <= range; i++) {
            let line: LyricLine | null = null;
            let isCurrent = false;

            if (showIntroTitle) {
                if (i === 0) {
                    line = { time: 0, text: `${metadata.title}\n${metadata.artist}` };
                    isCurrent = true;
                }
            } else {
                const idx = activeIdx + i;
                if (idx >= 0 && idx < lyrics.length) {
                    line = lyrics[idx];
                    isCurrent = i === 0;
                }
            }

            if (line) {
                if ((activePreset === 'testing' || activePreset === 'testing_up') && i < 0) continue;
                if ((activePreset === 'one_line' || activePreset === 'one_line_up') && i !== 0) continue;

                ctx.textAlign = (activePreset === 'large' || activePreset === 'large_upper') ? 'left' : 'center';
                ctx.textBaseline = 'middle';

                let fontSpec = `${secondaryFontSize}px ${fontFamily}`;
                let fillStyle = 'rgba(255, 255, 255, 0.5)';

                if (isBigLayout) {
                    fillStyle = 'rgba(113, 113, 122, 0.8)';
                    if (activePreset === 'tech') fillStyle = 'rgba(34, 211, 238, 0.4)';
                    if (isCurrent) {
                        fillStyle = '#ffffff';
                        if (activePreset === 'romantic') fillStyle = '#fce7f3';
                        if (activePreset === 'tech') fillStyle = '#ecfeff';
                    }
                } else if (activePreset === 'classic') {
                    fillStyle = 'rgba(161, 161, 170, 0.8)';
                    if (isCurrent) fillStyle = '#fef3c7';
                } else {
                    if (isCurrent) fillStyle = '#ffffff';
                }

                if (isCurrent) {
                    let weight = 'bold';
                    if (activePreset === 'large' || activePreset === 'large_upper' || activePreset === 'big_center' || activePreset === 'metal' || activePreset === 'tech') weight = '900';
                    if (activePreset === 'slideshow' || activePreset === 'testing' || activePreset === 'testing_up' || activePreset === 'one_line' || activePreset === 'one_line_up') weight = '400';
                    if (activePreset === 'classic' || activePreset === 'romantic') weight = 'italic bold';
                    if (activePreset === 'sad' || activePreset === 'gothic' || activePreset === 'kids') weight = '400';

                    fontSpec = `${weight} ${baseFontSize}px ${fontFamily}`;
                }

                ctx.font = fontSpec;
                ctx.fillStyle = fillStyle;

                if (isCurrent) {
                    if (activePreset === 'tech') {
                        ctx.shadowColor = 'rgba(34, 211, 238, 0.8)';
                        ctx.shadowBlur = 15 * scale;
                    } else if (activePreset === 'romantic') {
                        ctx.shadowColor = 'rgba(236, 72, 153, 0.6)';
                        ctx.shadowBlur = 15 * scale;
                    } else if (activePreset === 'kids') {
                        ctx.shadowColor = 'rgba(0,0,0,0.5)';
                        ctx.shadowBlur = 0;
                        ctx.shadowOffsetX = 3 * scale;
                        ctx.shadowOffsetY = 3 * scale;
                    } else if (activePreset === 'testing' || activePreset === 'testing_up' || activePreset === 'one_line' || activePreset === 'one_line_up') {
                        ctx.shadowColor = 'transparent';
                    } else {
                        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                        ctx.shadowBlur = (activePreset === 'classic' ? 20 : 10) * scale;
                        ctx.shadowOffsetY = 2 * scale;
                    }
                } else {
                    ctx.shadowColor = 'transparent';
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                }

                let yPos = centerY + (i * lineSpacing);
                if (i < 0) yPos -= activeLineShift;
                if (i > 0) yPos += activeLineShift;

                let xPos = width / 2;
                if (activePreset === 'large' || activePreset === 'large_upper') {
                    xPos = 60 * scale;
                }

                const maxWidth = width * 0.9;

                if (activePreset === 'slideshow') {
                    if (i !== 0) continue;
                    drawWrappedText(ctx, line.text, xPos, yPos, maxWidth, baseFontSize * 1.2);
                } else if (activePreset === 'subtitle') {
                    if (i !== 0) continue;
                    const bottomY = height - (120 * scale);
                    drawWrappedText(ctx, line.text, xPos, bottomY, maxWidth, baseFontSize * 1.2);
                } else if (isBigLayout && isCurrent) {
                    const textToDraw = (activePreset === 'large_upper' || activePreset === 'big_center' || activePreset === 'metal' || activePreset === 'tech' || activePreset === 'testing_up' || activePreset === 'one_line_up') ? line.text.toUpperCase() : line.text;
                    drawWrappedText(ctx, textToDraw, xPos, yPos, maxWidth, baseFontSize * 1.2);
                } else {
                    const textToDraw = line.text;
                    ctx.fillText(textToDraw, xPos, yPos, maxWidth);
                }
            }
        }
        ctx.shadowColor = 'transparent';
    } else {
        if (lyrics.length === 0) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `bold ${baseFontSize}px ${fontFamily}`;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 10 * scale;
            ctx.fillText(metadata.title, width / 2, height / 2 - (40 * scale));

            ctx.font = `${secondaryFontSize}px ${fontFamily}`;
            ctx.fillStyle = '#cccccc';
            ctx.fillText(metadata.artist, width / 2, height / 2 + (40 * scale));
            ctx.shadowColor = 'transparent';
        }
    }

    if (activePreset !== 'subtitle') {
        if (['big_center', 'metal', 'kids', 'sad', 'romantic', 'tech', 'gothic', 'testing', 'testing_up', 'one_line', 'one_line_up', 'slideshow'].includes(activePreset)) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let bottomMargin = 80 * scale;
            if (activePreset === 'testing' || activePreset === 'testing_up' || activePreset === 'one_line' || activePreset === 'one_line_up') bottomMargin = 120 * scale;
            const centerX = width / 2;

            const titleSize = 20 * scale;
            ctx.font = `bold ${titleSize}px ${fontFamily}`;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4 * scale;

            const titleY = height - bottomMargin - (30 * scale);
            const titleText = (activePreset === 'tech') ? metadata.title.toUpperCase() : metadata.title;
            ctx.fillText(titleText, centerX, titleY);

            let artistSize = 16 * scale;
            if (activePreset === 'testing' || activePreset === 'testing_up' || activePreset === 'one_line' || activePreset === 'one_line_up') artistSize = 18 * scale;
            ctx.font = `${artistSize}px ${fontFamily}`;
            ctx.fillStyle = '#d4d4d8';
            const artistY = height - bottomMargin;
            ctx.fillText(metadata.artist, centerX, artistY);
            ctx.shadowColor = 'transparent';
        } else {
            const margin = 40 * scale;
            const isSquare = width === height;
            const portraitThumbSize = isSquare ? 110 : 150;
            const landscapeThumbSize = 100;
            const thumbSize = (isPortrait ? portraitThumbSize : landscapeThumbSize) * scale;
            const textOffset = 25 * scale;
            const coverImg = metadata.coverUrl ? images.get('cover') : null;
            const r = 12 * scale;

            if (isPortrait) {
                const startY = margin * (isSquare ? 1.5 : 3);
                const centerX = width / 2;
                const imgX = centerX - (thumbSize / 2);
                const imgY = startY;

                ctx.save();
                ctx.beginPath();
                ctx.roundRect(imgX, imgY, thumbSize, thumbSize, r);
                ctx.clip();
                if (coverImg) {
                    // @ts-ignore - ImageBitmap vs HTMLImageElement compat
                    ctx.drawImage(coverImg, imgX, imgY, thumbSize, thumbSize);
                } else {
                    ctx.fillStyle = '#27272a';
                    ctx.fillRect(imgX, imgY, thumbSize, thumbSize);
                }
                ctx.restore();

                ctx.save();
                ctx.beginPath();
                ctx.roundRect(imgX, imgY, thumbSize, thumbSize, r);
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                ctx.lineWidth = 2 * scale;
                ctx.stroke();
                ctx.restore();

                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                const titleSize = (isSquare ? 26 : 36) * scale;
                ctx.font = `bold ${titleSize}px ${fontFamily}`;
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 4 * scale;
                ctx.shadowOffsetY = 1 * scale;
                const titleY = imgY + thumbSize + textOffset;
                ctx.fillText(metadata.title, centerX, titleY);

                const artistSize = (isSquare ? 18 : 24) * scale;
                ctx.font = `${artistSize}px ${fontFamily}`;
                ctx.fillStyle = '#d4d4d8';
                ctx.shadowBlur = 2 * scale;
                const artistY = titleY + (isSquare ? 30 : 40) * scale;
                ctx.fillText(metadata.artist, centerX, artistY);
                ctx.shadowColor = 'transparent';
            } else {
                const x = margin;
                const y = margin;
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(x, y, thumbSize, thumbSize, r);
                ctx.clip();
                if (coverImg) {
                    // @ts-ignore
                    ctx.drawImage(coverImg, x, y, thumbSize, thumbSize);
                } else {
                    ctx.fillStyle = '#27272a';
                    ctx.fillRect(x, y, thumbSize, thumbSize);
                }
                ctx.restore();

                ctx.save();
                ctx.beginPath();
                ctx.roundRect(x, y, thumbSize, thumbSize, r);
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                ctx.lineWidth = 2 * scale;
                ctx.stroke();
                ctx.restore();

                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';

                const titleX = x + thumbSize + textOffset;
                const titleSize = 28 * scale;
                ctx.font = `bold ${titleSize}px ${fontFamily}`;
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 4 * scale;
                const titleY = y + (thumbSize / 2) - (titleSize);
                ctx.fillText(metadata.title, titleX, titleY);

                const artistSize = 18 * scale;
                ctx.font = `${artistSize}px ${fontFamily}`;
                ctx.fillStyle = '#d4d4d8';
                const artistY = titleY + titleSize + (5 * scale);
                ctx.fillText(metadata.artist, titleX, artistY);
                ctx.shadowColor = 'transparent';
            }
        }
    }
};
