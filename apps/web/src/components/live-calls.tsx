'use client';

import { useState } from 'react';

/**
 * Three buttons that make the integrations happen in front of the reviewer.
 *
 * A page that says "we read Sui through Tatum" asks to be believed; a button that does it, shows
 * the answer and how long it took, does not. Each one hits the same API route the product uses,
 * and each route is cached (15 s, 60 s, 5 min) so a reviewer clicking repeatedly cannot spend the
 * Tatum quota or the relayer budget — the panel says whether the answer was cached, rather than
 * pretending every click is a fresh call.
 */
type Result = { ms: number; cache: string; lines: string[]; ok: boolean };

const CALLS: Array<{
  key: string; label: string; via: string; icon: string; url: string;
  read: (j: Record<string, unknown>) => string[];
}> = [
  {
    key: 'checkpoint', label: 'Tatum · latest Sui checkpoint', via: 'checkpoint · sequenceNumber',
    icon: 'deployed_code', url: '/api/checkpoint',
    read: (j) => [`checkpoint ${String(j.checkpoint ?? '—')}`, `host ${String(j.base ?? '')}`],
  },
  {
    key: 'chain', label: 'Tatum · the house wallet', via: 'transactions · sentAddress + address · balances',
    icon: 'account_balance_wallet', url: '/api/chain',
    read: (j) => {
      const rows = (j.reconciled as Array<{ approvalId: string | null }> | undefined) ?? [];
      const mist = j.balanceMist ? Number(j.balanceMist) / 1e9 : null;
      return [
        `balance ${mist === null ? '—' : `${mist.toFixed(4)} SUI`}`,
        `${String(j.transfers ?? 0)} transfers out · ${rows.filter((r) => !r.approvalId).length} with no approval in memory`,
      ];
    },
  },
  {
    key: 'house', label: 'Walrus Memory · the house', via: 'recall + listNamespaces on the MemWal relayer',
    icon: 'database', url: '/api/house',
    read: (j) => {
      const counts = (j.counts as Record<string, number> | undefined) ?? {};
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return [
        `${total} memories across ${Object.keys(counts).length} namespaces · source ${String(j.source ?? '—')}`,
        Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · '),
      ];
    },
  },
];

export function LiveCalls() {
  const [res, setRes] = useState<Record<string, Result | 'running'>>({});

  const run = async (c: (typeof CALLS)[number]) => {
    setRes((r) => ({ ...r, [c.key]: 'running' }));
    const t0 = performance.now();
    try {
      const r = await fetch(c.url, { cache: 'no-store' });
      const j = (await r.json()) as Record<string, unknown>;
      setRes((x) => ({
        ...x,
        [c.key]: { ms: Math.round(performance.now() - t0), cache: r.headers.get('x-cache') ?? 'n/a', lines: c.read(j), ok: r.ok && !j.error },
      }));
    } catch {
      setRes((x) => ({ ...x, [c.key]: { ms: Math.round(performance.now() - t0), cache: 'n/a', lines: ['the call failed — try again'], ok: false } }));
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {CALLS.map((c) => {
        const r = res[c.key];
        return (
          <div key={c.key} className="clay-card flex flex-col rounded-xl p-4">
            <div className="mb-2 flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-primary text-[22px]">{c.icon}</span>
              <span className="text-on-surface text-sm font-bold">{c.label}</span>
            </div>
            <code className="text-on-surface-variant mb-3 text-[11px] break-words">{c.via}</code>
            <button type="button" onClick={() => run(c)} disabled={r === 'running'}
              className="clay-pill clay-pill-primary mb-3 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold disabled:opacity-60">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">play_arrow</span>
              {r === 'running' ? 'Calling…' : 'Run it live'}
            </button>
            <div className="clay-well min-h-[64px] rounded-lg px-3 py-2 font-mono text-[11px] leading-relaxed" aria-live="polite">
              {!r && <span className="text-on-surface-variant">not run yet</span>}
              {r === 'running' && <span className="text-on-surface-variant">calling {c.url}…</span>}
              {r && r !== 'running' && (
                <>
                  {r.lines.map((l) => <div key={l} className={r.ok ? 'text-on-surface' : 'text-tertiary'}>{l}</div>)}
                  <div className="text-on-surface-variant mt-1">{r.ms} ms · {r.cache === 'hit' ? 'served from the route’s cache' : r.cache === 'miss' ? 'fresh call' : 'cache unknown'}</div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
