import { RenderConfig, VisualSlide } from '../types';

interface DecodedSlide {
  slide: VisualSlide;
  buffer: AudioBuffer;
}

async function resampleBuffer(buffer: AudioBuffer, targetSampleRate: number): Promise<AudioBuffer> {
  if (buffer.sampleRate === targetSampleRate) return buffer;

  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    Math.ceil(buffer.duration * targetSampleRate),
    targetSampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  return offlineCtx.startRendering();
}

export async function decodeTimelineAudioSlides(
  visualSlides: VisualSlide[],
  targetSampleRate: number,
  onLog?: (message: string) => void
): Promise<DecodedSlide[]> {
  const audioSlides = visualSlides.filter(s => s.type === 'audio');
  if (audioSlides.length === 0) return [];

  const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const decoded: DecodedSlide[] = [];

  for (const slide of audioSlides) {
    try {
      const response = await fetch(slide.url);
      const arrayBuffer = await response.arrayBuffer();
      let buffer = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
      if (buffer.sampleRate !== targetSampleRate) {
        buffer = await resampleBuffer(buffer, targetSampleRate);
      }
      decoded.push({ slide, buffer });
    } catch (e) {
      onLog?.(`[TimelineAudio] Failed to decode "${slide.name}": ${(e as Error).message}`);
    }
  }

  tempCtx.close();
  return decoded;
}

/**
 * Mix timeline audio slides (Audio 1 / Audio 2 tracks) into a base audio buffer.
 * @param globalStartTime - Where this buffer sits on the project timeline (seconds).
 */
export async function mixTimelineAudioIntoBuffer(
  baseBuffer: AudioBuffer,
  decodedSlides: DecodedSlide[],
  renderConfig: RenderConfig,
  globalStartTime = 0,
  onLog?: (message: string) => void
): Promise<AudioBuffer> {
  const applicableSlides = decodedSlides.filter(({ slide }) => {
    const layer = slide.layer || 0;
    if (renderConfig.layerVisibility?.audio?.[layer] === false) return false;
    if (slide.isMuted === true) return false;
    return slide.endTime > globalStartTime && slide.startTime < globalStartTime + baseBuffer.duration;
  });

  if (applicableSlides.length === 0) return baseBuffer;

  const sampleRate = baseBuffer.sampleRate;
  const numberOfChannels = Math.max(2, baseBuffer.numberOfChannels);
  const length = baseBuffer.length;
  const globalEndTime = globalStartTime + baseBuffer.duration;

  const offlineCtx = new OfflineAudioContext(numberOfChannels, length, sampleRate);

  const baseSource = offlineCtx.createBufferSource();
  baseSource.buffer = baseBuffer;
  baseSource.connect(offlineCtx.destination);
  baseSource.start(0);

  for (const { slide, buffer } of applicableSlides) {
    const volume = slide.volume !== undefined ? slide.volume : 1;
    const speed = slide.playbackRate || 1;
    const mediaOffset = slide.mediaStartOffset || 0;

    const overlapStart = Math.max(slide.startTime, globalStartTime);
    const overlapEnd = Math.min(slide.endTime, globalEndTime);
    const overlapDuration = overlapEnd - overlapStart;
    if (overlapDuration <= 0) continue;

    const when = overlapStart - globalStartTime;
    const slideElapsed = overlapStart - slide.startTime;
    const sourceOffset = mediaOffset + slideElapsed * speed;
    if (sourceOffset >= buffer.duration) continue;

    const sourceDuration = Math.min(overlapDuration * speed, buffer.duration - sourceOffset);
    if (sourceDuration <= 0) continue;

    const gain = offlineCtx.createGain();
    gain.gain.value = volume;
    gain.connect(offlineCtx.destination);

    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = speed;
    source.connect(gain);
    source.start(when, sourceOffset, sourceDuration);
  }

  onLog?.(`[TimelineAudio] Mixed ${applicableSlides.length} timeline audio clip(s)`);
  return offlineCtx.startRendering();
}

/** Encode an AudioBuffer as 16-bit PCM WAV for FFmpeg input. */
export function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const headerLength = 44;
  const arrayBuffer = new ArrayBuffer(headerLength + dataLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = headerLength;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = buffer.getChannelData(Math.min(ch, buffer.numberOfChannels - 1));
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return arrayBuffer;
}
