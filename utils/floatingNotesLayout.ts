import { RenderConfig } from '../types';

export interface ContentBox {
    x: number;
    y: number;
    w: number;
    h: number;
}

export type FloatingNotesLayout = NonNullable<RenderConfig['floatingNotesLayout']>;

const EMPTY_BOX: ContentBox = { x: 0, y: 0, w: 0, h: 0 };

export function getFloatingNotesOutlineSize(config: RenderConfig): number {
    const size = config.floatingNotesOutlineSize;
    if (size === undefined || size === null) return 1;
    return Math.max(0, size);
}

export function getFloatingNotesMediaSizeScale(config: RenderConfig): number {
    const scale = config.floatingNotesMediaSizeScale ?? 0.4;
    return Math.min(0.9, Math.max(0.1, scale));
}

export function getFloatingNotesFontSizeScale(config: RenderConfig): number {
    const scale = config.floatingNotesFontSizeScale ?? 1.0;
    return Math.min(3.0, Math.max(0.5, scale));
}

export function computeFloatingNotesContentBoxes(
    layout: FloatingNotesLayout,
    innerX: number,
    innerY: number,
    innerW: number,
    innerH: number,
    scale: number,
    hasMedia: boolean,
    hasText: boolean,
    mediaSizeScale: number,
): { mediaBox: ContentBox; textBox: ContentBox } {
    const gap = 12 * scale;

    if (layout === 'text-only' || !hasMedia) {
        return {
            mediaBox: EMPTY_BOX,
            textBox: { x: innerX, y: innerY, w: innerW, h: innerH },
        };
    }

    if (layout === 'media-only' || !hasText) {
        return {
            mediaBox: { x: innerX, y: innerY, w: innerW, h: innerH },
            textBox: EMPTY_BOX,
        };
    }

    const mediaFrac = Math.min(0.9, Math.max(0.1, mediaSizeScale));

    switch (layout) {
        case 'media-left-text': {
            const mw = innerW * mediaFrac;
            return {
                mediaBox: { x: innerX, y: innerY, w: mw, h: innerH },
                textBox: { x: innerX + mw + gap, y: innerY, w: Math.max(0, innerW - mw - gap), h: innerH },
            };
        }
        case 'media-right-text': {
            const mw = innerW * mediaFrac;
            return {
                textBox: { x: innerX, y: innerY, w: Math.max(0, innerW - mw - gap), h: innerH },
                mediaBox: { x: innerX + innerW - mw, y: innerY, w: mw, h: innerH },
            };
        }
        case 'media-top-text': {
            const mh = innerH * mediaFrac;
            return {
                mediaBox: { x: innerX, y: innerY, w: innerW, h: mh },
                textBox: { x: innerX, y: innerY + mh + gap, w: innerW, h: Math.max(0, innerH - mh - gap) },
            };
        }
        case 'media-bottom-text': {
            const mh = innerH * mediaFrac;
            return {
                textBox: { x: innerX, y: innerY, w: innerW, h: Math.max(0, innerH - mh - gap) },
                mediaBox: { x: innerX, y: innerY + innerH - mh, w: innerW, h: mh },
            };
        }
        default:
            return {
                mediaBox: EMPTY_BOX,
                textBox: { x: innerX, y: innerY, w: innerW, h: innerH },
            };
    }
}

export function getFloatingNotesMediaObjectPosition(layout: FloatingNotesLayout): string {
    switch (layout) {
        case 'media-left-text':
            return 'left center';
        case 'media-right-text':
            return 'right center';
        case 'media-top-text':
            return 'center top';
        case 'media-bottom-text':
            return 'center bottom';
        default:
            return 'center center';
    }
}

export function getFloatingNotesMediaFlexStyle(
    layout: FloatingNotesLayout,
    mediaSizeScale: number,
): { width: string; height: string; flexShrink?: number } {
    const frac = Math.min(0.9, Math.max(0.1, mediaSizeScale));
    const isHorizontal = layout === 'media-left-text' || layout === 'media-right-text';
    const isVertical = layout === 'media-top-text' || layout === 'media-bottom-text';

    if (isHorizontal) {
        return {
            width: `${frac * 100}%`,
            height: '100%',
            flexShrink: 0,
        };
    }

    if (isVertical) {
        return {
            width: '100%',
            height: `${frac * 100}%`,
            flexShrink: 0,
        };
    }

    return { width: '100%', height: '100%' };
}

export function getFloatingNotesMediaContainerClass(layout: FloatingNotesLayout): string {
    switch (layout) {
        case 'media-left-text':
            return 'flex items-center justify-start overflow-hidden';
        case 'media-right-text':
            return 'flex items-center justify-end overflow-hidden';
        case 'media-top-text':
            return 'flex items-start justify-center overflow-hidden';
        case 'media-bottom-text':
            return 'flex items-end justify-center overflow-hidden';
        default:
            return 'flex items-center justify-center overflow-hidden';
    }
}

export function alignFloatingNotesMediaDrawRect(
    layout: FloatingNotesLayout,
    mediaBox: ContentBox,
    drawW: number,
    drawH: number,
): { drawX: number; drawY: number } {
    let drawX = mediaBox.x + (mediaBox.w - drawW) / 2;
    let drawY = mediaBox.y + (mediaBox.h - drawH) / 2;

    if (layout === 'media-left-text') {
        drawX = mediaBox.x;
    } else if (layout === 'media-right-text') {
        drawX = mediaBox.x + mediaBox.w - drawW;
    }

    if (layout === 'media-top-text') {
        drawY = mediaBox.y;
    } else if (layout === 'media-bottom-text') {
        drawY = mediaBox.y + mediaBox.h - drawH;
    }

    return { drawX, drawY };
}
