import { LyricLine, RenderConfig } from '../types';
import { parseTimestamp } from './parsers';
import { findActiveLyricIndex, resolveAutoLyricVisibility } from './lyricVisibility';

export type FloatingNotesVisibilityMode = 'all' | 'follow-lyrics' | 'from-start' | 'from-end' | 'from-start-and-end' | 'specific';

export interface FloatingNotesVisibilityOptions {
    isFirstSongInPlaylist?: boolean;
    metadata?: { title?: string; artist?: string };
}

function isStaticLyricMode(renderConfig?: RenderConfig): boolean {
    const mode = renderConfig?.lyricDisplayMode;
    return mode === 'static-all' ||
        mode === 'static-compact' ||
        mode === 'static-compact-comma' ||
        mode === 'static-compact-clean';
}

function isLyricsOverlayVisible(
    time: number,
    duration: number,
    renderConfig: RenderConfig | undefined,
    lyrics: LyricLine[],
    options: FloatingNotesVisibilityOptions = {}
): boolean {
    if (!(renderConfig?.showLyrics ?? true)) return false;

    const isUnsyncedLyrics = lyrics.length > 0 &&
        lyrics.every(l => l.time === 0 && (l.endTime === undefined || l.endTime === 0));
    const isStaticMode = isStaticLyricMode(renderConfig);
    const rawActiveIdx = isUnsyncedLyrics ? -1 : findActiveLyricIndex(lyrics, time);

    let autoHideLyrics = false;
    let activeIdx = rawActiveIdx;

    if (renderConfig?.lyricVisibilityMode === 'auto' && !isUnsyncedLyrics && !isStaticMode && lyrics.length > 0) {
        const autoState = resolveAutoLyricVisibility(lyrics, time, duration);
        autoHideLyrics = autoState.autoHideLyrics;
        if (!autoHideLyrics) {
            activeIdx = autoState.displayIdx;
        } else {
            activeIdx = -1;
        }
    }

    const showIntroTitle = (
        activeIdx === -1 &&
        time < 5 &&
        (renderConfig?.showIntro ?? true) &&
        (renderConfig?.introMode !== 'manual' || (options.isFirstSongInPlaylist ?? true)) &&
        (lyrics.length === 0 || time < lyrics[0].time)
    );

    return !autoHideLyrics && (
        activeIdx !== -1 ||
        showIntroTitle ||
        (renderConfig?.lyricDisplayMode === 'all' && lyrics.length > 0) ||
        (isStaticMode && lyrics.length > 0)
    );
}

export function isFloatingNotesVisible(
    time: number,
    duration: number,
    renderConfig: RenderConfig | undefined,
    lyrics: LyricLine[] = [],
    options: FloatingNotesVisibilityOptions = {}
): boolean {
    if (!renderConfig?.showFloatingNotes) return false;

    const mode = renderConfig.floatingNotesVisibilityMode ?? 'all';

    switch (mode) {
        case 'all':
            return true;

        case 'from-start': {
            const showDuration = renderConfig.floatingNotesFromStartDuration ?? 10;
            return time >= 0 && time < showDuration;
        }

        case 'from-end': {
            if (duration <= 0) return true;
            const tailDuration = renderConfig.floatingNotesFromEndDuration ?? 10;
            const start = Math.max(0, duration - tailDuration);
            return time >= start && time <= duration;
        }

        case 'from-start-and-end': {
            const headDuration = renderConfig.floatingNotesFromStartDuration ?? 10;
            const inStartWindow = time >= 0 && time < headDuration;
            if (duration <= 0) return inStartWindow;
            const tailDuration = renderConfig.floatingNotesFromEndDuration ?? 10;
            const tailStart = Math.max(0, duration - tailDuration);
            const inEndWindow = time >= tailStart && time <= duration;
            return inStartWindow || inEndWindow;
        }

        case 'specific': {
            const start = parseTimestamp(renderConfig.floatingNotesSpecificStart ?? '0:00');
            const endRaw = renderConfig.floatingNotesSpecificEnd;
            if (!endRaw || !endRaw.trim()) return time >= start;
            const end = parseTimestamp(endRaw);
            if (end <= start) return time >= start;
            return time >= start && time < end;
        }

        case 'follow-lyrics':
            return isLyricsOverlayVisible(time, duration, renderConfig, lyrics, options);

        default:
            return true;
    }
}
