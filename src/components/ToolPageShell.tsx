import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ToolMeta } from '../lib/toolRegistry';
import { getCategory, relatedTools } from '../lib/toolRegistry';

export default function ToolPageShell({ tool, children }: { tool: ToolMeta; children: ReactNode }) {
  const category = getCategory(tool.category);
  const wide = tool.layout === 'wide';
  return (
    <div className={wide ? 'mx-auto max-w-[1680px] px-3 py-4 sm:px-4' : 'mx-auto max-w-3xl px-4 py-10 sm:px-6'}>
      <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-xs text-ink/50">
        <Link to="/" className="hover:text-ink">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/tools/${tool.category}`} className="hover:text-ink">{category?.name}</Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink">{tool.name}</span>
      </nav>
      {wide ? (
        <h1 className="font-display text-lg font-semibold tracking-tight sm:text-xl">{tool.name}</h1>
      ) : (
        <>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{tool.name}</h1>
          <p className="mt-2 max-w-xl text-sm text-ink/60">{tool.description}</p>
        </>
      )}

      <div className={wide ? 'mt-3' : 'mt-8'}>{children}</div>

      {tool.status !== 'coming-soon' && !wide && (
        <p className="mt-8 flex items-center gap-1.5 text-xs text-ink/40">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" strokeLinejoin="round" />
          </svg>
          Processed locally in your browser. Nothing is uploaded.
        </p>
      )}

      {tool.status !== 'coming-soon' && relatedTools(tool).length > 0 && (
        <section className={`mt-10 border-t border-line pt-6 ${wide ? 'max-w-3xl' : ''}`}>
          <h2 className="font-display text-sm font-semibold">Need to do something else with this file?</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {relatedTools(tool).map((t) => (
              <Link
                key={t.slug}
                to={`/tools/${t.category}/${t.slug}`}
                className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink/70 hover:border-ink hover:text-ink"
              >
                {t.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {tool.faq && tool.faq.length > 0 && (
        <section className={`mt-12 border-t border-line pt-6 ${wide ? 'max-w-3xl' : ''}`} aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="font-display text-sm font-semibold">Frequently asked questions</h2>
          <dl className="mt-3 space-y-4">
            {tool.faq.map((f) => (
              <div key={f.q}>
                <dt className="text-sm font-medium">{f.q}</dt>
                <dd className="mt-1 text-sm text-ink/60">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
