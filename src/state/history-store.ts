import { create } from 'zustand';
import type { Project } from '../types';

const MAX_UNDO = 50;

interface HistoryState {
  undoStack: Project[];
  redoStack: Project[];
  push: (snapshot: Project) => void;
  pushUndoOnly: (snapshot: Project) => void;
  popUndo: () => Project | undefined;
  popRedo: () => Project | undefined;
  pushRedo: (snapshot: Project) => void;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,

  push: (snapshot) =>
    set((s) => {
      const stack = [...s.undoStack, structuredClone(snapshot)];
      if (stack.length > MAX_UNDO) stack.shift();
      return { undoStack: stack, redoStack: [], canUndo: true, canRedo: false };
    }),

  pushUndoOnly: (snapshot) =>
    set((s) => {
      const stack = [...s.undoStack, structuredClone(snapshot)];
      if (stack.length > MAX_UNDO) stack.shift();
      return { undoStack: stack, canUndo: true };
    }),

  popUndo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return undefined;
    const snapshot = undoStack[undoStack.length - 1];
    set((s) => {
      const stack = s.undoStack.slice(0, -1);
      return { undoStack: stack, canUndo: stack.length > 0 };
    });
    return structuredClone(snapshot);
  },

  popRedo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return undefined;
    const snapshot = redoStack[redoStack.length - 1];
    set((s) => {
      const stack = s.redoStack.slice(0, -1);
      return { redoStack: stack, canRedo: stack.length > 0 };
    });
    return structuredClone(snapshot);
  },

  pushRedo: (snapshot) =>
    set((s) => ({
      redoStack: [...s.redoStack, structuredClone(snapshot)],
      canRedo: true,
    })),

  clear: () => set({ undoStack: [], redoStack: [], canUndo: false, canRedo: false }),
}));
