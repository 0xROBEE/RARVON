import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted UI fonts (OFL-1.1): no request to Google Fonts. Each file covers
// one unicode-range subset, so browsers only download what a page uses.
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './index.css'
import App from './App.tsx'

// Offline support (production builds only; see sw-template.js).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}

// After a new deploy, an open tab may ask for a tool chunk that no longer
// exists on the server: reload once to pick up the new version.
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem('bench-reloaded-for-update')) return
    sessionStorage.setItem('bench-reloaded-for-update', '1')
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
