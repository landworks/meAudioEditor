import { Upload, Music } from 'lucide-react';

interface EmptyStateProps {
  onImportClick: () => void;
}

export function EmptyState({ onImportClick }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-5">
          <Music className="w-8 h-8 text-brand-400" />
        </div>

        <h2 className="text-lg font-semibold text-white mb-2">Welcome to meAudioEditor</h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Import an audio file to get started. You can upload MP3, WAV, M4A, or even extract audio from a video file.
        </p>

        <button
          onClick={onImportClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-colors shadow-lg shadow-brand-600/20"
        >
          <Upload className="w-4 h-4" />
          Import Audio File
        </button>

        <p className="text-xs text-slate-600 mt-4">
          Supports MP3, WAV, M4A, MP4, WebM
        </p>
      </div>
    </div>
  );
}
