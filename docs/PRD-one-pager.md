# meAudioEditor — One-Pager

**Version:** 1.16.6 | **Author:** Michael Kintner | **Live:** [cnerd.us/projects/meaudioeditor](https://cnerd.us/projects/meaudioeditor/index.html)

---

## What It Is

A free, browser-based multi-track audio editor. Import audio (or extract it from video), arrange clips on a timeline, and export to MP3 — no install, no account, no data leaves the browser.

## Who It's For

Podcasters, content creators, musicians, and students who need quick multi-track editing without the overhead of a desktop DAW.

## Core Features

| Feature | Description |
|---------|-------------|
| **Multi-track timeline** | Unlimited tracks with drag, trim, move, and snap-to-edge alignment |
| **Waveform visualization** | Real-time canvas-rendered peak waveforms that scale with zoom |
| **Non-destructive editing** | Per-clip volume (0–200%), fade in/out, split at playhead, trim — source audio is never modified |
| **Video-to-audio extraction** | Drop an MP4/WebM/MOV/MKV and audio is extracted client-side via FFmpeg.wasm |
| **MP3 export** | Offline mix render + FFmpeg.wasm encoding at 128–320 kbps |
| **Project files** | Save/load `.meaudio` bundles (binary format with embedded WAV payloads) |
| **Track mixing** | Per-track volume, mute, solo controls |
| **Undo / Redo** | 50-level snapshot-based history (Ctrl+Z / Ctrl+Y) |
| **Keyboard shortcuts** | Space (play/pause), Delete (remove clip), standard undo/redo |

## Tech Stack

React 19 + TypeScript, Vite 8, Tailwind CSS v4, Zustand (state), Web Audio API (playback & rendering), FFmpeg.wasm (video extraction & MP3 encoding), Lucide React (icons).

## Architecture

```
Import → Web Audio decode (or FFmpeg.wasm for video) → Peak extraction
    → Zustand store (Project → Tracks → Clips → AudioSources)
        → Canvas waveforms + Web Audio real-time playback
            → OfflineAudioContext render → FFmpeg.wasm MP3 encode → Download
```

- **4 Zustand stores:** project data, timeline viewport, playback transport, undo history
- **Singleton AudioEngine:** schedules per-clip gain → per-track gain → master gain → destination
- **All client-side:** no backend, no database, no auth

## Deployment

Built for **Hostinger** shared hosting via FTP upload of the static `dist/` build. Requires COOP/COEP headers for FFmpeg.wasm (configurable via `.htaccess`). Also compatible with Vercel, Netlify, Cloudflare Pages, or any static host.

```bash
npm run build          # → dist/
# Upload dist/ to Hostinger via FTP
```

## Key Constraints

- Max file size: 500 MB per import
- Max undo depth: 50 levels
- Export format: MP3 only (WAV/FLAC planned)
- Browsers: Requires SharedArrayBuffer (Chrome, Edge, Firefox, Safari 16.4+)

## What's Next

Pan control UI, fade curve selection (exponential, equal-power), loop playback, multi-select clips, copy/paste, audio effects (EQ, compression), PWA offline install, and automated tests — all structurally supported but not yet implemented.

---

*Full PRD: [docs/PRD.md](PRD.md)*
