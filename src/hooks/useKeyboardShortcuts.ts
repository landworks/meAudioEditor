import { useEffect } from 'react';
import { usePlayback } from './usePlayback';
import { useProjectStore } from '../state/project-store';

export function useKeyboardShortcuts() {
  const { togglePlayPause } = usePlayback();
  const removeClip = useProjectStore((s) => s.removeClip);
  const getSelectedClip = useProjectStore((s) => s.getSelectedClip);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if (mod && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }

      if (mod && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      switch (e.code) {
        case 'Space': {
          e.preventDefault();
          togglePlayPause();
          break;
        }
        case 'Delete':
        case 'Backspace': {
          const selected = getSelectedClip();
          if (selected) {
            e.preventDefault();
            removeClip(selected.track.id, selected.clip.id);
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlayPause, removeClip, getSelectedClip, undo, redo]);
}
