import { useCallback, useEffect } from 'react';
import { audioEngine } from '../services/audio-engine';
import { usePlaybackStore } from '../state/playback-store';
import { useProjectStore } from '../state/project-store';

export function usePlayback() {
  const { status, currentTime, setStatus, setCurrentTime } = usePlaybackStore();
  const project = useProjectStore((s) => s.project);
  const sources = useProjectStore((s) => s.sources);

  useEffect(() => {
    if (status !== 'playing') return;

    return useProjectStore.subscribe((state, prevState) => {
      if (state.project === prevState.project) return;

      audioEngine.setMasterVolume(state.project.masterVolume);

      const hasSolo = state.project.tracks.some((t) => t.isSolo);
      for (const track of state.project.tracks) {
        const isAudible = hasSolo ? track.isSolo : !track.isMuted;
        audioEngine.updateTrackVolume(track.id, isAudible ? track.volume : 0);
      }
    });
  }, [status]);

  const play = useCallback(async () => {
    await audioEngine.ensureResumed();
    setStatus('playing');

    audioEngine.play(
      project.tracks,
      sources,
      project.masterVolume,
      currentTime,
      (time) => setCurrentTime(time),
      () => {
        setStatus('stopped');
        setCurrentTime(0);
      },
    );
  }, [project, sources, currentTime, setStatus, setCurrentTime]);

  const pause = useCallback(() => {
    const time = audioEngine.pause();
    setStatus('paused');
    setCurrentTime(time);
  }, [setStatus, setCurrentTime]);

  const stop = useCallback(() => {
    audioEngine.stop();
    setStatus('stopped');
    setCurrentTime(0);
  }, [setStatus, setCurrentTime]);

  const togglePlayPause = useCallback(async () => {
    if (status === 'playing') {
      pause();
    } else {
      await play();
    }
  }, [status, play, pause]);

  const seek = useCallback(
    (time: number) => {
      const wasPlaying = status === 'playing';
      if (wasPlaying) {
        audioEngine.stop();
      }
      setCurrentTime(Math.max(0, time));
      if (wasPlaying) {
        audioEngine.play(
          project.tracks,
          sources,
          project.masterVolume,
          Math.max(0, time),
          (t) => setCurrentTime(t),
          () => {
            setStatus('stopped');
            setCurrentTime(0);
          },
        );
      }
    },
    [status, project, sources, setCurrentTime, setStatus],
  );

  const scrub = useCallback(
    async (time: number) => {
      const clamped = Math.max(0, time);
      if (status === 'playing') {
        seek(clamped);
        return;
      }
      await audioEngine.ensureResumed();
      setCurrentTime(clamped);
      audioEngine.scrub(project.tracks, sources, project.masterVolume, clamped);
    },
    [status, project, sources, setCurrentTime, seek],
  );

  return { status, currentTime, play, pause, stop, togglePlayPause, seek, scrub };
}
