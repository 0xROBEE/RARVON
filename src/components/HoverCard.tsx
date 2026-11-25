import { useRef } from 'react';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import clsx from 'clsx';

/**
 * A home page card that comes alive on hover, in its group's colour: it tilts
 * toward the mouse, colour sweeps across from the icon side, a bar draws along
 * the top and the icon spins once. Tool names inside (`.hover-card-item`) pop
 * out as a coloured pill. These effects only move while your own mouse moves
 * over the card, so they stay on with "reduce motion" (which turns off motion
 * that plays by itself). The tilt needs a real mouse; the colours also work on
 * touch and keyboard focus.
 */
export default function HoverCard({ color, className, children, testId }: { color: string; className?: string; children: ReactNode; testId?: string }) {
  const card = useRef<HTMLDivElement>(null);

  function tilt(e: PointerEvent<HTMLDivElement>) {
    const el = card.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(800px) rotateX(${(-y * 10).toFixed(1)}deg) rotateY(${(x * 12).toFixed(1)}deg) translateY(-4px)`;
  }

  return (
    <div
      ref={card}
      onPointerMove={tilt}
      onPointerLeave={() => { if (card.current) card.current.style.transform = ''; }}
      className={clsx('hover-card flex flex-col rounded-xl border border-line bg-elevated p-4', className)}
      style={{ '--c': color } as CSSProperties}
      data-testid={testId}
    >
      <span aria-hidden="true" className="hover-card-sweep" />
      <span aria-hidden="true" className="hover-card-bar" />
      {children}
    </div>
  );
}
