import { useEffect, useState } from 'react';
import { ChoicePills } from '../../../components/tool/TextPanes';
import { DevWorkspace, Pane, PaneAction, StatusBar, ValueRow } from '../../../components/tool/CodePanes';
import { getLang, tr } from '../../../lib/i18n';

type Unit = 'seconds' | 'milliseconds';

/** "in 2 days", "3 hours ago" in the interface language. */
function relative(ms: number, now: number): string {
  const rtf = new Intl.RelativeTimeFormat(getLang(), { numeric: 'auto' });
  const diff = (ms - now) / 1000;
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
  for (const [unit, size] of steps) {
    if (Math.abs(diff) >= size || unit === 'second') return rtf.format(Math.round(diff / size), unit);
  }
  return '';
}

export default function TimestampTool() {
  const [unit, setUnit] = useState<Unit>('seconds');
  const [unixInput, setUnixInput] = useState(() => String(Math.floor(Date.now() / 1000)));
  const [dateInput, setDateInput] = useState(() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const n = unixInput.trim() === '' ? NaN : Number(unixInput);
  const ms = Number.isNaN(n) ? null : unit === 'seconds' ? n * 1000 : n;
  const date = ms !== null && !Number.isNaN(new Date(ms).getTime()) ? new Date(ms) : null;
  const fromInput = new Date(dateInput);
  const validInput = !Number.isNaN(fromInput.getTime());

  function changeUnit(u: Unit) {
    // Keep the same moment when switching units.
    if (ms !== null) setUnixInput(String(u === 'seconds' ? Math.floor(ms / 1000) : ms));
    setUnit(u);
  }

  return (
    <div className="space-y-6">
      <DevWorkspace
        status={
          <StatusBar
            state={date ? 'ok' : 'error'}
            message={date ? tr('Valid timestamp') : tr('Not a valid number.')}
            items={[tr('Now: {t}', { t: unit === 'seconds' ? Math.floor(now / 1000) : now })]}
          />
        }
      >
        <Pane file="timestamp" label={tr('Unix timestamp → date')} actions={<PaneAction onClick={() => setUnixInput(String(unit === 'seconds' ? Math.floor(Date.now() / 1000) : Date.now()))}>{tr('Use now')}</PaneAction>}>
          <div className="grid gap-3 p-4">
            <input
              value={unixInput}
              onChange={(e) => setUnixInput(e.target.value)}
              aria-label={tr('Unix timestamp')}
              inputMode="numeric"
              dir="ltr"
              spellCheck={false}
              className="code-field w-full rounded-lg border border-line bg-elevated px-3 py-3 font-mono text-2xl tracking-tight text-ink focus:border-[color:var(--color-cat-developer)]"
            />
            <ChoicePills<Unit> label={tr('Unit')} value={unit} onChange={changeUnit} options={[{ value: 'seconds', label: tr('Seconds') }, { value: 'milliseconds', label: tr('Milliseconds') }]} />
          </div>
        </Pane>
        <Pane file="date.txt" label={tr('Date')}>
          {date ? (
            <div className="fade-in">
              <ValueRow name="UTC" value={date.toUTCString()} />
              <ValueRow name={tr('Local')} value={date.toString()} />
              <ValueRow name="ISO 8601" value={date.toISOString()} />
              <ValueRow name={tr('Relative')} value={relative(date.getTime(), now)} mono={false} />
            </div>
          ) : (
            <p className="grid min-h-[10rem] place-items-center px-6 text-center text-xs text-ink-3">{tr('Enter a number of seconds or milliseconds.')}</p>
          )}
        </Pane>
      </DevWorkspace>

      <DevWorkspace status={<StatusBar state={validInput ? 'ok' : 'error'} message={validInput ? tr('Valid date') : tr('Enter a valid date.')} items={[tr('Your time zone: {z}', { z: Intl.DateTimeFormat().resolvedOptions().timeZone })]} />}>
        <Pane file="date" label={tr('Date → Unix timestamp')} actions={<PaneAction onClick={() => { const d = new Date(); setDateInput(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19)); }}>{tr('Use now')}</PaneAction>}>
          <div className="p-4">
            <input
              type="datetime-local"
              step={1}
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              aria-label={tr('Date and time')}
              className="code-field w-full rounded-lg border border-line bg-elevated px-3 py-3 font-mono text-base text-ink focus:border-[color:var(--color-cat-developer)]"
            />
          </div>
        </Pane>
        <Pane file="timestamp.txt" label={tr('Unix timestamp')}>
          {validInput ? (
            <div className="fade-in">
              <ValueRow name={tr('seconds')} value={String(Math.floor(fromInput.getTime() / 1000))} />
              <ValueRow name={tr('milliseconds')} value={String(fromInput.getTime())} />
              <ValueRow name="ISO 8601" value={fromInput.toISOString()} />
            </div>
          ) : (
            <p className="grid min-h-[8rem] place-items-center px-6 text-center text-xs text-ink-3">{tr('Enter a valid date.')}</p>
          )}
        </Pane>
      </DevWorkspace>
    </div>
  );
}
