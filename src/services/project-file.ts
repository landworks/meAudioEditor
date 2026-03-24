import type { Project, AudioSource, Track, AudioClip, FadeSettings } from '../types';
import { encodeWav } from '../utils/wav-encoder';
import { extractPeaks } from './peak-extractor';
import { audioEngine } from './audio-engine';

/**
 * Binary project file format (.meaudio):
 *
 *   [4 bytes]  Magic: "MEAE"
 *   [4 bytes]  Version: uint32 LE (currently 1)
 *   [4 bytes]  JSON header length: uint32 LE
 *   [N bytes]  JSON header (UTF-8) — project metadata + source descriptors
 *   [...]      Concatenated WAV data for each source
 *
 * The JSON header contains a `sources` array. Each entry records
 * `byteOffset` and `byteLength` pointing into the WAV data region
 * that follows the header.
 */

const MAGIC = 'MEAE';
const FORMAT_VERSION = 1;

interface SourceDescriptor {
  id: string;
  name: string;
  fileName: string;
  sampleRate: number;
  numberOfChannels: number;
  duration: number;
  byteOffset: number;
  byteLength: number;
}

interface SerializedClip {
  id: string;
  trackId: string;
  sourceId: string;
  name: string;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  volume: number;
  fadeIn: FadeSettings;
  fadeOut: FadeSettings;
}

interface SerializedTrack {
  id: string;
  name: string;
  clips: SerializedClip[];
  volume: number;
  pan: number;
  isMuted: boolean;
  isSolo: boolean;
  color: string;
}

interface FileHeader {
  project: {
    id: string;
    name: string;
    sampleRate: number;
    masterVolume: number;
    createdAt: number;
    updatedAt: number;
    tracks: SerializedTrack[];
  };
  sources: SourceDescriptor[];
}

function serializeClip(clip: AudioClip): SerializedClip {
  return {
    id: clip.id,
    trackId: clip.trackId,
    sourceId: clip.sourceId,
    name: clip.name,
    startTime: clip.startTime,
    duration: clip.duration,
    trimStart: clip.trimStart,
    trimEnd: clip.trimEnd,
    volume: clip.volume,
    fadeIn: clip.fadeIn,
    fadeOut: clip.fadeOut,
  };
}

function serializeTrack(track: Track): SerializedTrack {
  return {
    id: track.id,
    name: track.name,
    clips: track.clips.map(serializeClip),
    volume: track.volume,
    pan: track.pan,
    isMuted: track.isMuted,
    isSolo: track.isSolo,
    color: track.color,
  };
}

/**
 * Save the current project + all audio sources to a downloadable .meaudio file.
 */
export async function saveProjectFile(
  project: Project,
  sources: Map<string, AudioSource>,
): Promise<Blob> {
  // Collect all source IDs actually used by clips
  const usedSourceIds = new Set<string>();
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      usedSourceIds.add(clip.sourceId);
    }
  }

  // Encode each used source to WAV
  const wavBuffers: { id: string; data: ArrayBuffer }[] = [];
  for (const sourceId of usedSourceIds) {
    const source = sources.get(sourceId);
    if (!source) continue;
    const wavData = encodeWav(source.buffer);
    wavBuffers.push({ id: sourceId, data: wavData });
  }

  // Build source descriptors with byte offsets
  let runningOffset = 0;
  const sourceDescriptors: SourceDescriptor[] = [];
  for (const { id, data } of wavBuffers) {
    const source = sources.get(id)!;
    sourceDescriptors.push({
      id: source.id,
      name: source.name,
      fileName: source.fileName,
      sampleRate: source.sampleRate,
      numberOfChannels: source.numberOfChannels,
      duration: source.duration,
      byteOffset: runningOffset,
      byteLength: data.byteLength,
    });
    runningOffset += data.byteLength;
  }

  // Build JSON header
  const header: FileHeader = {
    project: {
      id: project.id,
      name: project.name,
      sampleRate: project.sampleRate,
      masterVolume: project.masterVolume,
      createdAt: project.createdAt,
      updatedAt: Date.now(),
      tracks: project.tracks.map(serializeTrack),
    },
    sources: sourceDescriptors,
  };

  const headerJson = JSON.stringify(header);
  const headerBytes = new TextEncoder().encode(headerJson);

  // Assemble binary file
  const metaSize = 4 + 4 + 4; // magic + version + header length
  const totalSize = metaSize + headerBytes.byteLength + runningOffset;
  const fileBuffer = new ArrayBuffer(totalSize);
  const fileView = new DataView(fileBuffer);
  const fileBytes = new Uint8Array(fileBuffer);

  // Magic
  for (let i = 0; i < 4; i++) fileView.setUint8(i, MAGIC.charCodeAt(i));
  // Version
  fileView.setUint32(4, FORMAT_VERSION, true);
  // Header length
  fileView.setUint32(8, headerBytes.byteLength, true);
  // Header JSON
  fileBytes.set(headerBytes, metaSize);
  // WAV data
  let writeOffset = metaSize + headerBytes.byteLength;
  for (const { data } of wavBuffers) {
    fileBytes.set(new Uint8Array(data), writeOffset);
    writeOffset += data.byteLength;
  }

  return new Blob([fileBuffer], { type: 'application/octet-stream' });
}

/**
 * Load a .meaudio project file and return the restored project + sources.
 */
export async function loadProjectFile(
  file: File,
): Promise<{ project: Project; sources: AudioSource[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const view = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);

  // Validate magic
  const magic = String.fromCharCode(
    view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3),
  );
  if (magic !== MAGIC) {
    throw new Error('Not a valid meAudioEditor project file');
  }

  const version = view.getUint32(4, true);
  if (version > FORMAT_VERSION) {
    throw new Error(`Project file version ${version} is newer than this app supports`);
  }

  const headerLength = view.getUint32(8, true);
  const metaSize = 12;
  const headerJson = new TextDecoder().decode(bytes.slice(metaSize, metaSize + headerLength));
  const header: FileHeader = JSON.parse(headerJson);

  const audioDataStart = metaSize + headerLength;

  // Decode each audio source
  await audioEngine.ensureResumed();
  const loadedSources: AudioSource[] = [];

  for (const desc of header.sources) {
    const wavSlice = arrayBuffer.slice(
      audioDataStart + desc.byteOffset,
      audioDataStart + desc.byteOffset + desc.byteLength,
    );
    const audioBuffer = await audioEngine.decodeArrayBuffer(wavSlice);
    const peaks = extractPeaks(audioBuffer);

    loadedSources.push({
      id: desc.id,
      name: desc.name,
      fileName: desc.fileName,
      sampleRate: desc.sampleRate,
      numberOfChannels: desc.numberOfChannels,
      duration: desc.duration,
      peaks,
      buffer: audioBuffer,
    });
  }

  // Reconstruct project with isSelected reset
  const project: Project = {
    id: header.project.id,
    name: header.project.name,
    sampleRate: header.project.sampleRate,
    masterVolume: header.project.masterVolume,
    createdAt: header.project.createdAt,
    updatedAt: header.project.updatedAt,
    tracks: header.project.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) => ({ ...c, isSelected: false })),
    })),
  };

  return { project, sources: loadedSources };
}
