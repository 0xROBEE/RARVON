import { useState } from 'react';
import clsx from 'clsx';
import { toggleFavorite, useAppPrefs } from '../lib/appPrefs';
import { tr } from '../lib/i18n';

/** The ★ that adds a tool to "Favourite tools" on the home page (Rarvon app only). */
export default function FavoriteStar({ toolKey, name }: { toolKey: string; name: string }) {
  const { favorites } = useAppPrefs();
  const on = favorites.includes(toolKey);
  const [burst, setBurst] = useState(0);

  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        if (!on) setBurst((b) => b + 1);
        toggleFavorite(toolKey);
      }}
      title={on ? tr('Remove {name} from favourites', { name }) : tr('Add {name} to favourites', { name })}
      className={clsx(
        'fav-star relative inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all active:scale-95',
        on
          ? 'border-[color:var(--color-star)] bg-[color:color-mix(in_srgb,var(--color-star)_14%,transparent)] text-[color:var(--color-star)]'
          : 'border-line text-ink-2 hover:border-[color:var(--color-star)] hover:text-[color:var(--color-star)]',
      )}
      data-testid="favorite-star"
    >
      <span key={burst} className={clsx('relative grid place-items-center', burst > 0 && on && 'fav-star-pop')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
        </svg>
        {burst > 0 && on && (
          <span aria-hidden="true" className="fav-sparks">
            {Array.from({ length: 6 }, (_, i) => <i key={i} style={{ transform: `rotate(${i * 60}deg)` }} />)}
          </span>
        )}
      </span>
      {on ? tr('Favourite') : tr('Add to favourites')}
    </button>
  );
}
