import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createReadStream, existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Self-hosts everything the Image → Text (OCR) tool needs under /ocr/, so OCR
 * never touches a CDN: the tesseract.js worker, the LSTM WebAssembly cores,
 * and one gzipped traineddata file per installed @tesseract.js-data/<lang>
 * package. Nothing here is part of the app bundle — files are only fetched
 * when someone runs OCR, then cached by the browser (and by tesseract.js in
 * IndexedDB).
 */
function ocrAssets(): Plugin {
  const nm = resolve(import.meta.dirname, 'node_modules')
  const files = new Map<string, string>() // public path (no leading slash) -> absolute source path
  files.set('ocr/worker.min.js', join(nm, 'tesseract.js/dist/worker.min.js'))
  for (const f of readdirSync(join(nm, 'tesseract.js-core'))) {
    if (/^tesseract-core.*lstm\.wasm\.js$/.test(f)) files.set(`ocr/core/${f}`, join(nm, 'tesseract.js-core', f))
  }
  const dataDir = join(nm, '@tesseract.js-data')
  if (existsSync(dataDir)) {
    for (const lang of readdirSync(dataDir)) {
      const src = join(dataDir, lang, '4.0.0_best_int', `${lang}.traineddata.gz`)
      if (existsSync(src)) files.set(`ocr/lang/${lang}.traineddata.gz`, src)
    }
  }

  return {
    name: 'bench-ocr-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = decodeURIComponent((req.url ?? '').split('?')[0]).replace(/^\//, '')
        const src = files.get(path)
        if (!src) return next()
        res.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : 'application/octet-stream')
        createReadStream(src).pipe(res)
      })
    },
    generateBundle() {
      for (const [fileName, src] of files) this.emitFile({ type: 'asset', fileName, source: readFileSync(src) })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), ocrAssets()],
  worker: {
    format: 'es',
  },
})
