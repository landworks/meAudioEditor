import { create } from 'zustand';
import { DEFAULT_PIXELS_PER_SECOND, MIN_PIXELS_PER_SECOND, MAX_PIXELS_PER_SECOND } from '../constants';

const ZOOM_FACTOR = 1.15;

function clampPps(pps: number) {
  return Math.min(MAX_PIXELS_PER_SECOND, Math.max(MIN_PIXELS_PER_SECOND, pps));
}

interface TimelineState {
  pixelsPerSecond: number;
  scrollLeft: number;
  snapLineTime: number | null;

  setPixelsPerSecond: (pps: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setScrollLeft: (s: number) => void;
  setSnapLine: (time: number | null) => void;

  /**
   * Premiere-style zoom: zoom in/out while keeping the time position
   * under the cursor pinned in place. `cursorXInContainer` is the
   * cursor's x offset inside the scroll container (not including scroll).
   * `scrollContainer` is the DOM element so we can adjust scrollLeft.
   */
  zoomAtPoint: (
    direction: 'in' | 'out',
    cursorXInContainer: number,
    scrollContainer: HTMLElement,
  ) => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  pixelsPerSecond: DEFAULT_PIXELS_PER_SECOND,
  scrollLeft: 0,
  snapLineTime: null,

  setPixelsPerSecond: (pps) => set({ pixelsPerSecond: clampPps(pps) }),

  zoomIn: () =>
    set((s) => ({ pixelsPerSecond: clampPps(s.pixelsPerSecond * 1.5) })),

  zoomOut: () =>
    set((s) => ({ pixelsPerSecond: clampPps(s.pixelsPerSecond / 1.5) })),

  setScrollLeft: (scrollLeft) => set({ scrollLeft: Math.max(0, scrollLeft) }),

  setSnapLine: (snapLineTime) => set({ snapLineTime }),

  zoomAtPoint: (direction, cursorXInContainer, scrollContainer) => {
    const oldPps = get().pixelsPerSecond;
    const factor = direction === 'in' ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
    const newPps = clampPps(oldPps * factor);

    if (newPps === oldPps) return;

    const cursorTime = (scrollContainer.scrollLeft + cursorXInContainer) / oldPps;
    const newScrollLeft = cursorTime * newPps - cursorXInContainer;

    set({ pixelsPerSecond: newPps });
    scrollContainer.scrollLeft = Math.max(0, newScrollLeft);
  },
}));
