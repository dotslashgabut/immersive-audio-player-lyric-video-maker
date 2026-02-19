// Shared Audio Context to prevent HTMLMediaElement from binding to multiple contexts
// which causes the "InvalidStateError: Failed to execute 'createMediaElementSource' on 'AudioContext'"

export let sharedAudioContext: AudioContext | null = null;
const sourceNodeMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

export const getSharedAudioContext = () => {
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
        sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return sharedAudioContext;
};

export const getOrCreateMediaElementSource = (element: HTMLMediaElement, ctx = getSharedAudioContext()) => {
    if (sourceNodeMap.has(element)) {
        return sourceNodeMap.get(element)!;
    }
    const source = ctx.createMediaElementSource(element);
    sourceNodeMap.set(element, source);
    return source;
};
