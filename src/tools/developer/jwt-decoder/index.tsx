import { useEffect, useMemo, useState } from 'react';
import { CopyButton } from '../../../components/tool';
import { CodeEditor, DevWorkspace, JsonCode, Pane, StatusBar } from '../../../components/tool/CodePanes';
import { tr } from '../../../lib/i18n';

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(segment.length + ((4 - (segment.length % 4)) % 4), '=');
  return new TextDecoder().decode(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)));
}

function pretty(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

const TIME_CLAIMS = { iat: 'Issued', nbf: 'Valid from', exp: 'Expires' } as const;

/** One decoded part of the token, with its colour and a Copy button. */
function Part({ name, color, json }: { name: string; color: string; json: string }) {
  return (
    <div className="border-b border-line last:border-b-0">
      <div className="flex items-center justify-between px-3 pt-2">
        <span className="font-mono text-[11px] font-semibold tracking-wider" style={{ color }}>{name}</span>
        <CopyButton text={json} label="Copy" />
      </div>
      <pre dir="ltr" className="overflow-x-auto px-3 pb-2.5 pt-1 font-mono text-xs leading-relaxed"><JsonCode text={json} /></pre>
    </div>
  );
}

export default function JwtDecoder() {
  const [token, setToken] = useState('');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const decoded = useMemo(() => {
    const parts = token.trim().split('.');
    if (!token.trim()) return null;
    if (parts.length < 2) return { error: tr('A JWT has three dot-separated parts (header.payload.signature). This doesn’t look like one.') };
    try {
      const payloadRaw = base64UrlDecode(parts[1]);
      let claims: Record<string, unknown> = {};
      try { claims = JSON.parse(payloadRaw); } catch { /* not an object payload */ }
      return { header: pretty(base64UrlDecode(parts[0])), payload: pretty(payloadRaw), signature: parts[2] ?? '', claims };
    } catch {
      return { error: tr('Could not decode this token. Make sure it’s a valid Base64URL-encoded JWT.') };
    }
  }, [token]);

  const ok = decoded && !('error' in decoded) ? decoded : null;
  const exp = typeof ok?.claims.exp === 'number' ? ok.claims.exp * 1000 : null;
  const expired = exp !== null && exp < now;

  return (
    <DevWorkspace
      status={
        <StatusBar
          state={!decoded ? 'idle' : 'error' in decoded ? 'error' : expired ? 'error' : 'ok'}
          message={!decoded ? tr('Paste a token') : 'error' in decoded ? decoded.error : expired ? tr('Decoded · this token has expired') : tr('Decoded')}
          items={ok ? [ok.signature ? tr('Signature present, not verified here') : tr('No signature segment was found.')] : []}
        />
      }
    >
      <CodeEditor file="token.jwt" label={tr('Paste a JWT')} value={token} onChange={setToken} wrap placeholder={tr('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....')} />
      <Pane file="decoded.json" label={tr('Decoded token')}>
        {ok ? (
          <div className="fade-in">
            <Part name={tr('HEADER')} color="var(--color-cat-pdf)" json={ok.header} />
            <Part name={tr('PAYLOAD')} color="var(--color-cat-video)" json={ok.payload} />
            {(Object.keys(TIME_CLAIMS) as (keyof typeof TIME_CLAIMS)[]).some((k) => typeof ok.claims[k] === 'number') && (
              <div className="grid gap-1 border-t border-line bg-elevated px-3 py-2 text-[11px]">
                {(Object.keys(TIME_CLAIMS) as (keyof typeof TIME_CLAIMS)[]).map((k) => {
                  const v = ok.claims[k];
                  if (typeof v !== 'number') return null;
                  const d = new Date(v * 1000);
                  return (
                    <p key={k} className={k === 'exp' && expired ? 'text-warn' : 'text-ink-2'}>
                      <span className="font-mono text-ink-3">{k}</span> · {tr(TIME_CLAIMS[k])}: <span dir="ltr">{d.toUTCString()}</span>
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <p className="grid min-h-[14rem] place-items-center px-6 text-center text-xs text-ink-3">{tr('The header and payload appear here.')}</p>
        )}
      </Pane>
    </DevWorkspace>
  );
}
