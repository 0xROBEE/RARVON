import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { categoryColor } from '../lib/categoryIcons';

/**
 * The little ship on the All tools page. It sails along the wave above the
 * group you are reading, and on to the next wave (taking that group's
 * colour) as you scroll. It follows the scroll instead of being glued to it:
 * a speed limit, gentle starts and stops, a fade when you jump far, and
 * springs for height and tilt so it floats instead of tracing the line.
 * Decoration only: hidden from screen readers and never in the way of clicks.
 * With "reduce motion" it still follows the scroll, but without rocking,
 * bobbing, smoke or wake.
 */

/**
 * The ship: a classic ocean liner with two smoking funnels, portholes and a
 * red waterline, drawn around its waterline at (0, 0). `currentColor` is the
 * group's colour.
 */
function OceanLiner() {
  return (
    <g transform="scale(0.6) translate(-116 -70)">
      <circle className="ship-smoke" cx="98" cy="18" r="5" fill="currentColor" opacity=".25" />
      <circle className="ship-smoke" cx="126" cy="18" r="5" fill="currentColor" opacity=".25" style={{ animationDelay: '1.2s' }} />
      <path d="M94 22 L104 22 L102 40 L96 40 Z" fill="currentColor" />
      <path d="M94 22 L104 22 L103.5 27 L94.5 27 Z" fill="#2c2c2a" opacity=".5" />
      <path d="M122 22 L132 22 L130 40 L124 40 Z" fill="currentColor" />
      <path d="M122 22 L132 22 L131.5 27 L122.5 27 Z" fill="#2c2c2a" opacity=".5" />
      <path d="M150 22 L150 40 M86 28 L86 40" stroke="currentColor" strokeWidth="1.2" />
      <rect x="80" y="40" width="70" height="8" rx="1.5" fill="currentColor" opacity=".55" />
      <rect x="70" y="48" width="92" height="7" rx="1.5" fill="currentColor" opacity=".75" />
      <path d="M50 55 L182 55 L172 72 L62 72 Q54 66 50 55 Z" fill="currentColor" />
      <g fill="var(--color-paper)" opacity=".85">
        {[76, 88, 100, 112, 124, 136, 148, 160].map((cx) => <circle key={cx} cx={cx} cy="61" r="1.6" />)}
      </g>
      <path d="M60 69 L174 69" stroke="#e24b4a" strokeWidth="2" opacity=".6" />
    </g>
  );
}

const MAX_SPEED = 0.55; // waves per second
const READING_LINE = 0.4; // how far down the screen counts as "where you are"

/** Height of the wave (in its 0–20 units) at x, matching the path in AllToolsPage. */
const waveY = (x: number) => 10 - 4 * Math.sin((2 * Math.PI * (x + 80)) / 80);

export default function ShipVoyage({ container }: { container: RefObject<HTMLDivElement | null> }) {
  const ship = useRef<HTMLDivElement>(null);
  const wake = useRef<SVGPathElement>(null);
  const [reduced] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const s = { pos: -1, vel: 0, y: 0, yVel: 0, ang: 0, angVel: 0, fade: 0, jumping: false, time: 0, wave: -1 };
    let last = performance.now();
    let raf = 0;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      s.time += dt;
      const box = container.current;
      const el = ship.current;
      if (!box || !el) return;
      const waves = Array.from(box.querySelectorAll<SVGSVGElement>('[data-wave]'));
      if (!waves.length) return;
      const home = box.getBoundingClientRect();
      const tops = waves.map((w) => w.getBoundingClientRect().top);
      const end = home.bottom;

      // Where the reader is: which group's stretch the reading line is in, and how far through it.
      const line = window.innerHeight * READING_LINE;
      let i = 0;
      while (i < waves.length - 1 && tops[i + 1] <= line) i++;
      const next = i < waves.length - 1 ? tops[i + 1] : end;
      const through = Math.max(0, Math.min(0.999, (line - tops[i]) / Math.max(1, next - tops[i])));
      const target = i + through;

      if (s.pos < 0) s.pos = target; // first frame: start where the reader is
      const gap = target - s.pos;
      if (Math.abs(gap) > 1.15 && !s.jumping) s.jumping = true;
      if (s.jumping) {
        // Far away (a fast scroll or a jump link): fade out and reappear near the reader.
        s.fade -= dt * 4;
        if (s.fade <= 0) {
          s.pos = target - Math.sign(gap) * 0.12;
          s.vel = 0;
          s.jumping = false;
        }
      } else {
        s.fade = Math.min(1, s.fade + dt * 3);
        const want = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, gap * 2.2));
        s.vel += (want - s.vel) * Math.min(1, dt * 3);
        s.pos += s.vel * dt;
      }

      const j = Math.max(0, Math.min(waves.length - 1, Math.floor(s.pos)));
      const p = Math.max(0, s.pos - j);
      const wave = waves[j];
      const r = wave.getBoundingClientRect();
      const rtl = document.documentElement.dir === 'rtl';
      const along = rtl ? 1 - p : p;
      const x = 12 + along * (r.width - 24);

      // The water under the ship, including the wave's slow drift.
      const t = getComputedStyle(wave.querySelector('.wave-drift')!).transform;
      const drift = t && t !== 'none' ? new DOMMatrixReadOnly(t).e : 0;
      const scaleX = r.width / 1200;
      const scaleY = r.height / 20;
      const u = x / scaleX - drift;
      const water = r.top - home.top + waveY(u) * scaleY;
      const slope = (Math.atan2((waveY(u + 6) - waveY(u - 6)) * scaleY, 12 * scaleX) * 180) / Math.PI;

      // Floating: springs pull the ship to the water and to a gentle tilt, so it lags, overshoots a little and settles.
      // On a new wave the ship lands on its water straight away, instead of floating across the page to it.
      if (j !== s.wave) {
        s.wave = j;
        s.y = water;
        s.yVel = 0;
      }
      s.yVel += ((water - s.y) * 30 - s.yVel * 7) * dt;
      s.y += s.yVel * dt;
      const lean = (rtl ? 1 : -1) * s.vel * 14;
      // With "reduce motion" the ship still sails with the scroll, but calmly: no rocking or bobbing.
      const rock = reduced ? 0 : Math.sin(s.time * 2.1) * 1.6;
      const wantAng = slope * 0.35 + lean + rock;
      s.angVel += ((wantAng - s.ang) * 22 - s.angVel * 6) * dt;
      s.ang += s.angVel * dt;
      const bob = reduced ? 0 : Math.sin(s.time * 1.7) * 0.8;

      // Fade at the ends of a wave, and until the wave has drawn itself in.
      let edge = 1;
      if (p < 0.05) edge = p / 0.05;
      if (p > 0.95 && j < waves.length - 1) edge = (1 - p) / 0.05;
      const drawn = wave.classList.contains('is-in') ? 1 : 0;
      el.style.opacity = String(Math.max(0, Math.min(edge, s.fade, drawn)));
      el.style.transform = `translate(${(r.left - home.left + x).toFixed(1)}px, ${(s.y + bob).toFixed(1)}px) rotate(${s.ang.toFixed(2)}deg)`;

      // Near the end of a wave, the colour blends into the next group's.
      const here = categoryColor(wave.dataset.wave ?? '');
      const nextWave = waves[Math.min(waves.length - 1, j + 1)];
      const blend = j < waves.length - 1 ? Math.max(0, (p - 0.75) / 0.25) : 0;
      el.style.color = blend > 0 ? `color-mix(in srgb, ${categoryColor(nextWave.dataset.wave ?? '')} ${Math.round(blend * 100)}%, ${here})` : here;
      if (wake.current) wake.current.style.opacity = reduced ? '0' : String(Math.min(0.5, Math.abs(s.vel)));
      el.firstElementChild?.setAttribute('transform', rtl ? 'scale(-1 1)' : '');
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [container, reduced]);

  return (
    <div ref={ship} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-10 opacity-0" style={{ transformOrigin: '0 0' }}>
      <svg width="92" height="52" viewBox="-46 -46 92 52" className="absolute block overflow-visible" style={{ left: -46, top: -46 }}>
        <g>
          <path ref={wake} d="M-42 2 L-58 3 M-40 5 L-52 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0" />
          <OceanLiner />
        </g>
      </svg>
    </div>
  );
}
