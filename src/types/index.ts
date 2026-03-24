export interface Project {
  id: string;
  name: string;
  sampleRate: number;
  tracks: Track[];
  masterVolume: number;
  createdAt: number;
  updatedAt: number;
}

export interface Track {
  id: string;
  name: string;
  clips: AudioClip[];
  volume: number;
  pan: number;
  isMuted: boolean;
  isSolo: boolean;
  color: string;
}

export interface AudioClip {
  id: string;
  trackId: string;
  sourceId: string;
  name: string;
  /** Position on timeline in seconds */
  startTime: number;
  /** Duration of the clip after trim (seconds) */
  duration: number;
  /** Trim from beginning of source audio (seconds) */
  trimStart: number;
  /** Trim from end of source audio (seconds) */
  trimEnd: number;
  /** Volume multiplier for this clip (0 = silent, 1 = unity, up to 2 = +6 dB boost) */
  volume: number;
  fadeIn: FadeSettings;
  fadeOut: FadeSettings;
  isSelected: boolean;
}

export interface FadeSettings {
  duration: number;
  curve: 'linear' | 'exponential' | 'equal-power';
}

export interface AudioSource {
  id: string;
  name: string;
  fileName: string;
  sampleRate: number;
  numberOfChannels: number;
  duration: number;
  /** Pre-computed waveform peak data for rendering */
  peaks: Float32Array;
  /** The decoded audio buffer */
  buffer: AudioBuffer;
}

export type PlaybackStatus = 'stopped' | 'playing' | 'paused';

export interface PlaybackState {
  status: PlaybackStatus;
  currentTime: number;
  isLooping: boolean;
  loopStart: number;
  loopEnd: number;
}

export interface ExportSettings {
  format: 'mp3';
  bitrate: 128 | 192 | 256 | 320;
  sampleRate: number;
}

export interface TimelineViewport {
  /** Pixels per second */
  pixelsPerSecond: number;
  /** Horizontal scroll offset in seconds */
  scrollLeft: number;
  /** Visible duration in seconds */
  visibleDuration: number;
}

export const TRACK_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
] as const;

export const DEFAULT_FADE: FadeSettings = {
  duration: 0,
  curve: 'linear',
};

export function createDefaultClip(
  sourceId: string,
  trackId: string,
  name: string,
  duration: number,
  startTime = 0,
): AudioClip {
  return {
    id: crypto.randomUUID(),
    trackId,
    sourceId,
    name,
    startTime,
    duration,
    trimStart: 0,
    trimEnd: 0,
    volume: 1,
    fadeIn: { ...DEFAULT_FADE },
    fadeOut: { ...DEFAULT_FADE },
    isSelected: false,
  };
}

export function createDefaultTrack(index: number): Track {
  return {
    id: crypto.randomUUID(),
    name: `Track ${index + 1}`,
    clips: [],
    volume: 0.8,
    pan: 0,
    isMuted: false,
    isSolo: false,
    color: TRACK_COLORS[index % TRACK_COLORS.length],
  };
}

