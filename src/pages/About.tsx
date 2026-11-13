import { Link } from 'react-router-dom';
import { usePageMeta } from '../lib/usePageMeta';

export default function About() {
  usePageMeta('About', 'Why Bench exists: free, ad-free, privacy-first tools with no account required, and how to support or contribute to the project.');
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">About Bench</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink/70">
        Bench is a collection of everyday file and productivity tools that run entirely in your browser. No
        ads, no accounts, no subscriptions, and no server standing between you and your files.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-ink/70">
        Every tool on this site is free today, and free is the plan for the tools you see now. The project is
        built so that heavier, optional capabilities, like batch processing or very large files, could be
        offered later as a separate paid tier, without changing how the free tools work.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-ink/70">
        If you find it useful, you're welcome to <Link to="/support" className="text-workshop hover:underline">optionally support development</Link>.
        Nothing here is ever gated behind that — it's just a way to help keep the project going.
      </p>

      <h2 className="mt-8 font-display text-base font-semibold">Help improve it</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">
        Found a bug, or want a tool that isn't here yet? Both are useful to hear about — reach out through
        wherever this project is hosted (GitHub issues, if it's open-sourced) with a "Report a Bug" or
        "Suggest a Tool" note.
      </p>
    </div>
  );
}
