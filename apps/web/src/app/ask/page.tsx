'use client';

import { activeApprovers, capFor, HOUSE, money } from '@unwritten/fixtures';
import { useState } from 'react';
import { Badge, Card, Meta, Page, Rule } from '@/components/primitives';
import { useApp } from '@/lib/state';
import { Gate, ROLES } from '@/components/gate';

function AskInner({ }: Record<string, never>) {
  const { viewer, week } = useApp();
  const [log, setLog] = useState<string[]>([]);
  const cap = viewer === 'judge' ? { cents: 0, source: 'house number' } : capFor(viewer, week);

  /* Cap decides IF approval is needed. Band decides HOW MANY signatures. Two orthogonal
     questions, and nobody is blocked for lacking a personal cap — the house number is the
     floor of autonomy for everyone. */
  const ask = (cents: number) => {
    const needs = cents > cap.cents;
    const signatures = cents >= HOUSE.policy.bothFloorCents ? activeApprovers().length : 1;
    setLog((l) => [
      needs
        ? `${money(cents)} — above your ${money(cap.cents)} cap · needs ${signatures} signature${signatures > 1 ? 's' : ''}`
        : `${money(cents)} — within your ${money(cap.cents)} cap · nobody was asked`,
      ...l,
    ].slice(0, 6));
  };

  return (
    <Page title="Ask" lede="Adding is free. The only authority rule is approval.">
      <Card>
        <div className="flex items-start justify-between gap-3.5">
          <div>
            <Rule>You have {money(cap.cents)} without asking</Rule>
            <Meta>
              {cap.source === 'house number'
                ? 'This is the house number — the floor of autonomy for everyone. A personal cap is something the agent proposes once it has seen enough.'
                : 'Your own cap, proposed by the agent and ratified by an approver.'}
            </Meta>
          </div>
          <Badge tone={cap.source === 'house number' ? 'gray' : 'success'}>
            {cap.source === 'house number' ? 'house default' : 'personal cap'}
          </Badge>
        </div>
      </Card>

      <Card>
        <Rule>What do you need?</Rule>
        <Meta>Above your cap, {activeApprovers().map((m) => m.label).join(' or ')} is asked.</Meta>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {[1200, 2400, 4270, 13900].map((c) => (
            <button key={c} type="button" onClick={() => ask(c)}
              className={`w-full rounded-lg px-3.5 py-3 text-[14px] sm:w-auto sm:py-2 sm:text-[13px] ${
                c <= cap.cents
                  ? 'bg-bg-brand-solid text-text-primary-on-brand font-semibold'
                  : 'border-border-primary text-text-tertiary border'}`}>
              {money(c)} groceries
            </button>
          ))}
        </div>
      </Card>

      {log.length > 0 && <Card>{log.map((l, i) => <Meta key={`${i}-${l}`}>{l}</Meta>)}</Card>}

      <Card tone="note">
        <Meta>
          A spender sees three screens: no digest (they do not vote on policy), no reality check
          (that is oversight), no keys. One navigation for everybody would hide the fact that three
          quarters of a household cannot use an app built only for its admin.
        </Meta>
      </Card>
    </Page>
  );
}

export default function Ask() {
  return (
    <Gate allow={[...ROLES.spenderOnly]}>
      <AskInner />
    </Gate>
  );
}
