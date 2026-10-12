'use client';

import { activeApprovers, HOUSE, money, nameOf, type Ref } from '@unwritten/fixtures';
import { useState } from 'react';
import { Badge, Card, Meta, Page, Rule } from '@/components/primitives';

type State = 'pending' | 'escalated' | 'approved' | 'rejected' | 'expired';
const TONE: Record<State, 'brand' | 'warning' | 'success' | 'error'> = {
  pending: 'brand', escalated: 'warning', approved: 'success', rejected: 'error', expired: 'error',
};

export default function Pending() {
  const [state, setState] = useState<State>('pending');
  const [by, setBy] = useState<Array<{ ref: Ref; verdict: string }>>([]);
  const [hours, setHours] = useState(0);
  const [sole, setSole] = useState<Ref | null>(null);
  const [notified, setNotified] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const add = (s: string) => setLog((l) => [s, ...l].slice(0, 8));

  const approvers = activeApprovers();
  const needed = state === 'escalated' ? 1 : approvers.length;

  const tap = (ref: Ref, verdict: 'approve' | 'reject' = 'approve') => {
    if (state !== 'pending' && state !== 'escalated') return;
    if (state === 'escalated' && ref !== sole) {
      add(`${nameOf(ref)} tapped — ignored, only ${nameOf(sole ?? '')} can close it now`);
      return;
    }
    if (verdict === 'reject') {
      setBy((b) => [...b, { ref, verdict }]);
      setState('rejected');
      add(`rejected by ${nameOf(ref)} — memory records who rejected`);
      add('the requester is notified: they are standing in a shop');
      return;
    }
    if (by.some((d) => d.ref === ref)) { add(`${nameOf(ref)} already decided — ignored`); return; }
    const next = [...by, { ref, verdict }];
    setBy(next);
    add(`${nameOf(ref)} approved (${next.length}/${needed})`);
    if (next.filter((d) => d.verdict === 'approve').length >= needed) {
      setState('approved');
      add('quorum met — the order of decidedBy is the authority dimension');
      add('DecisionEvent written to ns `decisions` — terminal state only');
    }
  };

  /* The deadline runs from the NOTIFICATION, never from creation. Escalating someone who was
     never told is not an escalation. */
  const advance = (h: number) => {
    if (state !== 'pending' && state !== 'escalated') return;
    if (!notified) { add('nobody has been notified yet — the deadline cannot run'); return; }
    const t = hours + h;
    setHours(t);
    if (state === 'pending' && t >= HOUSE.policy.deadlineHours) {
      const already = by.find((d) => d.verdict === 'approve')?.ref;
      const authority = already ?? approvers.find((m) => m.role === 'owner')?.ref ?? 'm1';
      setSole(authority);
      add(`escalated — sole authority to ${nameOf(authority)}`);
      if (already) {
        // Their existing signature IS the single signature now required. Asking again is theatre,
        // and waiting holds the cart hostage to the approver who went quiet.
        setState('approved');
        add('resolved AT escalation — the sole authority had already signed');
      } else {
        setState('escalated');
      }
    } else if (state === 'escalated' && t >= HOUSE.policy.deadlineHours * 2) {
      setState('expired');
      add('expired — nothing was bought. The invariant never breaks.');
    }
  };

  const reset = () => {
    setState('pending'); setBy([]); setHours(0); setSole(null); setNotified(false);
    add('reset');
  };

  return (
    <Page title="Pending decision" lede="Clickable: notify, tap as each approver, then advance the clock.">
      <Card>
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
          <div>
            <Rule>3 items · groceries</Rule>
            <Meta>
              quorum needs {needed} of {approvers.length} active ·{' '}
              {notified
                ? `${hours}h since the notification of ${HOUSE.policy.deadlineHours}h`
                : 'nobody notified yet — the clock has not started'}
              {sole ? ` · sole authority: ${nameOf(sole)}` : ''}
            </Meta>
            {by.length > 0 && (
              <div className="text-utility-success-700 mt-1.5 font-mono text-[11.5px]">
                decidedBy (ordered): {by.map((d) => nameOf(d.ref)).join(' → ')}
              </div>
            )}
          </div>
          <div className="text-right">
            <span className="font-mono text-[19px]">{money(4270)}</span>
            <div className="mt-1"><Badge tone={TONE[state]}>{state}</Badge></div>
          </div>
        </div>

        <div className="mt-3.5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {!notified && <B onClick={() => { setNotified(true); add('approvers notified — the deadline starts now'); }}>Notify the approvers</B>}
          {approvers.map((m) => <B key={m.ref} onClick={() => tap(m.ref)}>{m.label} approves</B>)}
          <B ghost onClick={() => tap('m1', 'reject')}>Alex rejects</B>
          <B ghost onClick={() => advance(2)}>+2h</B>
          <B ghost onClick={() => advance(3)}>+3h</B>
          <B ghost onClick={reset}>Reset</B>
        </div>

        {state === 'expired' && (
          <div className="bg-bg-tertiary mt-3 rounded-lg px-3 py-2.5">
            <Meta>
              The cart is saved and nothing was bought. &ldquo;Nothing is ever purchased without
              approval&rdquo; is an invariant, not a setting.
            </Meta>
          </div>
        )}
      </Card>

      {log.length > 0 && <Card>{log.map((l, i) => <Meta key={`${i}-${l}`}>{l}</Meta>)}</Card>}
    </Page>
  );
}

/* Approving happens on a phone, in a queue. Primary action is full width on small screens. */
function B({ children, onClick, ghost }: { children: React.ReactNode; onClick: () => void; ghost?: boolean }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`w-full rounded-lg px-3.5 py-3 text-[14px] sm:w-auto sm:py-2 sm:text-[13px] ${
        ghost
          ? 'border-border-primary text-text-tertiary hover:text-text-primary border'
          : 'bg-bg-brand-solid hover:bg-bg-brand-solid-hover text-text-primary-on-brand font-semibold'
      }`}
    >
      {children}
    </button>
  );
}
