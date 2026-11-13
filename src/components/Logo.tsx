/**
 * Bench's mark: a workbench (top slab and two legs) with a file resting on it.
 * The bench uses the current text color; the file uses the accent.
 */
export function LogoMark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect x="3" y="12" width="26" height="5" rx="1.5" fill="currentColor" />
      <rect x="6" y="17" width="3.2" height="11" rx="1" fill="currentColor" />
      <rect x="22.8" y="17" width="3.2" height="11" rx="1" fill="currentColor" />
      <path d="M12 11V4.5h6.2L21 7.3V11" fill="none" stroke="var(--color-workshop)" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}
