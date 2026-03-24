import { create } from 'zustand';
import type { AudioClip, AudioSource, Project, Track, FadeSettings } from '../types';
import { createDefaultClip, createDefaultTrack } from '../types';
import { useHistoryStore } from './history-store';

interface ProjectState {
  project: Project;
  sources: Map<string, AudioSource>;

  // Project
  setProjectName: (name: string) => void;
  setMasterVolume: (volume: number) => void;

  // Sources
  addSource: (source: AudioSource) => void;
  getSource: (id: string) => AudioSource | undefined;

  // Tracks
  addTrack: () => string;
  removeTrack: (trackId: string) => void;
  deleteTrack: (trackId: string) => void;
  renameTrack: (trackId: string, name: string) => void;
  setTrackVolume: (trackId: string, volume: number) => void;
  toggleMute: (trackId: string) => void;
  toggleSolo: (trackId: string) => void;

  // Clips
  addClipToTrack: (trackId: string, sourceId: string, name: string, duration: number, startTime?: number) => string;
  removeClip: (trackId: string, clipId: string) => void;
  updateClip: (trackId: string, clipId: string, updates: Partial<AudioClip>) => void;
  selectClip: (trackId: string, clipId: string) => void;
  deselectAll: () => void;
  splitClipAtTime: (trackId: string, clipId: string, time: number) => void;
  setClipFadeIn: (trackId: string, clipId: string, fade: FadeSettings) => void;
  setClipFadeOut: (trackId: string, clipId: string, fade: FadeSettings) => void;
  moveClipToTrack: (fromTrackId: string, clipId: string, toTrackId: string) => void;

  // Project file
  loadProject: (project: Project, sources: AudioSource[]) => void;

  // History
  captureSnapshot: () => void;
  undo: () => void;
  redo: () => void;

  // Bulk
  getProjectDuration: () => number;
  getSelectedClip: () => { track: Track; clip: AudioClip } | null;
}

function updateTrack(tracks: Track[], trackId: string, updater: (t: Track) => Track): Track[] {
  return tracks.map((t) => (t.id === trackId ? updater(t) : t));
}

function updateClipInTrack(track: Track, clipId: string, updater: (c: AudioClip) => AudioClip): Track {
  return { ...track, clips: track.clips.map((c) => (c.id === clipId ? updater(c) : c)) };
}

function pushHistory(project: Project) {
  useHistoryStore.getState().push(project);
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: {
    id: crypto.randomUUID(),
    name: 'Untitled Project',
    sampleRate: 44100,
    tracks: [createDefaultTrack(0)],
    masterVolume: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  sources: new Map(),

  setProjectName: (name) => {
    pushHistory(get().project);
    set((s) => ({ project: { ...s.project, name, updatedAt: Date.now() } }));
  },

  setMasterVolume: (volume) =>
    set((s) => ({ project: { ...s.project, masterVolume: volume, updatedAt: Date.now() } })),

  addSource: (source) =>
    set((s) => {
      const next = new Map(s.sources);
      next.set(source.id, source);
      return { sources: next };
    }),

  getSource: (id) => get().sources.get(id),

  addTrack: () => {
    pushHistory(get().project);
    const track = createDefaultTrack(get().project.tracks.length);
    set((s) => ({
      project: {
        ...s.project,
        tracks: [...s.project.tracks, track],
        updatedAt: Date.now(),
      },
    }));
    return track.id;
  },

  removeTrack: (trackId) =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.filter((t) => t.id !== trackId),
        updatedAt: Date.now(),
      },
    })),

  deleteTrack: (trackId) => {
    const { project } = get();
    if (project.tracks.length <= 1) return;
    pushHistory(project);
    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.filter((t) => t.id !== trackId),
        updatedAt: Date.now(),
      },
    }));
  },

  renameTrack: (trackId, name) => {
    pushHistory(get().project);
    set((s) => ({
      project: {
        ...s.project,
        tracks: updateTrack(s.project.tracks, trackId, (t) => ({ ...t, name })),
        updatedAt: Date.now(),
      },
    }));
  },

  setTrackVolume: (trackId, volume) =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: updateTrack(s.project.tracks, trackId, (t) => ({ ...t, volume })),
        updatedAt: Date.now(),
      },
    })),

  toggleMute: (trackId) => {
    pushHistory(get().project);
    set((s) => ({
      project: {
        ...s.project,
        tracks: updateTrack(s.project.tracks, trackId, (t) => ({
          ...t,
          isMuted: !t.isMuted,
        })),
        updatedAt: Date.now(),
      },
    }));
  },

  toggleSolo: (trackId) => {
    pushHistory(get().project);
    set((s) => ({
      project: {
        ...s.project,
        tracks: updateTrack(s.project.tracks, trackId, (t) => ({
          ...t,
          isSolo: !t.isSolo,
        })),
        updatedAt: Date.now(),
      },
    }));
  },

  addClipToTrack: (trackId, sourceId, name, duration, startTime = 0) => {
    pushHistory(get().project);
    const clip = createDefaultClip(sourceId, trackId, name, duration, startTime);
    set((s) => ({
      project: {
        ...s.project,
        tracks: updateTrack(s.project.tracks, trackId, (t) => ({
          ...t,
          clips: [...t.clips, clip],
        })),
        updatedAt: Date.now(),
      },
    }));
    return clip.id;
  },

  removeClip: (trackId, clipId) => {
    pushHistory(get().project);
    set((s) => ({
      project: {
        ...s.project,
        tracks: updateTrack(s.project.tracks, trackId, (t) => ({
          ...t,
          clips: t.clips.filter((c) => c.id !== clipId),
        })),
        updatedAt: Date.now(),
      },
    }));
  },

  updateClip: (trackId, clipId, updates) =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: updateTrack(s.project.tracks, trackId, (t) =>
          updateClipInTrack(t, clipId, (c) => ({ ...c, ...updates })),
        ),
        updatedAt: Date.now(),
      },
    })),

  selectClip: (trackId, clipId) =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => ({
            ...c,
            isSelected: t.id === trackId && c.id === clipId,
          })),
        })),
      },
    })),

  deselectAll: () =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => ({ ...c, isSelected: false })),
        })),
      },
    })),

  splitClipAtTime: (trackId, clipId, time) => {
    const state = get();
    const track = state.project.tracks.find((t) => t.id === trackId);
    const clip = track?.clips.find((c) => c.id === clipId);
    if (!track || !clip) return;

    const relativeTime = time - clip.startTime;
    if (relativeTime <= 0 || relativeTime >= clip.duration) return;

    pushHistory(state.project);

    const leftClip: AudioClip = {
      ...clip,
      duration: relativeTime,
      fadeOut: { duration: 0, curve: 'linear' },
      isSelected: false,
    };

    const rightClip: AudioClip = {
      ...clip,
      id: crypto.randomUUID(),
      startTime: time,
      trimStart: clip.trimStart + relativeTime,
      duration: clip.duration - relativeTime,
      fadeIn: { duration: 0, curve: 'linear' },
      isSelected: false,
    };

    set((s) => ({
      project: {
        ...s.project,
        tracks: updateTrack(s.project.tracks, trackId, (t) => ({
          ...t,
          clips: t.clips.flatMap((c) => (c.id === clipId ? [leftClip, rightClip] : [c])),
        })),
        updatedAt: Date.now(),
      },
    }));
  },

  setClipFadeIn: (trackId, clipId, fade) => {
    pushHistory(get().project);
    set((s) => ({
      project: {
        ...s.project,
        tracks: updateTrack(s.project.tracks, trackId, (t) =>
          updateClipInTrack(t, clipId, (c) => ({ ...c, fadeIn: fade })),
        ),
        updatedAt: Date.now(),
      },
    }));
  },

  setClipFadeOut: (trackId, clipId, fade) => {
    pushHistory(get().project);
    set((s) => ({
      project: {
        ...s.project,
        tracks: updateTrack(s.project.tracks, trackId, (t) =>
          updateClipInTrack(t, clipId, (c) => ({ ...c, fadeOut: fade })),
        ),
        updatedAt: Date.now(),
      },
    }));
  },

  loadProject: (project, sources) => {
    useHistoryStore.getState().clear();
    set(() => {
      const sourceMap = new Map<string, AudioSource>();
      for (const s of sources) {
        sourceMap.set(s.id, s);
      }
      return { project, sources: sourceMap };
    });
  },

  moveClipToTrack: (fromTrackId, clipId, toTrackId) => {
    if (fromTrackId === toTrackId) return;
    const state = get();
    const fromTrack = state.project.tracks.find((t) => t.id === fromTrackId);
    const clip = fromTrack?.clips.find((c) => c.id === clipId);
    if (!fromTrack || !clip) return;

    pushHistory(state.project);

    const movedClip: AudioClip = { ...clip, trackId: toTrackId };

    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) => {
          if (t.id === fromTrackId) {
            return { ...t, clips: t.clips.filter((c) => c.id !== clipId) };
          }
          if (t.id === toTrackId) {
            return { ...t, clips: [...t.clips, movedClip] };
          }
          return t;
        }),
        updatedAt: Date.now(),
      },
    }));
  },

  captureSnapshot: () => {
    pushHistory(get().project);
  },

  undo: () => {
    const history = useHistoryStore.getState();
    const prev = history.popUndo();
    if (!prev) return;
    history.pushRedo(get().project);
    set({ project: prev });
  },

  redo: () => {
    const history = useHistoryStore.getState();
    const next = history.popRedo();
    if (!next) return;
    history.pushUndoOnly(get().project);
    set({ project: next });
  },

  getProjectDuration: () => {
    const { tracks } = get().project;
    let maxEnd = 0;
    for (const track of tracks) {
      for (const clip of track.clips) {
        const end = clip.startTime + clip.duration;
        if (end > maxEnd) maxEnd = end;
      }
    }
    return maxEnd;
  },

  getSelectedClip: () => {
    for (const track of get().project.tracks) {
      for (const clip of track.clips) {
        if (clip.isSelected) return { track, clip };
      }
    }
    return null;
  },
}));
