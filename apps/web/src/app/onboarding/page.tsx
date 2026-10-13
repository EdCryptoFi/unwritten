'use client';

import { Gate, ROLES } from '@/components/gate';
import { Badge, Card, Meta, Page, Rule } from '@/components/primitives';
import { HOUSE, activeApprovers, money } from '@unwritten/fixtures';
import { useState } from 'react';

const STATE_TONE = {
  active: 'success', declared: 'brand', invited: 'warning', subject: 'neutral', revoked: 'error',
} as const;

function OnboardingInner() {
  const [funded, setFunded] = useState(false);
  const declared = HOUSE.members.filter((m) => m.approver && m.state !== 'active').length;
  const active = activeApprovers().length;

  return (
    <Page title="Onboarding" lede="Two keys in the whole system. Members log in with an invite link — no key, no wallet.">
      <H>Step 3 · the only crypto moment</H>
      <Card>
        <Rule>Save this key</Rule>
        <Meta>
          Generated in this browser. Never sent to our server. Nobody can restore it, including us.
        </Meta>
      </Card>

      <H>Step 5 · one number, deliberately wrong</H>
      <Card>
        <Rule>How much can one person spend without asking?</Rule>
        <Meta>
          {money(HOUSE.policy.autoApproveCents)} — we will revise this once we have seen a few weeks.
        </Meta>
        <div className="bg-bg-tertiary mt-3 rounded-lg px-3 py-2.5">
          <Meta>
            Plant the wrong number on purpose. Without the initial guess there is nothing for week
            five to correct, and without the correction there is no product.
          </Meta>
        </div>
      </Card>

      <H>Step 6 · fund the house</H>
      <Card>
        <div className="flex items-start justify-between gap-3.5">
          <div>
            <Rule>{funded ? 'House funded · $412.00' : 'The house has no money yet'}</Rule>
            <Meta>
              {funded
                ? 'Top-ups are a script in the simulation, never a product feature. The only user-facing touch is the low-balance nudge.'
                : 'Until this happens nothing in the app works. Setup that ends before it leaves a dead app.'}
            </Meta>
          </div>
          {funded && <Badge tone="success">funded</Badge>}
        </div>
        {!funded && (
          <button type="button" onClick={() => setFunded(true)}
            className="bg-bg-brand-solid text-text-primary-on-brand mt-3 rounded-lg px-3.5 py-2 text-[13px] font-semibold">
            Receive 412 USDC (testnet)
          </button>
        )}
      </Card>

      <H>Roster — the admin can add anyone manually</H>
      {HOUSE.members.map((m) => (
        <Card key={m.ref}>
          <div className="flex items-start justify-between gap-3.5">
            <div>
              <Rule>{m.label} · {m.role}</Rule>
              <Meta>
                ref {m.ref} · {m.approver ? 'approver' : 'not an approver'}
                {m.walletLimitCents ? ` · limit ${money(m.walletLimitCents)}/${m.period}` : ''}
              </Meta>
            </div>
            <Badge tone={STATE_TONE[m.state]}>{m.state}</Badge>
          </div>
        </Card>
      ))}

      {declared > 0 && (
        <Card tone="note">
          <Meta>
            {active} of {active + declared} approvers have joined. A both-signature band is
            unsatisfiable with {active} active, so everything above{' '}
            {money(HOUSE.policy.bothFloorCents)} stays blocked until they do — never a silent
            downgrade to one signature.
          </Meta>
        </Card>
      )}
    </Page>
  );
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-text-quaternary mt-[26px] mb-[9px] text-[12px] font-semibold uppercase tracking-[0.8px]">{children}</h2>
);

export default function Onboarding() {
  return (
    <Gate allow={[...ROLES.ownerOnly]}>
      <OnboardingInner />
    </Gate>
  );
}
