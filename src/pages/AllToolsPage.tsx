import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import BackButton from '../components/BackButton';
import clsx from 'clsx';
import { categories, toolsForCategory, tools } from '../lib/toolRegistry';
import type { ToolMeta } from '../lib/toolRegistry';
import { CategoryIcon, categoryColor } from '../lib/categoryIcons';
import ToolCard from '../components/ToolCard';
import { usePageMeta } from '../lib/usePageMeta';
import { ActionIcon } from '../lib/actionIcons';
import { tr } from '../lib/i18n';
import { categoryDescription } from '../lib/appText';
// The ship is decoration: it loads after the page, so it never slows the first visit.
const ShipVoyage = lazy(() => import('../components/ShipVoyage'));

/** A folded group shows one row of its most-used tools. A group only one tool bigger never folds. */
const FOLDED = 3;

/** The most-used tools of each group, shown first (and alone while the group is folded). */
const TOP: Record<string, string[]> = {
  pdf: ['editor', 'merge', 'compress', 'split', 'to-text', 'sign'],
  image: ['remove-background', 'compress', 'convert', 'resize', 'to-text', 'crop'],
  video: ['editor', 'convert', 'compress'],
  developer: ['json-formatter', 'base64', 'regex-tester', 'uuid', 'hash', 'jwt-decoder'],
  text: ['word-counter', 'case-converter', 'text-cleaner'],
  utilities: ['qr', 'password', 'archive'],
};

function ordered(category: string): ToolMeta[] {
  const list = toolsForCategory(category);
  const top = TOP[category] ?? [];
  const rank = (t: ToolMeta) => (top.includes(t.slug) ? top.indexOf(t.slug) : top.length);
  return [...list].sort((a, b) => rank(a) - rank(b));
}

/** Adds `is-in` once the element scrolls into view (straight away without IntersectionObserver). */
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setInView(true);
        io.disconnect();
      }
    }, { rootMargin: '0px 0px -10% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);
  return [ref, inView] as const;
}

/** One wave period, repeated past both ends so the wave can drift sideways. */
const WAVE = (() => {
  let d = 'M -80 10 Q -60 2 -40 10';
  for (let x = -40; x < 1300; x += 40) d += ` T ${x + 40} 10`;
  return d;
})();

/** The soft wave above each group, in the group's colour: it draws itself in, then drifts gently. */
function WaveDivider({ category }: { category: string }) {
  const [ref, inView] = useInView<SVGSVGElement>();
  return (
    <svg ref={ref} data-wave={category} viewBox="0 0 1200 20" preserveAspectRatio="none" aria-hidden="true" className={clsx('wave-divider mb-6 block h-5 w-full', inView && 'is-in')} style={{ color: categoryColor(category) }}>
      <g className="wave-drift">
        <path d={WAVE} pathLength={1} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}

function Group({ slug }: { slug: string }) {
  const c = categories.find((x) => x.slug === slug)!;
  const list = ordered(slug);
  const folds = list.length > FOLDED + 1;
  const [open, setOpen] = useState(false);
  const [ref, inView] = useInView<HTMLElement>();
  const color = categoryColor(slug);

  return (
    <>
      <WaveDivider category={slug} />
      <section ref={ref} id={slug} data-group={slug} aria-labelledby={`h-${slug}`} className={clsx('reveal scroll-mt-24', inView && 'is-in')} style={{ '--cat': color } as CSSProperties}>
        <div className="flex items-center gap-3">
          <CategoryIcon category={slug} size={34} />
          <div className="min-w-0 flex-1">
            <h2 id={`h-${slug}`} className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold">
              {tr(c.name)}
              <span className="rounded-full px-2 py-0.5 font-sans text-[11px] font-semibold" style={{ color, background: `color-mix(in srgb, ${color} 13%, var(--color-paper))` }}>
                {tr(list.length === 1 ? '{n} tool' : '{n} tools', { n: list.length })}
              </span>
            </h2>
            <p className="text-sm text-ink-2">{tr(categoryDescription(c))}</p>
          </div>
        </div>
        <div id={`list-${slug}`} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t, i) => {
            const extra = folds && i >= FOLDED;
            return (
              <div key={t.slug} hidden={extra && !open} className={clsx(extra && open && 'card-pop')} style={extra ? { animationDelay: `${(i - FOLDED) * 45}ms` } : undefined}>
                <ToolCard tool={t} />
              </div>
            );
          })}
        </div>
        {folds && (
          <div className="mt-4 text-center">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`list-${slug}`}
              onClick={() => setOpen((o) => !o)}
              className="group inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-1.5 text-sm font-medium text-ink-2 transition-all hover:-translate-y-0.5 hover:border-[color:var(--cat)] hover:text-[color:var(--cat)] active:scale-[0.97]"
            >
              {open ? tr('Show fewer') : tr('Show all {n} {group} tools', { n: list.length, group: tr(c.name) })}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={clsx('transition-transform duration-300', open && 'rotate-180')}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        )}
      </section>
    </>
  );
}

export default function AllToolsPage() {
  const voyage = useRef<HTMLDivElement>(null);
  const count = tools.filter((t) => t.status !== 'coming-soon').length;
  usePageMeta(tr('All tools'), tr('All {n} Rarvon tools for PDFs, images, video, audio, text and data, grouped by category.', { n: count }));
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav aria-label={tr("Breadcrumb")} className="mb-4 flex flex-wrap items-center gap-1 text-xs text-ink-3">
        <span className="me-2"><BackButton fallback="/" /></span>
        <Link to="/" className="hover:text-ink">{tr('Home')}</Link> <span aria-hidden="true">/</span> <span className="text-ink">{tr('All tools')}</span>
      </nav>
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{tr('All tools')}</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-2">{tr('{n} tools in {g} groups. Every one runs in your browser.', { n: count, g: categories.length })}</p>
      <nav aria-label={tr('Jump to category')} className="mt-6 flex flex-wrap gap-2">
        {categories.map((c) => (
          <a key={c.slug} href={`#${c.slug}`} className="group flex items-center gap-2 rounded-full border border-line py-1 pe-3 ps-1 text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-[color:var(--cat)]" style={{ '--cat': categoryColor(c.slug) } as CSSProperties}>
            <CategoryIcon category={c.slug} size={24} className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
            {tr(c.name)}
          </a>
        ))}
        {(['convert', 'compress'] as const).map((a) => (
          <Link key={a} to={`/${a}`} className="group flex items-center gap-2 rounded-full border border-line py-1 pe-3 ps-1.5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-workshop">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-workshop-dim text-workshop transition-transform duration-300 group-hover:rotate-12"><ActionIcon action={a} className="h-3.5 w-3.5" /></span>
            {tr(a === 'convert' ? 'All Convert tools' : 'All Compress tools')}
          </Link>
        ))}
      </nav>
      <div ref={voyage} className="relative mt-8">
        <Suspense fallback={null}><ShipVoyage container={voyage} /></Suspense>
        {categories.map((c, i) => (
          <div key={c.slug} className={i ? 'mt-6' : undefined}>
            <Group slug={c.slug} />
          </div>
        ))}
      </div>
    </div>
  );
}
