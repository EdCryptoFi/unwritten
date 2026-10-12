'use client';

import { PROPOSALS, say, upTo } from '@unwritten/fixtures';
import { useState } from 'react';
import { Badge, Card, Empty, Meta, Page, Rule } from '@/components/primitives';
import { useApp, useHouse } from '@/lib/state';

type TxState = 'idle' | 'awaiting' | 'signing' | 'confirmed' | 'failed';

export default function Digest() {
  const { week, role } = useApp();
  const { beliefsUpTo, beliefs: BELIEFS } = useHouse();
  const [tx, setTx] = useState<Record<string, TxState>>({});
  const [log, setLog] = useState<string[]>([]);
  const add = (s: string) => setLog((l) => [s, ...l].slice(0, 8));

  const open = upTo(PROPOSALS, week).filter((p) => p.status === 'pending' && !tx[p.id]);
  const proposed = new Set(upTo(PROPOSALS, week).map((p) => p.beliefId));
  // Drift is the rationale inside a proposal, never a card of its own. It stands alone only when
  // the evidence does not say which direction to propose — a section that never clears teaches
  // the admin to skip the digest.
  const orphanDrift = beliefsUpTo.filter((b) => b.state === 'drifting' && !proposed.has(b.id));
  const fresh = beliefsUpTo.filter((b) => b.fromWeek === week);

  /* An approver can ACCEPT. Only the owner key can sign it onchain, which makes the owner a
     single point of failure for every policy change. Modelled rather than hidden. */
  const accept = (id: string) => {
    if (role === 'owner') return sign(id);
    setTx((t) => ({ ...t, [id]: 'awaiting' }));
    add('accepted — awaiting the owner key to write onchain');
  };

  /* Two systems, and Walrus has no delete. Chain first, memory second, always: a memory write
     before the transaction confirms could leave an immortal rule with nothing behind it. */
  const sign = (id: string, fail = false) => {
    setTx((t) => ({ ...t, [id]: 'signing' }));
    add('signing — owner key unlocked, tx built');
    setTimeout(() => {
      if (fail) {
        setTx((t) => ({ ...t, [id]: 'failed' }));
        add('tx FAILED — nothing superseded, no memory write happened');
      } else {
        setTx((t) => ({ ...t, [id]: 'confirmed' }));
        add('tx confirmed onchain');
        add('memory write: belief v+1 appended, the old version untouched');
      }
    }, 900);
  };

  const nothing = open.length === 0 && orphanDrift.length === 0 && fresh.length === 0;

  return (
    <Page
      title={`Week ${week} digest`}
      lede="Batched on purpose — only a pending approval or an anomaly is allowed to interrupt."
    >
      {nothing && (
        <Empty>
          Nothing to decide this week.
          <br />
          <span className="font-mono text-[11.5px]">
            The agreement matches behaviour. An empty digest still ships, so silence comes to mean
            agreement rather than absence.
          </span>
        </Empty>
      )}

      {open.length > 0 && <H>Proposals · {open.length}</H>}
      {open.map((p) => {
        const drift = BELIEFS.find((b) => b.id === p.beliefId && b.state === 'drifting');
        const belief = BELIEFS.find((b) => b.id === p.beliefId);
        return (
          <Card key={p.id}>
            <div className="flex items-start justify-between gap-3.5">
              <div>
                <Rule>{p.from} → {p.to}</Rule>
                <Meta>{p.rationale}</Meta>
                {drift && (
                  <div className="text-text-warning-primary mt-1.5 font-mono text-[11.5px]">
                    drift finding: {say(drift)}
                  </div>
                )}
              </div>
              <Badge tone="brand">{p.kind} · {p.effect}</Badge>
            </div>
            <div className="bg-bg-tertiary mt-3 rounded-lg px-3 py-2.5">
              <Meta>
                {p.effect === 'supersede'
                  ? `This writes onchain and supersedes ${belief?.id} — irreversible, so it needs an explicit confirm. v${belief?.version} → v${(belief?.version ?? 1) + 1}, and the diff is arithmetic.`
                  : 'This changes policy only. The observation stays true, so nothing is superseded.'}
              </Meta>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn onClick={() => accept(p.id)}>Make it official</Btn>
              <Btn ghost onClick={() => { setTx((t) => ({ ...t, [p.id]: 'idle' })); add(`rejected — nothing written to memory, cooldown set`); }}>
                Keep the rule
              </Btn>
              <Btn ghost onClick={() => sign(p.id, true)}>Simulate tx failure</Btn>
            </div>
          </Card>
        );
      })}

      {Object.entries(tx).filter(([, s]) => s !== 'idle').map(([id, s]) => {
        const p = PROPOSALS.find((x) => x.id === id);
        if (!p) return null;
        const label: Record<Exclude<TxState, 'idle'>, [string, 'brand' | 'warning' | 'success' | 'error']> = {
          awaiting: ['awaiting the owner', 'warning'],
          signing: ['unlocking owner key…', 'brand'],
          confirmed: ['onchain', 'success'],
          failed: ['tx failed', 'error'],
        };
        const [text, tone] = label[s as Exclude<TxState, 'idle'>];
        return (
          <Card key={id}>
            <div className="flex items-start justify-between gap-3.5">
              <div>
                <Rule>{p.from} → {p.to}</Rule>
                <Meta>
                  {s === 'awaiting'
                    ? 'Writing policy onchain needs the owner key. Nothing has reached memory or chain yet.'
                    : s === 'failed'
                      ? 'The rule was NOT changed and nothing was written to memory. Safe to retry.'
                      : 'Chain first, memory second.'}
                </Meta>
              </div>
              <Badge tone={tone}>{text}</Badge>
            </div>
            {s === 'awaiting' && role === 'owner' && (
              <div className="mt-3"><Btn onClick={() => sign(id)}>Sign it</Btn></div>
            )}
            {s === 'awaiting' && role !== 'owner' && (
              <Meta>Only Alex can sign. This is the bottleneck, said out loud.</Meta>
            )}
            {s === 'failed' && <div className="mt-3"><Btn onClick={() => sign(id)}>Retry</Btn></div>}
          </Card>
        );
      })}

      {orphanDrift.length > 0 && <H>Drift with no proposal · {orphanDrift.length}</H>}
      {orphanDrift.map((b) => (
        <Card key={b.id}>
          <div className="flex items-start justify-between gap-3.5">
            <Rule>{say(b)}</Rule>
            <Badge tone="warning">no direction</Badge>
          </div>
          <Meta>
            The rule and the behaviour disagree, but the evidence does not say which one to change.
          </Meta>
        </Card>
      ))}

      {fresh.length > 0 && <H>New this week · {fresh.length}</H>}
      {fresh.map((b) => (
        <Card key={b.id}>
          <Rule>{say(b)}</Rule>
          <Meta>{b.dimension} · first seen week {b.fromWeek}</Meta>
        </Card>
      ))}

      {log.length > 0 && (
        <>
          <H>What happened</H>
          <Card>{log.map((l) => <Meta key={l}>{l}</Meta>)}</Card>
        </>
      )}
    </Page>
  );
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-text-quaternary mt-[26px] mb-[9px] text-[12px] font-semibold uppercase tracking-[0.8px]">{children}</h2>
);

function Btn({ children, onClick, ghost }: { children: React.ReactNode; onClick: () => void; ghost?: boolean }) {
  return (
    <button
      type="button" onClick={onClick}
      className={ghost
        ? 'border-border-primary text-text-tertiary hover:text-text-primary rounded-lg border px-3.5 py-2 text-[13px]'
        : 'bg-bg-brand-solid hover:bg-bg-brand-solid-hover text-text-primary-on-brand rounded-lg px-3.5 py-2 text-[13px] font-semibold'}
    >
      {children}
    </button>
  );
}
