import { Link } from 'react-router-dom';
import { getTool } from '../lib/toolRegistry';

interface CompressDestination {
  label: string;
  description: string;
  icon: string;
  status: 'available' | 'coming-soon' | 'experimental';
  href?: string;
  note?: string;
}

function buildDestinations(): CompressDestination[] {
  const image = getTool('image', 'compress');
  const pdf = getTool('pdf', 'compress');
  const video = getTool('video', 'compress');

  return [
    {
      label: 'Image',
      description: 'JPG, PNG or WebP — re-encode at a quality you choose.',
      icon: 'M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM4 16l5-5 3 3 4-6 4 5',
      status: image?.status ?? 'coming-soon',
      href: image ? '/tools/image/compress' : undefined,
    },
    {
      label: 'Video',
      description: 'Re-encode at a lower bitrate or resolution.',
      icon: 'M15 10l5-3v10l-5-3M4 6h9a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z',
      status: video?.status ?? 'coming-soon',
      href: video ? '/tools/video/compress' : undefined,
      note: video?.status === 'coming-soon' ? video.comingSoonReason : undefined,
    },
    {
      label: 'PDF',
      description: 'Shrink file size by re-rendering pages at lower quality.',
      icon: 'M6 2h9l5 5v15H6zM15 2v5h5M9 13h1a2 2 0 010 4H9v-4zM9 13v6',
      status: pdf?.status ?? 'coming-soon',
      href: pdf ? '/tools/pdf/compress' : undefined,
    },
    {
      label: 'Files',
      description: 'Bundle multiple files into a single ZIP archive.',
      icon: 'M21 8v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h4l2 2h8a2 2 0 012 2z',
      status: 'available',
      href: '/tools/utilities/archive',
    },
  ];
}

export default function CompressHub() {
  const destinations = buildDestinations();

  return (
    <div>
      <h2 className="font-display text-lg font-semibold">What do you want to compress?</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {destinations.map((d) => {
          const isSoon = d.status === 'coming-soon';
          const isExperimental = d.status === 'experimental';
          const content = (
            <div
              className={`flex h-full flex-col gap-2 rounded-lg border border-line bg-paper p-5 transition-all ${
                isSoon ? 'opacity-70' : 'hover:-translate-y-0.5 hover:border-ink hover:shadow-[2px_2px_0_0_var(--color-ink)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-workshop-dim text-workshop">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                    <path d={d.icon} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {isSoon && (
                  <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-3">
                    Coming soon
                  </span>
                )}
                {isExperimental && (
                  <span className="rounded-full border border-warn/30 bg-warn-dim px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warn">
                    Experimental
                  </span>
                )}
              </div>
              <h3 className="font-display text-base font-semibold">{d.label}</h3>
              <p className="text-xs leading-relaxed text-ink-2">{d.description}</p>
              {d.note && <p className="mt-auto text-[11px] leading-relaxed text-ink-3">{d.note}</p>}
            </div>
          );
          return d.href ? (
            <Link key={d.label} to={d.href} className="block h-full">
              {content}
            </Link>
          ) : (
            <div key={d.label}>{content}</div>
          );
        })}
      </div>

      <div className="mt-6 rounded-md border border-line bg-paper-dim p-4 text-xs leading-relaxed text-ink-2">
        <strong className="font-medium text-ink">Worth knowing:</strong> not every file shrinks much. JPEG, MP4
        and ZIP are already compressed formats, so re-compressing them may only save a little — sometimes
        nothing. You'll always see the real before/after size before deciding whether to keep the result.
      </div>
    </div>
  );
}
