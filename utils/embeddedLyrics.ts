/**
 * Custom embedded lyrics extractor for audio formats not fully supported by jsmediatags.
 *
 * jsmediatags limitations:
 * - FLAC: Parses Vorbis Comments but only extracts TITLE/ARTIST/ALBUM/TRACK/GENRE.
 *         The LYRICS field is completely ignored in the switch statement.
 * - OGG/OPUS: No reader exists at all — jsmediatags calls onError immediately.
 * - WAV/WMA: No reader exists — same as above.
 *
 * This module provides direct binary parsing for these formats.
 */

/** Keys commonly used for lyrics in Vorbis Comments (case-insensitive match) */
const LYRICS_KEYS = new Set([
  'LYRICS',
  'UNSYNCEDLYRICS',
  'UNSYNCED LYRICS',
  'SYNCEDLYRICS',
  'SYNCED LYRICS',
]);

export interface EmbeddedLyricsResult {
  lyrics: string | null;
  title?: string;
  artist?: string;
  album?: string;
}

/**
 * Attempt to extract embedded lyrics from an audio file using custom binary parsing.
 * This is meant to be called as a fallback/supplement when jsmediatags doesn't return lyrics.
 */
export async function extractEmbeddedLyrics(file: File): Promise<EmbeddedLyricsResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (!ext) return { lyrics: null };

  try {
    if (ext === 'flac') {
      return await extractFromFLAC(file);
    } else if (ext === 'ogg' || ext === 'opus' || ext === 'oga' || ext === 'spx') {
      return await extractFromOGG(file);
    } else if (ext === 'wav' || ext === 'wave') {
      return await extractFromWAV(file);
    }
  } catch (e) {
    console.warn('[EmbeddedLyrics] Extraction failed:', e);
  }

  return { lyrics: null };
}


// ─── FLAC ────────────────────────────────────────────────────────────────────

/**
 * Parse FLAC metadata blocks to find and read the VORBIS_COMMENT block,
 * then extract lyrics, title, artist, and album from it.
 *
 * FLAC structure:
 *   4 bytes: "fLaC" magic
 *   Then metadata blocks, each:
 *     1 byte:  bit 7 = last-block flag, bits 0-6 = block type
 *     3 bytes: block size (big-endian)
 *     N bytes: block data
 *   Block type 4 = VORBIS_COMMENT
 */
async function extractFromFLAC(file: File): Promise<EmbeddedLyricsResult> {
  // Read enough to walk all metadata block headers (usually within the first few MB)
  const INITIAL_READ = Math.min(file.size, 256 * 1024); // 256KB for headers
  let buffer = await file.slice(0, INITIAL_READ).arrayBuffer();
  let bytes = new Uint8Array(buffer);

  // Verify fLaC magic
  if (bytes[0] !== 0x66 || bytes[1] !== 0x4C || bytes[2] !== 0x61 || bytes[3] !== 0x43) {
    return { lyrics: null };
  }

  let offset = 4;

  while (offset + 4 <= bytes.length) {
    const headerByte = bytes[offset];
    const isLastBlock = (headerByte & 0x80) !== 0;
    const blockType = headerByte & 0x7F;
    const blockSize = (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];

    const blockDataStart = offset + 4;
    const blockDataEnd = blockDataStart + blockSize;

    if (blockType === 4) { // VORBIS_COMMENT
      // Ensure we have the full block loaded
      let blockBytes: Uint8Array;
      if (blockDataEnd > bytes.length) {
        // Need to read the full comment block from the file
        const fullBuf = await file.slice(blockDataStart, blockDataEnd).arrayBuffer();
        blockBytes = new Uint8Array(fullBuf);
      } else {
        blockBytes = bytes.slice(blockDataStart, blockDataEnd);
      }

      const view = new DataView(blockBytes.buffer, blockBytes.byteOffset, blockBytes.byteLength);
      return parseVorbisCommentsForLyrics(view, blockBytes);
    }

    offset = blockDataEnd;

    // If we've run past our initial read without finding the comment block,
    // load more data to continue walking headers
    if (offset + 4 > bytes.length && !isLastBlock) {
      const nextRead = Math.min(file.size, offset + 256 * 1024);
      if (nextRead > bytes.length) {
        buffer = await file.slice(0, nextRead).arrayBuffer();
        bytes = new Uint8Array(buffer);
      } else {
        break;
      }
    }

    if (isLastBlock) break;
  }

  return { lyrics: null };
}


// ─── OGG (Vorbis / OPUS / Speex) ────────────────────────────────────────────

/**
 * Parse an OGG container to find the comment header packet and extract lyrics.
 *
 * OGG structure:
 *   Pages identified by "OggS" magic (27-byte header + segment table + data).
 *   Packets are assembled from segments (255-byte segments continue, <255 terminates).
 *
 * Comment header packet location:
 *   - Vorbis: 2nd packet, starts with 0x03 + "vorbis"
 *   - OPUS:   2nd packet, starts with "OpusTags"
 *   - Speex:  2nd packet, starts with "Speex   " comment header
 */
async function extractFromOGG(file: File): Promise<EmbeddedLyricsResult> {
  // Comment headers are typically within the first 1MB even with large cover art
  const readSize = Math.min(file.size, 2 * 1024 * 1024);
  const buffer = await file.slice(0, readSize).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let offset = 0;
  let packetIndex = 0;
  let currentPacketChunks: Uint8Array[] = [];

  while (offset + 27 < bytes.length) {
    // Verify OggS magic
    if (bytes[offset] !== 0x4F || bytes[offset + 1] !== 0x67 ||
        bytes[offset + 2] !== 0x67 || bytes[offset + 3] !== 0x53) {
      break; // Not a valid OGG page
    }

    const numSegments = bytes[offset + 26];

    // Safety check
    if (offset + 27 + numSegments > bytes.length) break;

    // Read segment table & calculate page data size
    const segmentSizes: number[] = [];
    for (let i = 0; i < numSegments; i++) {
      segmentSizes.push(bytes[offset + 27 + i]);
    }

    let dataOffset = offset + 27 + numSegments;

    // Process each segment
    for (let i = 0; i < segmentSizes.length; i++) {
      const segSize = segmentSizes[i];

      if (dataOffset + segSize > bytes.length) {
        // Truncated data
        return { lyrics: null };
      }

      currentPacketChunks.push(bytes.slice(dataOffset, dataOffset + segSize));
      dataOffset += segSize;

      // A segment < 255 bytes terminates the current packet
      if (segSize < 255) {
        if (packetIndex === 1) {
          // This is the comment header packet
          const commentPacket = concatUint8Arrays(currentPacketChunks);
          return parseOGGCommentPacket(commentPacket);
        }
        packetIndex++;
        currentPacketChunks = [];
      }
    }

    offset = dataOffset;

    // Safety: don't scan forever
    if (packetIndex > 5) break;
  }

  return { lyrics: null };
}

/**
 * Parse an OGG comment header packet (Vorbis / OPUS / Speex)
 * to extract Vorbis Comments including lyrics.
 */
function parseOGGCommentPacket(packet: Uint8Array): EmbeddedLyricsResult {
  if (packet.length < 10) return { lyrics: null };

  const decoder = new TextDecoder('utf-8');
  let vorbisCommentOffset = 0;

  // Vorbis: byte 0x03 + "vorbis" (7 bytes total)
  if (packet[0] === 0x03 && packet.length > 7) {
    const magic = decoder.decode(packet.slice(1, 7));
    if (magic === 'vorbis') {
      vorbisCommentOffset = 7;
    }
  }

  // OPUS: "OpusTags" (8 bytes)
  if (vorbisCommentOffset === 0 && packet.length > 8) {
    const magic = decoder.decode(packet.slice(0, 8));
    if (magic === 'OpusTags') {
      vorbisCommentOffset = 8;
    }
  }

  // Speex: comment header doesn't have a magic prefix for the comment portion,
  // but the second packet in a Speex stream IS the Vorbis Comment block directly.
  // Try parsing from offset 0 if neither Vorbis nor OPUS matched.
  if (vorbisCommentOffset === 0) {
    // Attempt to parse as raw Vorbis Comment (Speex and some others)
    vorbisCommentOffset = 0;
    // Verify it looks like a valid Vorbis Comment by checking if vendor length is sane
    if (packet.length >= 4) {
      const vendorLen = new DataView(packet.buffer, packet.byteOffset, packet.byteLength).getUint32(0, true);
      if (vendorLen > 0 && vendorLen < packet.length - 4) {
        // Looks plausible
        vorbisCommentOffset = 0;
      } else {
        return { lyrics: null };
      }
    }
  }

  const commentData = packet.slice(vorbisCommentOffset);
  const view = new DataView(commentData.buffer, commentData.byteOffset, commentData.byteLength);
  return parseVorbisCommentsForLyrics(view, commentData);
}


// ─── WAV ─────────────────────────────────────────────────────────────────────

/**
 * Parse a WAV/RIFF file looking for embedded lyrics.
 *
 * WAV can embed metadata in several ways:
 *   1. An "id3 " or "ID3 " RIFF chunk containing a full ID3v2 tag
 *   2. A "LIST" chunk with "INFO" sub-chunks (ILYC = lyrics)
 *
 * For case 1, jsmediatags *might* handle it if the ID3v2 tag is at the start.
 * This parser also handles case 2 and case 1 when the tag is inside RIFF chunks.
 */
async function extractFromWAV(file: File): Promise<EmbeddedLyricsResult> {
  const readSize = Math.min(file.size, 2 * 1024 * 1024);
  const buffer = await file.slice(0, readSize).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // Verify RIFF header
  const riffMagic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (riffMagic !== 'RIFF') return { lyrics: null };

  const waveMagic = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (waveMagic !== 'WAVE') return { lyrics: null };

  const result: EmbeddedLyricsResult = { lyrics: null };
  let offset = 12; // Skip RIFF header + "WAVE"

  while (offset + 8 <= bytes.length) {
    const chunkId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'LIST' && offset + 12 <= bytes.length) {
      const listType = String.fromCharCode(bytes[offset + 8], bytes[offset + 9], bytes[offset + 10], bytes[offset + 11]);
      if (listType === 'INFO') {
        // Parse INFO sub-chunks
        let subOffset = offset + 12;
        const listEnd = Math.min(offset + 8 + chunkSize, bytes.length);
        const decoder = new TextDecoder('utf-8');

        while (subOffset + 8 <= listEnd) {
          const subId = String.fromCharCode(bytes[subOffset], bytes[subOffset + 1], bytes[subOffset + 2], bytes[subOffset + 3]);
          const subSize = view.getUint32(subOffset + 4, true);
          const subDataEnd = Math.min(subOffset + 8 + subSize, listEnd);

          if (subId === 'ILYC' || subId === 'ILYR') {
            // Lyrics chunk
            const lyricsBytes = bytes.slice(subOffset + 8, subDataEnd);
            result.lyrics = decoder.decode(lyricsBytes).replace(/\0+$/, '');
          } else if (subId === 'INAM') {
            result.title = decoder.decode(bytes.slice(subOffset + 8, subDataEnd)).replace(/\0+$/, '');
          } else if (subId === 'IART') {
            result.artist = decoder.decode(bytes.slice(subOffset + 8, subDataEnd)).replace(/\0+$/, '');
          } else if (subId === 'IPRD') {
            result.album = decoder.decode(bytes.slice(subOffset + 8, subDataEnd)).replace(/\0+$/, '');
          }

          // Chunks are word-aligned (2-byte)
          subOffset = subDataEnd + (subSize % 2);
        }

        if (result.lyrics) return result;
      }
    }

    // id3 chunk (contains full ID3v2 tag)
    if ((chunkId === 'id3 ' || chunkId === 'ID3 ') && !result.lyrics) {
      // We could parse ID3v2 here, but jsmediatags should handle this.
      // Skip for now — this function is a supplement, not a replacement.
    }

    // Move to next chunk (chunks are word-aligned)
    offset += 8 + chunkSize + (chunkSize % 2);
  }

  return result;
}


// ─── Shared: Vorbis Comment parser ──────────────────────────────────────────

/**
 * Parse a Vorbis Comment block and extract lyrics + common metadata.
 *
 * Vorbis Comment format:
 *   4 bytes: vendor string length (little-endian)
 *   N bytes: vendor string (UTF-8)
 *   4 bytes: number of comments (little-endian)
 *   For each comment:
 *     4 bytes: comment length (little-endian)
 *     N bytes: comment string (UTF-8), format: KEY=VALUE
 */
function parseVorbisCommentsForLyrics(view: DataView, bytes: Uint8Array): EmbeddedLyricsResult {
  const result: EmbeddedLyricsResult = { lyrics: null };
  const decoder = new TextDecoder('utf-8');

  try {
    let offset = 0;

    if (offset + 4 > bytes.length) return result;

    // Vendor string
    const vendorLength = view.getUint32(offset, true);
    offset += 4 + vendorLength;

    if (offset + 4 > bytes.length) return result;

    // Number of user comments
    const numComments = view.getUint32(offset, true);
    offset += 4;

    for (let i = 0; i < numComments && offset + 4 <= bytes.length; i++) {
      const commentLength = view.getUint32(offset, true);
      offset += 4;

      if (offset + commentLength > bytes.length) break;

      const commentStr = decoder.decode(bytes.slice(offset, offset + commentLength));
      offset += commentLength;

      const eqIndex = commentStr.indexOf('=');
      if (eqIndex === -1) continue;

      const key = commentStr.substring(0, eqIndex).toUpperCase();
      const value = commentStr.substring(eqIndex + 1);

      if (LYRICS_KEYS.has(key)) {
        result.lyrics = value;
      } else if (key === 'TITLE' && !result.title) {
        result.title = value;
      } else if (key === 'ARTIST' && !result.artist) {
        result.artist = value;
      } else if (key === 'ALBUM' && !result.album) {
        result.album = value;
      }
    }
  } catch (e) {
    console.warn('[EmbeddedLyrics] Vorbis Comment parse error:', e);
  }

  return result;
}


// ─── Utility ─────────────────────────────────────────────────────────────────

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
