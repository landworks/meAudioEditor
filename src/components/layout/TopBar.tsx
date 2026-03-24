import { Upload, Download, AudioWaveform, Save, FolderOpen, Youtube, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';

interface TopBarProps {
  onImportClick: () => void;
  onExportClick: () => void;
  onSaveClick: () => void;
  onOpenClick: () => void;
  onYouTubeClick: () => void;
  isImporting: boolean;
  isSaving: boolean;
  hasClips: boolean;
  projectName?: string;
}

export function TopBar({
  onImportClick,
  onExportClick,
  onSaveClick,
  onOpenClick,
  onYouTubeClick,
  isImporting,
  isSaving,
  hasClips,
  projectName,
}: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-surface-900 via-surface-900 to-surface-850 border-b border-surface-700 shrink-0 gap-2">
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/20">
          <AudioWaveform className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-white tracking-tight leading-tight">
            me<span className="text-brand-400">Audio</span>Editor
          </span>
          <span className="text-[10px] text-slate-500 leading-tight hidden sm:block">
            Simple audio editing for everyone
          </span>
        </div>
        {projectName && (
          <>
            <div className="w-px h-5 bg-surface-700 mx-1 hidden sm:block" />
            <span className="text-xs text-slate-400 truncate max-w-[200px] hidden sm:block" title={projectName}>
              {projectName}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        {/* File operations */}
        <Button
          variant="ghost"
          size="sm"
          icon={<FolderOpen className="w-4 h-4" />}
          onClick={onOpenClick}
          title="Open project"
        >
          <span className="hidden lg:inline">Open</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          icon={<Save className="w-4 h-4" />}
          onClick={onSaveClick}
          disabled={!hasClips || isSaving}
          title="Save project"
        >
          <span className="hidden lg:inline">{isSaving ? 'Saving...' : 'Save'}</span>
        </Button>

        <div className="w-px h-5 bg-surface-700 mx-0.5 hidden sm:block" />

        {/* Import operations */}
        <Button
          variant="primary"
          size="sm"
          icon={<Upload className="w-4 h-4" />}
          onClick={onImportClick}
          disabled={isImporting}
        >
          <span className="hidden sm:inline">{isImporting ? 'Importing...' : 'Import'}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          icon={<Youtube className="w-4 h-4 text-red-500" />}
          onClick={onYouTubeClick}
          title="meYouTubeDownloader"
        >
          <span className="hidden lg:inline text-white">me<span className="text-red-500">YouTube</span>Downloader</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          icon={<ExternalLink className="w-4 h-4 text-slate-400" />}
          onClick={() => window.open('https://www.mediamister.com/free-youtube-video-downloader', '_blank')}
          title="Media Mister YouTube Downloader"
        >
          <span className="hidden lg:inline">YT Downloader</span>
        </Button>

        <div className="w-px h-5 bg-surface-700 mx-0.5 hidden sm:block" />

        {/* Export */}
        <Button
          variant="secondary"
          size="sm"
          icon={<Download className="w-4 h-4" />}
          onClick={onExportClick}
          disabled={!hasClips}
        >
          <span className="hidden sm:inline">Export MP3</span>
        </Button>
      </div>
    </header>
  );
}
