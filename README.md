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

- **React + TypeScript + Vite** — component model fits a large, growing set of independent tools well, and Vite's
  per-route code splitting keeps the homepage light even as the tool count grows
- **React Router** — one route per tool (`/tools/pdf/merge`), so every tool is directly linkable and indexable
- **Tailwind CSS v4** — utility-first styling with a small custom design-token theme (see `src/index.css`)
- **pdf-lib** (MIT) — create/edit PDFs client-side
- **pdfjs-dist** (Apache-2.0) — render PDF pages to canvas for thumbnails, page-to-image export, and the
  rasterization-based compressor
- **qrcode** (MIT), **exifr** (MIT), **jszip** (MIT) — QR generation, EXIF reading, multi-file zip downloads

All dependencies are permissively licensed and compatible with a future commercial version.

## Project structure

```
src/
  components/     Shared UI: FileDropzone, Button, ToolCard, ToolSearch, SupportButton, ...
  lib/             toolRegistry.ts (all tool metadata), toolComponents.tsx (lazy-loaded map),
                    pdfjs.ts / imageUtils.ts (processing helpers), supportConfig.ts, searchContext.tsx
  pages/          Home, CategoryPage, ToolPage (dynamic), Privacy, About, Support, NotFound
  tools/
    pdf/          merge, split, compress, rotate, extract, reorder, to-images, from-images, metadata
    image/        convert, compress, resize, crop, rotate, metadata
    video/        (Coming Soon — see below)
    developer/    json-formatter, json-minifier, base64, url-encode, uuid, hash, timestamp, color
    text/         word-counter, case-converter, text-cleaner, dedupe, sort-lines
    utilities/    qr, password, url-shortener (UI only)
```

Every tool is a self-contained folder with an `index.tsx` default export. To add a new one:

1. Create `src/tools/<category>/<slug>/index.tsx`
2. Add its metadata to `src/lib/toolRegistry.ts`
3. Register the lazy import in `src/lib/toolComponents.tsx`

The homepage never imports tool code directly — each tool's JS only loads when its page is visited.

## Why video tools are "Coming Soon"

Real video compression/conversion in-browser needs a WebAssembly build of FFmpeg, which needs
`SharedArrayBuffer`, which needs the whole site served with `Cross-Origin-Opener-Policy` and
`Cross-Origin-Embedder-Policy` headers. Turning that on affects every other page, including all the tools that
already work. The architecture (a `workers/` layer plus each tool's `index.tsx`) is ready for this; it's staged
rather than shipped half-working.

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

## Production build

```
npm run build
npm run preview
```

## Future paid / cloud tier

Nothing in this repo depends on payments or a backend. If a paid tier is ever added (large-file cloud
processing, batch jobs, API access), it should sit behind a `ToolProcessor` abstraction with `LocalProcessor`
(what exists today) and an optional `CloudProcessor`, without changing how the free, local tools work.
