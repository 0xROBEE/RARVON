import { Link } from 'react-router-dom';
import { categories, tools, popularToolKeys, actionMeta } from '../lib/toolRegistry';
import ToolCard from '../components/ToolCard';
import { useToolSearch } from '../lib/searchContext';
import { ActionIcon } from '../lib/actionIcons';
import { usePageMeta } from '../lib/usePageMeta';
import SupportButton from '../components/SupportButton';

const homepageActions = ['convert', 'compress', 'edit', 'resize', 'extract'] as const;

export default function Home() {
  usePageMeta(
    'Bench — Free tools. No ads. No account.',
    'Free, ad-free, account-free tools for PDFs, images, video, audio, text and data — processed locally in your browser. Nothing you work on here is uploaded.',
  );
  const { openSearch } = useToolSearch();
  const popular = popularToolKeys
    .map((k) => {
      const [category, slug] = k.split('/');
      return tools.find((t) => t.category === category && t.slug === slug);
    })
    .filter(Boolean);

  return (
    <>
      <section className="bg-grid-paper border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-workshop">A workbench, not a warehouse</p>
              <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
                Free tools.
                <br />
                No ads. No account.
              </h1>
              <p className="mt-4 max-w-md text-base text-ink/60">
                Simple, powerful tools that run directly in your browser. Your files stay on your device from
                start to finish.
              </p>

              <button
                onClick={openSearch}
                className="mt-6 flex w-full max-w-sm items-center gap-2 rounded-md border border-line bg-paper px-4 py-3 text-left text-sm text-ink/40 shadow-sm hover:border-ink"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
                </svg>
                Search tools — try "compress image" or "merge pdf"
                <kbd className="ml-auto hidden shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] sm:inline">⌘K</kbd>
              </button>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/tools/pdf"
                  className="rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-workshop"
                >
                  Browse all tools
                </Link>
                <Link
                  to="/privacy"
                  className="rounded-md border border-line px-5 py-2.5 text-sm font-medium hover:border-ink"
                >
                  How local processing works
                </Link>
              </div>
            </div>

            <BenchDiagram />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="mb-6 font-display text-lg font-semibold">What do you want to do?</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {homepageActions.map((value) => {
            const meta = actionMeta.find((a) => a.value === value)!;
            return (
              <Link
                key={value}
                to={`/${value}`}
                className="flex flex-col items-center gap-2 rounded-lg border border-line bg-paper px-3 py-5 text-center transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-[2px_2px_0_0_var(--color-ink)]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-workshop-dim text-workshop">
                  <ActionIcon action={value} />
                </span>
                <span className="text-sm font-medium">{meta.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold">Popular tools</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((t) => t && <ToolCard key={`${t.category}-${t.slug}`} tool={t} />)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <h2 className="mb-6 font-display text-lg font-semibold">Categories</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/tools/${c.slug}`}
              className="rounded-lg border border-line bg-paper p-5 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-[2px_2px_0_0_var(--color-ink)]"
            >
              <h3 className="font-display text-base font-semibold">{c.name}</h3>
              <p className="mt-1 text-sm text-ink/60">{c.description}</p>
              <p className="mt-3 text-xs font-medium text-workshop">
                {tools.filter((t) => t.category === c.slug).length} tools
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-paper-dim">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 sm:grid-cols-2">
          <div>
            <h2 className="font-display text-base font-semibold">Processed locally, not uploaded</h2>
            <p className="mt-2 max-w-sm text-sm text-ink/60">
              Every available tool on this site reads and writes your files inside your own browser tab. Nothing
              is sent to a server for those tools — closing the tab is the same as deleting the data.
            </p>
            <Link to="/privacy" className="mt-3 inline-block text-sm font-medium text-workshop hover:underline">
              How local processing works →
            </Link>
          </div>
          <div>
            <h2 className="font-display text-base font-semibold">Enjoying the project?</h2>
            <p className="mt-2 max-w-sm text-sm text-ink/60">
              Bench stays free, ad-free and account-free for everyone either way. If it's saved you time, support
              is completely optional.
            </p>
            <div className="mt-3">
              <SupportButton />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function BenchDiagram() {
  return (
    <div className="relative rounded-xl border border-line bg-paper p-6 shadow-[4px_4px_0_0_var(--color-ink)]" aria-hidden="true">
      <div className="flex items-center justify-between gap-3 font-mono text-xs">
        <div className="flex flex-1 flex-col items-center gap-2 rounded-md border border-line bg-paper-dim py-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M6 2h9l5 5v15H6z" strokeLinejoin="round" />
            <path d="M15 2v5h5" strokeLinejoin="round" />
          </svg>
          your file
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="shrink-0">
          <path d="M4 12h16m0 0l-5-5m5 5l-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="flex flex-1 flex-col items-center gap-2 rounded-md border border-workshop bg-workshop-dim py-4 text-workshop">
          <span className="h-2 w-2 animate-pulse rounded-full bg-workshop" />
          this tab
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 rounded-md border border-dashed border-line py-2.5 text-xs text-ink/40">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M6 18a4 4 0 010-8 5 5 0 0110-1 4 4 0 011 7.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 3l18 18" strokeLinecap="round" />
        </svg>
        never our server
      </div>
    </div>
  );
}
