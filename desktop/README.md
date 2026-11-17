# Bench for desktop (beta)

`bench-engine/` is the **Bench Engine**, a small Rust program (about 0.5 MB) with
no window of its own. It:

1. serves Bench's own pages from this computer, with no internet needed;
2. opens them in an Edge or Chrome **app window** (no tabs, no address bar);
3. exits by itself when that window is closed.

## Run it

```bash
npm run build
```

```bash
cd desktop/bench-engine && cargo run --release
```

It finds the pages in a `web` folder next to the program, or `BENCH_WEB_DIR`,
or the site's `dist` folder while developing.

## Safety

- Listens on `127.0.0.1` only, so other computers can't reach it. It uses port 47821 when that's free (so the
  window remembers theme and language) and otherwise any free port.
- Answers only requests addressed exactly to `127.0.0.1:<port>`. This blocks "DNS rebinding", where a
  website pretends to be this computer.
- Serves files only from Bench's own folder. `..` and encoded tricks are refused.
- Accepts one command: "the window is still open" or "goodbye". It needs a secret key created fresh
  at every start and given only to Bench's own page.
- Never reads or uploads your files on a page's request. Files reach a tool only when you choose them.

## How it knows the window closed

The page sends "still open" every 5 seconds and "goodbye" as it closes. The engine exits 8 seconds
after a goodbye, unless the page says hello again (a reload). If the window goes silent for 3
minutes, the engine also exits; a minimized window may only check in once a minute. If no window
ever opens, it gives up after 90 seconds.

## Next (milestone 2)

A native FFmpeg engine for video and audio, with no file-size limits. FFmpeg is downloaded only with
the owner's OK (an LGPL build).
