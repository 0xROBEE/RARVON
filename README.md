# Bench

A free, ad-free, account-free toolbox for everyday file and text tasks — PDF, image, developer, text and utility
tools that run entirely in your browser.

## Philosophy

- **Free forever** — no subscriptions, no paywalls
- **No ads** — no banners, popups, or "watch an ad to download"
- **No account** — nothing to sign up for
- **Local-first** — files are processed in your browser and never uploaded, whenever that's technically possible
- **Honest about limits** — if a tool genuinely needs a server (an FFmpeg-in-WASM pipeline, a real URL shortener),
  it's labeled "Coming Soon" with the real reason, instead of faking it or quietly uploading your file

## Stack

- **React 19 + TypeScript + Vite** — one lazy-loaded chunk per tool, so the homepage stays light and heavy
  libraries (pdfjs, the video engine) only load on the pages that use them
- **React Router** — one route per tool (`/tools/pdf/merge`), plus action pages (`/compress`, `/convert`, ...)
- **Tailwind CSS v4** — design tokens and light/dark themes in `src/index.css`
- **pdf-lib** (MIT) — create/edit PDFs · **pdfjs-dist** (Apache-2.0) — render PDF pages
- **mediabunny** (MPL-2.0) — MP4/WebM demux/mux on top of the browser's WebCodecs, for the video tools
- **jszip** (MIT), **qrcode** (MIT), **exifr** (MIT) — ZIP creation, QR codes, EXIF reading

No backend. Every tool runs in the browser.

## Tools

| Category | Tools |
|---|---|
| PDF | Editor (annotate, draw, highlight, sign, redact, reorder/rotate/delete pages), Merge, Split, Compress, Rotate, Extract pages, Delete pages, Reorder, PDF→Images, Images→PDF, Metadata, Page numbers, Watermark, Sign |
| Image | Convert, Compress, Resize (interactive), Crop, Rotate/flip, Metadata viewer, Remove EXIF |
| Video (experimental) | Trim, Change resolution, Convert (MP4 ⇄ WebM), Compress — WebCodecs via Mediabunny, MP4/WebM only, 250 MB limit |
| Audio | Trim (WAV), Convert (WAV / WebM-Opus), Compress (WebM-Opus), Extract audio from video |
| Developer | JSON format/minify, Base64, URL encode, UUID, Hash, Timestamp, Color, JWT decoder, Regex tester |
| Text | Word counter, Case converter, Text cleaner, Remove duplicate lines, Line sorter |
| Utilities | File Compressor (create ZIP), QR code, Password, Random number, URL shortener (UI only — needs a server) |

Cross-cutting features: global search (⌘K), action pages, a Compress hub, light/dark/system theme, and **tool
chaining** — a tool's last result can be picked up by the next tool without re-uploading
(`src/lib/workspaceContext.tsx` + `DownloadButton`).

### Known limitations

- Audio Convert/Compress/Extract encode in real time (a 5-minute file takes about 5 minutes).
- PDF Editor exports text with a Latin-only font; non-Latin text (Arabic, Cyrillic, CJK, ...) is not yet supported,
  and annotations on pages that carry their own embedded rotation can be misplaced.
- Compress PDF rasterizes pages (text stops being selectable) and helps mainly with scanned/image-heavy PDFs.
- Video Compress can produce a larger file for already low-bitrate sources.
- Video tools have been verified in Chromium only.

## Project structure

```
src/
  components/   Shared UI: FileDropzone, DownloadButton, ToolPageShell, ToolSearch, ...
  lib/          toolRegistry.ts (all tool metadata), toolComponents.tsx (lazy-loaded map),
                workspaceContext.tsx (chaining + result URL lifetime), pdfjs.ts, imageUtils.ts,
                audioUtils.ts, videoEngine.ts, themeContext.tsx, searchContext.tsx
  pages/        Home, CategoryPage, ToolPage, ActionPage, CompressHub, Privacy, About, Support, NotFound
  tools/<category>/<slug>/index.tsx   one folder per tool
docs/           VIDEO_ARCHITECTURE.md — why WebCodecs/Mediabunny instead of FFmpeg-WASM
```

To add a tool:

1. Create `src/tools/<category>/<slug>/index.tsx` with a default export
2. Add its metadata to `src/lib/toolRegistry.ts`
3. Register the lazy import in `src/lib/toolComponents.tsx`

Show results with `DownloadButton` — it makes the result available for chaining and releases the blob URL
when it's no longer used.

## Why the URL shortener isn't real

A short link only works if something remembers where it points — that's a server, unavoidably. The tool page
under `/tools/utilities/url-shortener` is the real interface with a single `createShortLink()` function to wire
up; connect it to a backend endpoint and the UI needs no changes.

## Support / donations

Optional, never required. Configure links in `src/lib/supportConfig.ts` — if none are set, the support button
and page hide themselves automatically. See `/support` for the philosophy in full.

## Local development

```
npm install
npm run dev
```

## Checks and production build

```
npm run lint
npm run build      # runs tsc -b, then vite build
npm run preview
```

## Future paid / cloud tier

Nothing in this repo depends on payments or a backend. If a paid tier is ever added (large-file cloud
processing, batch jobs, API access), it should sit behind a `ToolProcessor` abstraction with `LocalProcessor`
(what exists today) and an optional `CloudProcessor`, without changing how the free, local tools work.
