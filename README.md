# meAudioEditor

A simple, visual, browser-based multi-track audio editor. Import audio (or extract it from video), arrange clips on a timeline, and export to MP3 — all without leaving your browser.

**[Try it live](https://cnerd.us/projects/meaudioeditor/index.html)**

## Features

- **Multi-track timeline** — drag, trim, move, and snap clips across unlimited tracks
- **Waveform visualization** — real-time peak-based waveforms that scale with zoom
- **Non-destructive editing** — fade in/out, per-clip volume, split at playhead
- **Video-to-audio extraction** — drop in an MP4/WebM and the audio is extracted via FFmpeg.wasm
- **YouTube audio import** — optional local proxy server downloads audio from YouTube using yt-dlp
- **MP3 export** — offline render and encode at selectable bitrates (128–320 kbps)
- **Project files** — save and reload `.meaudio` project bundles (metadata + audio payloads)
- **Undo / Redo** — up to 50 levels of history
- **Keyboard shortcuts** — Space (play/pause), Delete (remove clip), Ctrl+Z / Ctrl+Y (undo/redo)
- **Responsive UI** — works on desktop and adapts to smaller screens

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19, TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Audio | Web Audio API, OfflineAudioContext |
| Encoding | FFmpeg.wasm (video extraction, MP3 export) |
| Icons | Lucide React |
| YouTube proxy | Express, ytdlp-nodejs |

## Prerequisites

- **Node.js** 18+ and npm
- **yt-dlp** installed on your system (only needed if you want the YouTube audio proxy)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/meAudioEditor.git
cd meAudioEditor

# Install dependencies
npm install

# Start the dev server (audio editor only)
npm run dev

# Or start both the dev server and the YouTube proxy
npm run dev:full
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server |
| `npm run dev:full` | Start Vite + YouTube proxy server concurrently |
| `npm run server` | Start only the YouTube proxy (port 3001) |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Project Structure

```
meAudioEditor/
├── docs/
│   └── PRD.md               # Product Requirements Document
├── public/                  # Static assets (favicon)
├── server/
│   └── youtube-proxy.js     # Express proxy for YouTube audio via yt-dlp
├── src/
│   ├── components/          # Shared UI (TopBar, Button)
│   ├── features/            # Feature modules
│   │   ├── editing/         # Clip inspector
│   │   ├── export/          # Export & save dialogs
│   │   ├── import/          # Empty state & import overlay
│   │   ├── timeline/        # Timeline, ruler, tracks, clips, status bar
│   │   ├── tracks/          # Track headers (mute, solo, volume)
│   │   ├── transport/       # Play/stop, split, undo/redo, zoom
│   │   └── waveform/        # Canvas waveform renderer
│   ├── hooks/               # useImportAudio, usePlayback, useKeyboardShortcuts
│   ├── services/            # Audio engine, FFmpeg, peak extraction, project I/O
│   ├── state/               # Zustand stores (project, timeline, playback, history)
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Helpers (time formatting, WAV encoding, file validation)
├── .env.example             # Environment variable template
├── index.html               # Entry HTML
├── vite.config.ts           # Vite configuration
└── package.json
```

## Deployment (Hostinger)

The project is set up for easy deployment to **Hostinger** shared hosting via FTP. The `dist/` output is a fully static site — no server-side runtime required.

### 1. Configure FTP credentials

Copy `.env.example` to `.env` and fill in your Hostinger FTP details (these are **not** required for local development):

```bash
cp .env.example .env
```

### 2. Build for production

```bash
npm run build
```

### 3. Upload

Upload the contents of `dist/` to your Hostinger `FTP_REMOTE_DIR` via FTP (FileZilla, Cyberduck, or Hostinger's File Manager).

### 4. Required headers

FFmpeg.wasm needs cross-origin isolation headers. Add an `.htaccess` file in the deployment directory:

```apache
<IfModule mod_headers.c>
  Header set Cross-Origin-Opener-Policy "same-origin"
  Header set Cross-Origin-Embedder-Policy "require-corp"
</IfModule>
```

### Subdirectory deploys

If hosting at a path other than the domain root, update `base` in `vite.config.ts`:

```ts
export default defineConfig({
  base: '/projects/meaudioeditor/',
  // ...
})
```

> **Note:** The `dist/` output is a standard static site and also works with Vercel, Netlify, Cloudflare Pages, GitHub Pages, or any host that supports custom response headers.

## Architecture

The editor runs entirely in the browser. The **Web Audio API** handles real-time playback with per-clip scheduling, gain, and fade envelopes. Export uses an **OfflineAudioContext** to render the full mix, then pipes the PCM through **FFmpeg.wasm** for MP3 encoding.

The optional **YouTube proxy** (`server/youtube-proxy.js`) is a lightweight Express server that uses `yt-dlp` to fetch audio. It runs on `localhost:3001` and is only needed for the YouTube import feature.

State is managed with **Zustand** across four stores: project data, timeline view, playback transport, and undo history.

## License

This project is licensed under the [MIT License](LICENSE).

## Author

**Michael Kintner** — [CNerd Inc](https://cnerd.us) / [LandWorks Services LLC](https://landworkspro.com)
