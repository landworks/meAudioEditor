import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<void> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;

  if (loadPromise) {
    await loadPromise;
    return ffmpegInstance!;
  }

  ffmpegInstance = new FFmpeg();

  loadPromise = (async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
    await ffmpegInstance!.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  })();

  await loadPromise;
  return ffmpegInstance!;
}

/**
 * Extract audio from a video file and return an ArrayBuffer of WAV data.
 */
export async function extractAudioFromVideo(file: File): Promise<ArrayBuffer> {
  const ffmpeg = await getFFmpeg();
  const inputName = 'input' + getExtension(file.name);
  const outputName = 'output.wav';

  const data = new Uint8Array(await file.arrayBuffer());
  await ffmpeg.writeFile(inputName, data);
  await ffmpeg.exec(['-i', inputName, '-vn', '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2', outputName]);

  const output = await ffmpeg.readFile(outputName);
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  const bytes = output as Uint8Array;
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/**
 * Encode a stereo AudioBuffer to MP3 and return a Blob.
 */
export async function encodeToMp3(
  audioBuffer: AudioBuffer,
  bitrate: number,
  onProgress?: (ratio: number) => void,
): Promise<Blob> {
  const ffmpeg = await getFFmpeg();

  ffmpeg.on('progress', ({ progress }) => {
    onProgress?.(Math.min(1, progress));
  });

  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;

  // Interleave channels into 16-bit PCM
  const pcmData = new Int16Array(length * numChannels);
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = audioBuffer.getChannelData(ch)[i];
      pcmData[i * numChannels + ch] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    }
  }

  const inputName = 'input.pcm';
  const outputName = 'output.mp3';

  await ffmpeg.writeFile(inputName, new Uint8Array(pcmData.buffer));
  await ffmpeg.exec([
    '-f', 's16le',
    '-ar', String(sampleRate),
    '-ac', String(numChannels),
    '-i', inputName,
    '-b:a', `${bitrate}k`,
    '-y',
    outputName,
  ]);

  const output = await ffmpeg.readFile(outputName);
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  const bytes = new Uint8Array(output as Uint8Array);
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/mpeg' });
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.substring(dot) : '';
}
