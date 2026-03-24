import { Loader2 } from 'lucide-react';

interface ImportOverlayProps {
  isImporting: boolean;
  progress: string;
  error: string | null;
  onDismissError: () => void;
}

export function ImportOverlay({ isImporting, progress, error, onDismissError }: ImportOverlayProps) {
  if (!isImporting && !error) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface-900 border border-surface-700 rounded-xl shadow-2xl p-6 max-w-xs w-full text-center">
        {isImporting && (
          <>
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-300">{progress || 'Importing...'}</p>
          </>
        )}

        {error && (
          <>
            <p className="text-sm text-red-400 mb-4">{error}</p>
            <button
              onClick={onDismissError}
              className="px-4 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-sm text-white"
            >
              Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
}
