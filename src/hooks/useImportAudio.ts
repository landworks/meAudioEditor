import { useCallback, useState } from 'react';
import { audioEngine } from '../services/audio-engine';
import { extractPeaks } from '../services/peak-extractor';
import { extractAudioFromVideo } from '../services/ffmpeg-service';
import { categorizeFile, validateFile } from '../utils/file-helpers';
import { useProjectStore } from '../state/project-store';
import type { AudioSource } from '../types';

interface ImportState {
  isImporting: boolean;
  progress: string;
  error: string | null;
}

export function useImportAudio() {
  const [state, setState] = useState<ImportState>({
    isImporting: false,
    progress: '',
    error: null,
  });

  const addSource = useProjectStore((s) => s.addSource);
  const addClipToTrack = useProjectStore((s) => s.addClipToTrack);
  const project = useProjectStore((s) => s.project);
  const addTrack = useProjectStore((s) => s.addTrack);

  const importFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setState({ isImporting: false, progress: '', error: validationError });
        return;
      }

      setState({ isImporting: true, progress: 'Reading file...', error: null });

      try {
        await audioEngine.ensureResumed();

        let audioBuffer: AudioBuffer;
        const category = categorizeFile(file);

        if (category === 'video') {
          setState((s) => ({ ...s, progress: 'Extracting audio from video...' }));
          const wavData = await extractAudioFromVideo(file);
          audioBuffer = await audioEngine.decodeArrayBuffer(wavData);
        } else {
          setState((s) => ({ ...s, progress: 'Decoding audio...' }));
          audioBuffer = await audioEngine.decodeAudioFile(file);
        }

        setState((s) => ({ ...s, progress: 'Generating waveform...' }));
        const peaks = extractPeaks(audioBuffer);

        const source: AudioSource = {
          id: crypto.randomUUID(),
          name: file.name.replace(/\.[^.]+$/, ''),
          fileName: file.name,
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: audioBuffer.numberOfChannels,
          duration: audioBuffer.duration,
          peaks,
          buffer: audioBuffer,
        };

        addSource(source);

        // Find first track with no clips, or create new track
        let targetTrackId = project.tracks.find((t) => t.clips.length === 0)?.id;
        if (!targetTrackId) {
          targetTrackId = addTrack();
        }

        addClipToTrack(targetTrackId, source.id, source.name, source.duration);

        setState({ isImporting: false, progress: '', error: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to import audio file';
        setState({ isImporting: false, progress: '', error: message });
      }
    },
    [addSource, addClipToTrack, project.tracks, addTrack],
  );

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return { ...state, importFile, clearError };
}
