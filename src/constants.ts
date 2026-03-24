export const APP_VERSION = '1.16.4';

export const MIN_PIXELS_PER_SECOND = 1;
export const MAX_PIXELS_PER_SECOND = 1476;
export const DEFAULT_PIXELS_PER_SECOND = 50;

export const TRACK_HEIGHT = 100;
export const TRACK_HEADER_WIDTH = 180;
export const TRACK_HEADER_WIDTH_MOBILE = 60;
export const RULER_HEIGHT = 30;

export const MAX_VOLUME = 2;

export const WAVEFORM_PEAKS_PER_SECOND = 4000;

export const DEFAULT_SAMPLE_RATE = 44100;
export const DEFAULT_BITRATE = 192;

export const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
  'audio/webm',
];

export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
];

export const ACCEPTED_FILE_TYPES = [
  ...SUPPORTED_AUDIO_TYPES,
  ...SUPPORTED_VIDEO_TYPES,
].join(',');

export const MAX_FILE_SIZE_MB = 500;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
