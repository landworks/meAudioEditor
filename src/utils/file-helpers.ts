import { SUPPORTED_AUDIO_TYPES, SUPPORTED_VIDEO_TYPES, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '../constants';

export type FileCategory = 'audio' | 'video' | 'unsupported';

export function categorizeFile(file: File): FileCategory {
  if (SUPPORTED_AUDIO_TYPES.includes(file.type)) return 'audio';
  if (SUPPORTED_VIDEO_TYPES.includes(file.type)) return 'video';
  return 'unsupported';
}

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File is too large (${Math.round(file.size / 1024 / 1024)} MB). Maximum is ${MAX_FILE_SIZE_MB} MB.`;
  }

  const category = categorizeFile(file);
  if (category === 'unsupported') {
    return `Unsupported file type: ${file.type || 'unknown'}. Please upload MP3, WAV, M4A, or a video file.`;
  }

  return null;
}
