import { create } from 'zustand';
import type { PlaybackStatus } from '../types';

interface PlaybackStoreState {
  status: PlaybackStatus;
  currentTime: number;
  isLooping: boolean;
  loopStart: number;
  loopEnd: number;

  setStatus: (status: PlaybackStatus) => void;
  setCurrentTime: (time: number) => void;
  seek: (time: number) => void;
  setLoop: (start: number, end: number) => void;
  toggleLoop: () => void;
}

export const usePlaybackStore = create<PlaybackStoreState>((set) => ({
  status: 'stopped',
  currentTime: 0,
  isLooping: false,
  loopStart: 0,
  loopEnd: 0,

  setStatus: (status) => set({ status }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  seek: (time) => set({ currentTime: Math.max(0, time) }),
  setLoop: (loopStart, loopEnd) => set({ loopStart, loopEnd }),
  toggleLoop: () => set((s) => ({ isLooping: !s.isLooping })),
}));
