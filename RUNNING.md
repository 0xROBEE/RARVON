# Running Rarvon on your computer

Rarvon is ROBEE's closed-source project (see `LICENSE`). This guide is for running your own copy.

## What you need

- **Node.js 22** or newer (https://nodejs.org), which includes npm.
- An internet connection the first time, to download the libraries and the AI models.

## The website (any computer)

Open a terminal in this folder, then:

1. Install the libraries (once):

   ```bash
   npm ci
   ```

2. Run Rarvon while developing (it reloads as you edit), then open http://localhost:5173:

   ```bash
   npm run dev
   ```

3. Or build the real website and preview it, then open http://localhost:4173:

   ```bash
   npm run build
   ```

   ```bash
   npx vite preview
   ```

   The first build downloads the Background Remover's AI models (about 125 MB) into `ai-models/`. Later
   builds reuse them. The finished website is in `dist/`, ready for any static host.

## Tests

```bash
npx vitest run
```

```bash
npx playwright install chromium
```

```bash
npx playwright test
```

## Rarvon for desktop (Windows)

To use the app, run the installer: `Rarvon-setup-<version>.exe`.

To build the app yourself, you also need [Rust](https://rustup.rs), Microsoft Edge (already on Windows 10 and
11), FFmpeg and Inno Setup. `desktop/README.md` explains each step.

```bash
npm run build:desktop
```

## Settings for publishing

Copy `.env.example` to `.env` and fill in what you need (Ko-fi link, feedback email, project link, app
download links). Without them, those buttons stay hidden.
