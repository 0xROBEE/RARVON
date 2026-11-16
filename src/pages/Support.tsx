import { supportLinks, hasAnySupportLink } from '../lib/supportConfig';
import { usePageMeta } from '../lib/usePageMeta';
import { tr } from '../lib/i18n';

const costs = [
  { label: 'Hosting', value: 'Configurable — set your own figure here' },
  { label: 'Domain', value: 'Configurable — set your own figure here' },
  { label: 'Development time', value: 'My time' },
];

export default function Support() {
  usePageMeta(tr('Support the project'), tr('Bench is free, ad-free and account-free for everyone. Support is entirely optional and never unlocks features or changes access.'));
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{tr('Support the project')}</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-2">
        {tr("Every tool on this site is free, ad-free and works without an account — and that isn't changing. If this site has saved you time, you're welcome to support its development. It's completely optional and never affects what you can do here.")}
      </p>

      <h2 className="mt-8 font-display text-base font-semibold">{tr('What support helps with')}</h2>
      <ul className="mt-3 space-y-1 text-sm text-ink-2">
        <li>{tr('Hosting and domain costs')}</li>
        <li>{tr('Time spent building and maintaining tools')}</li>
        <li>{tr('Testing across browsers and devices')}</li>
        <li>{tr('Building new tools people ask for')}</li>
      </ul>

      <div className="mt-6 overflow-hidden rounded-md border border-line">
        <table className="w-full text-start text-sm">
          <tbody>
            {costs.map((c) => (
              <tr key={c.label} className="border-b border-line last:border-0 odd:bg-paper-dim">
                <th scope="row" className="px-3 py-2 font-medium text-ink-2">{tr(c.label)}</th>
                <td className="px-3 py-2 text-ink-2">{tr(c.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 font-display text-base font-semibold">{tr('Ways to support')}</h2>
      {hasAnySupportLink() ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {supportLinks.donation && (
            <a href={supportLinks.donation} target="_blank" rel="noopener noreferrer" className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:border-ink">
              ☕ {tr('Donate')}
            </a>
          )}
          {supportLinks.sponsorship && (
            <a href={supportLinks.sponsorship} target="_blank" rel="noopener noreferrer" className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:border-ink">
              {tr('Sponsor on GitHub')}
            </a>
          )}
          {supportLinks.other && (
            <a href={supportLinks.other} target="_blank" rel="noopener noreferrer" className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:border-ink">
              {tr('Other ways to support')}
            </a>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-3">
          {tr("No donation links are configured yet. Set")}{' '}<code className="rounded bg-paper-dim px-1 py-0.5 font-mono text-xs">VITE_SUPPORT_DONATION_URL</code>{' '}{tr("(or the sponsorship/other variants) in a")}{' '}<code className="rounded bg-paper-dim px-1 py-0.5 font-mono text-xs">.env.local</code>{' '}{tr("file — see")}{' '}<code className="rounded bg-paper-dim px-1 py-0.5 font-mono text-xs">.env.example</code>{' '}{tr("— or edit the fallback values in")}{' '}<code className="rounded bg-paper-dim px-1 py-0.5 font-mono text-xs">src/lib/supportConfig.ts</code>{' '}{tr("directly. Either way, links appear here and in the footer automatically once set, with no other code changes.")}
        </p>
      )}

      <p className="mt-8 text-xs text-ink-3">
        {tr('Donations never unlock features, remove limits, or change how the free tools work for anyone.')}
      </p>
    </div>
  );
}
