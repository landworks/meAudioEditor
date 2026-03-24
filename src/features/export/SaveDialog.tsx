import { useState, useCallback, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface SaveDialogProps {
  isOpen: boolean;
  defaultName: string;
  onSave: (filename: string) => void;
  onClose: () => void;
}

export function SaveDialog({ isOpen, defaultName, onSave, onClose }: SaveDialogProps) {
  const [filename, setFilename] = useState(defaultName);

  useEffect(() => {
    if (isOpen) setFilename(defaultName);
  }, [isOpen, defaultName]);

  const handleSave = useCallback(() => {
    const trimmed = filename.trim() || 'Untitled';
    onSave(trimmed);
  }, [filename, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSave();
      if (e.key === 'Escape') onClose();
    },
    [handleSave, onClose],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface-900 border border-surface-700 rounded-xl shadow-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Save Project</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1">Filename</label>
          <div className="flex items-center gap-2">
            <input
              id="project-name"
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              placeholder="Project name"
            />
            <span className="text-xs text-slate-500 shrink-0">.meaudio</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" className="flex-1" icon={<Save className="w-4 h-4" />} onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
