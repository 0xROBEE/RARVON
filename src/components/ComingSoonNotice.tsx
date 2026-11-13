export default function ComingSoonNotice({ reason }: { reason?: string }) {
  return (
    <div className="rounded-lg border border-line bg-paper-dim p-6 text-center">
      <p className="font-display text-sm font-semibold">This tool isn't available yet</p>
      {reason && <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">{reason}</p>}
      <p className="mt-3 text-xs text-ink-3">We'd rather mark it Coming Soon than fake it or quietly send your file to a server.</p>
    </div>
  );
}
