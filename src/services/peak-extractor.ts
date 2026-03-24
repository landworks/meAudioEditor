import { WAVEFORM_PEAKS_PER_SECOND } from '../constants';

/**
 * Extract peak amplitude data from an AudioBuffer for waveform rendering.
 * Returns a Float32Array where each value is the max absolute amplitude
 * within a window, normalized to 0–1.
 */
export function extractPeaks(buffer: AudioBuffer, peaksPerSecond = WAVEFORM_PEAKS_PER_SECOND): Float32Array {
  const totalPeaks = Math.ceil(buffer.duration * peaksPerSecond);
  const peaks = new Float32Array(totalPeaks);
  const channelData: Float32Array[] = [];

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    channelData.push(buffer.getChannelData(ch));
  }

  const samplesPerPeak = buffer.sampleRate / peaksPerSecond;

  for (let i = 0; i < totalPeaks; i++) {
    const start = Math.floor(i * samplesPerPeak);
    const end = Math.min(Math.floor((i + 1) * samplesPerPeak), buffer.length);
    let max = 0;

    for (let ch = 0; ch < channelData.length; ch++) {
      const data = channelData[ch];
      for (let s = start; s < end; s++) {
        const abs = Math.abs(data[s]);
        if (abs > max) max = abs;
      }
    }

    peaks[i] = max;
  }

  return peaks;
}
