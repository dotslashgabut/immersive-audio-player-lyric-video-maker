import { LyricLine } from '../types';

/** Empty LRC marker lines: hide sticky text after this gap duration */
export const AUTO_LYRIC_GAP_THRESHOLD_SEC = 2;
/** TTML/SRT: hide (don't sticky) when uncued gap between lines exceeds this */
export const AUTO_TTML_GAP_HIDE_THRESHOLD_SEC = 3;
/** LRC tail: apply end-of-track hide when remaining audio exceeds this */
export const AUTO_LRC_TAIL_THRESHOLD_SEC = 10;
/** Max time the final LRC line stays visible once tail-hide is active */
export const AUTO_LRC_LAST_LINE_MAX_DISPLAY_SEC = 10;
/** Hide final-line lyrics this many seconds before audio ends (caps long outros) */
export const AUTO_LRC_END_HIDE_BUFFER_SEC = 4.5;
/** Max display/highlight duration for last word in a line (Enhanced LRC) */
export const LAST_WORD_MAX_DURATION_SEC = 3;
/** Plain LRC: estimated seconds per word when inferring line display duration */
export const AUTO_LRC_SEC_PER_WORD = 0.55;
/** Plain LRC: minimum visible duration for any line */
export const AUTO_LRC_MIN_LINE_DISPLAY_SEC = 2;

export interface AutoLyricVisibilityState {
    autoHideLyrics: boolean;
    displayIdx: number;
    virtualActiveIdx: number;
}

export function isEmptyLyricLine(line: LyricLine): boolean {
    return line.text.trim() === '';
}

export function findActiveLyricIndex(lyrics: LyricLine[], time: number): number {
    return lyrics.findIndex((line, index) => {
        if (line.endTime !== undefined) return time >= line.time && time < line.endTime;
        const nextLine = lyrics[index + 1];
        return time >= line.time && (!nextLine || time < nextLine.time);
    });
}

export function lyricsHaveLineEndTimes(lyrics: LyricLine[]): boolean {
    return lyrics.some(l => !isEmptyLyricLine(l) && l.endTime !== undefined);
}

function findLastContentIndex(lyrics: LyricLine[], fromIdx: number): number {
    for (let i = fromIdx; i >= 0; i--) {
        if (!isEmptyLyricLine(lyrics[i])) return i;
    }
    return -1;
}

function findNextContentIndex(lyrics: LyricLine[], fromIdx: number): number {
    for (let i = fromIdx + 1; i < lyrics.length; i++) {
        if (!isEmptyLyricLine(lyrics[i])) return i;
    }
    return -1;
}

function findNextContentAfterTime(lyrics: LyricLine[], time: number): number {
    return lyrics.findIndex(l => l.time > time && !isEmptyLyricLine(l));
}

function countLineWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Estimated end of on-screen display for LRC / Enhanced LRC lines (no line endTime). */
export function getLrcLineDisplayEnd(lyrics: LyricLine[], lineIdx: number): number {
    const line = lyrics[lineIdx];
    const nextContentIdx = findNextContentIndex(lyrics, lineIdx);
    const nextTime = nextContentIdx !== -1 ? lyrics[nextContentIdx].time : undefined;

    if (line.words && line.words.length > 0) {
        const lastWord = line.words[line.words.length - 1];
        let end = lastWord.endTime;
        if (nextTime !== undefined) {
            end = Math.min(end, nextTime);
        }
        return end;
    }

    const wordCount = countLineWords(line.text);
    const predicted =
        line.time +
        Math.max(AUTO_LRC_MIN_LINE_DISPLAY_SEC, wordCount * AUTO_LRC_SEC_PER_WORD);

    if (nextTime !== undefined) {
        const gap = nextTime - line.time;
        if (gap <= 10) {
            return nextTime;
        } else {
            return Math.min(Math.max(predicted, line.time + 10), nextTime);
        }
    }
    return predicted;
}

function getLrcLastLineHideTime(lineStartTime: number, duration: number): number {
    return Math.min(
        lineStartTime + AUTO_LRC_LAST_LINE_MAX_DISPLAY_SEC,
        duration - AUTO_LRC_END_HIDE_BUFFER_SEC
    );
}

function hideUntilNext(
    lyrics: LyricLine[],
    nextContentIdx: number,
    fallbackIdx: number
): AutoLyricVisibilityState {
    return {
        autoHideLyrics: true,
        displayIdx: -1,
        virtualActiveIdx: nextContentIdx !== -1 ? nextContentIdx : fallbackIdx,
    };
}

function showLine(idx: number): AutoLyricVisibilityState {
    return {
        autoHideLyrics: false,
        displayIdx: idx,
        virtualActiveIdx: idx,
    };
}

/** Walk non-empty lyric lines relative to a center index (skips empty LRC markers). */
export function getContentIndexAtOffset(lyrics: LyricLine[], centerIdx: number, offset: number): number {
    if (lyrics.length === 0) return -1;

    let anchorIdx = centerIdx;
    if (anchorIdx < 0 || anchorIdx >= lyrics.length || isEmptyLyricLine(lyrics[anchorIdx])) {
        const prev = findLastContentIndex(lyrics, anchorIdx >= 0 ? anchorIdx - 1 : lyrics.length - 1);
        const next = findNextContentIndex(lyrics, anchorIdx >= 0 ? anchorIdx - 1 : -1);
        anchorIdx = prev !== -1 ? prev : next;
        if (anchorIdx === -1) return -1;
    }

    if (offset === 0) return anchorIdx;

    let idx = anchorIdx;
    let steps = Math.abs(offset);
    const forward = offset > 0;

    while (steps > 0) {
        if (forward) {
            const next = findNextContentIndex(lyrics, idx);
            if (next === -1) return -1;
            idx = next;
        } else {
            const prev = findLastContentIndex(lyrics, idx - 1);
            if (prev === -1) return -1;
            idx = prev;
        }
        steps--;
    }

    return idx;
}

function resolveTimedAutoVisibility(
    lyrics: LyricLine[],
    time: number,
    rawActiveIdx: number
): AutoLyricVisibilityState {
    // Line is within its begin/end window
    if (rawActiveIdx !== -1 && !isEmptyLyricLine(lyrics[rawActiveIdx])) {
        return showLine(rawActiveIdx);
    }

    // Empty marker inside a timed file
    if (rawActiveIdx !== -1 && isEmptyLyricLine(lyrics[rawActiveIdx])) {
        const gapStart = lyrics[rawActiveIdx].time;
        const stickyIdx = findLastContentIndex(lyrics, rawActiveIdx - 1);
        if (stickyIdx === -1) {
            return hideUntilNext(lyrics, findNextContentIndex(lyrics, rawActiveIdx), 0);
        }
        if (time - gapStart < AUTO_LYRIC_GAP_THRESHOLD_SEC) {
            return showLine(stickyIdx);
        }
        return hideUntilNext(lyrics, findNextContentIndex(lyrics, rawActiveIdx), stickyIdx);
    }

    const nextContentIdx = findNextContentAfterTime(lyrics, time);
    if (nextContentIdx === 0) {
        return hideUntilNext(lyrics, 0, 0);
    }

    const stickyIdx = findLastContentIndex(
        lyrics,
        nextContentIdx > 0 ? nextContentIdx - 1 : lyrics.length - 1
    );

    if (stickyIdx === -1) {
        return hideUntilNext(lyrics, nextContentIdx !== -1 ? nextContentIdx : 0, 0);
    }

    const prevLine = lyrics[stickyIdx];

    // After final TTML cue — no next line, respect endTime (do not hold until audio end)
    if (nextContentIdx === -1) {
        if (prevLine.endTime !== undefined && time >= prevLine.endTime) {
            return hideUntilNext(lyrics, -1, stickyIdx);
        }
        return showLine(stickyIdx);
    }

    const nextLine = lyrics[nextContentIdx];
    const gapStart = prevLine.endTime ?? prevLine.time;
    const gapEnd = nextLine.time;
    const gapDuration = gapEnd - gapStart;

    if (time >= gapStart) {
        // Long uncued gap: hide. Short gap: keep previous line visible until next cue.
        if (gapDuration > AUTO_TTML_GAP_HIDE_THRESHOLD_SEC) {
            return hideUntilNext(lyrics, nextContentIdx, stickyIdx);
        }
        return showLine(stickyIdx);
    }

    return showLine(stickyIdx);
}

function resolveLrcAutoVisibility(
    lyrics: LyricLine[],
    time: number,
    duration: number,
    rawActiveIdx: number
): AutoLyricVisibilityState {
    const lastContentIdx = findLastContentIndex(lyrics, lyrics.length - 1);

    if (rawActiveIdx !== -1 && !isEmptyLyricLine(lyrics[rawActiveIdx])) {
        const displayEnd = getLrcLineDisplayEnd(lyrics, rawActiveIdx);
        const nextContentIdx = findNextContentIndex(lyrics, rawActiveIdx);

        // Past predicted line duration — hide during long inter-line gap
        if (time >= displayEnd && nextContentIdx !== -1) {
            return hideUntilNext(lyrics, nextContentIdx, rawActiveIdx);
        }

        // Final line: hide toward end of track when audio tail is long
        if (
            duration > 0 &&
            lastContentIdx !== -1 &&
            rawActiveIdx === lastContentIdx &&
            nextContentIdx === -1
        ) {
            const anchorTime = lyrics[lastContentIdx].time;
            const tailDuration = duration - anchorTime;

            if (tailDuration > AUTO_LRC_TAIL_THRESHOLD_SEC && time >= getLrcLastLineHideTime(anchorTime, duration)) {
                return hideUntilNext(lyrics, -1, lastContentIdx);
            }
        }

        return showLine(rawActiveIdx);
    }

    // Empty LRC marker line (verse break)
    if (rawActiveIdx !== -1 && isEmptyLyricLine(lyrics[rawActiveIdx])) {
        const gapStart = lyrics[rawActiveIdx].time;
        const stickyIdx = findLastContentIndex(lyrics, rawActiveIdx - 1);

        if (stickyIdx === -1) {
            return hideUntilNext(
                lyrics,
                findNextContentIndex(lyrics, rawActiveIdx) !== -1 ? findNextContentIndex(lyrics, rawActiveIdx) : 0,
                0
            );
        }

        if (time - gapStart < AUTO_LYRIC_GAP_THRESHOLD_SEC) {
            return showLine(stickyIdx);
        }

        return hideUntilNext(lyrics, findNextContentIndex(lyrics, rawActiveIdx), stickyIdx);
    }

    return hideUntilNext(
        lyrics,
        findNextContentIndex(lyrics, -1) !== -1 ? findNextContentIndex(lyrics, -1) : 0,
        0
    );
}

export function resolveAutoLyricVisibility(
    lyrics: LyricLine[],
    time: number,
    duration = 0
): AutoLyricVisibilityState {
    const rawActiveIdx = findActiveLyricIndex(lyrics, time);

    if (lyricsHaveLineEndTimes(lyrics)) {
        return resolveTimedAutoVisibility(lyrics, time, rawActiveIdx);
    }

    return resolveLrcAutoVisibility(lyrics, time, duration, rawActiveIdx);
}
