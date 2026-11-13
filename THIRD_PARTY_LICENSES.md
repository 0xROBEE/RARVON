# Third-party licenses

Bench is built on open-source software. This file lists components whose licenses carry obligations beyond
attribution. (A complete list of all dependencies and their licenses is part of roadmap Task 8.)

## LAME MP3 encoder — GNU LGPL 2.0

MP3 export (Audio Converter, Audio Compressor, Extract Audio) uses the **LAME** MP3 encoder, compiled to
WebAssembly and wrapped by **@mediabunny/mp3-encoder** (MPL-2.0, https://github.com/Vanilagy/mediabunny).

- LAME is licensed under the **GNU Library General Public License, version 2** — full text shipped with this site
  at [`/licenses/LAME-LGPL-2.0.txt`](public/licenses/LAME-LGPL-2.0.txt).
- Source code: https://lame.sourceforge.io/ (LAME) and https://github.com/Vanilagy/mediabunny/tree/main/packages/mp3-encoder
  (the WebAssembly build and wrapper).
- Bench uses the package **unmodified**. It is built into its own separately loaded file
  (`assets/mediabunny-mp3-encoder-*.js`), which is downloaded only when someone exports an MP3. You can replace
  that file with your own build of the same package to use a modified LAME.

## Mediabunny — MPL-2.0

Video and audio processing use **mediabunny** (https://mediabunny.dev), MPL-2.0, unmodified.

## Tesseract OCR — Apache-2.0

Image to Text uses **tesseract.js**, **tesseract.js-core** and language data from **@tesseract.js-data/*** — Apache-2.0.

## Fonts — SIL Open Font License 1.1

The PDF Editor embeds **Noto Sans** and **Noto Sans Arabic** (via fontsource), OFL-1.1.
