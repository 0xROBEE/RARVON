import { usePageMeta } from '../lib/usePageMeta';

export default function Privacy() {
  usePageMeta(
    'Privacy',
    'Files are processed locally in your browser whenever possible — nothing is uploaded to a server. No account, no tracking, no remote storage.',
  );
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Privacy</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink/70">
        Your files are processed locally in your browser whenever possible. We don't upload your files to our
        servers. Each tool that works this way does all of its reading, transforming and writing inside your
        browser tab, using standard browser APIs and WebAssembly. When you close the tab, nothing of your file
        remains anywhere but your own device.
      </p>
      <h2 className="mt-8 font-display text-base font-semibold">What we don't do</h2>
      <ul className="mt-3 space-y-2 text-sm text-ink/70">
        <li>We don't require an account or collect your email to use a tool.</li>
        <li>We don't run analytics that reads or reports on file contents.</li>
        <li>We don't store uploaded files remotely, because we don't receive them.</li>
      </ul>
      <h2 className="mt-8 font-display text-base font-semibold">When a tool can't run locally</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">
        A few features, like a real URL shortener, need a server by nature: a short link only works if something
        remembers where it points. In those cases we label the tool "Coming Soon" and build only the interface,
        rather than quietly sending your data to a server or faking the feature.
      </p>
    </div>
  );
}
