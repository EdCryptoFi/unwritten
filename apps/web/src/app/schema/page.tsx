'use client';

import { Card, Meta, Page } from '@/components/primitives';
import { BELIEFS, DECISIONS, HOUSE, PROPOSALS, SPEND, TOPUPS } from '@unwritten/fixtures';

export default function Schema() {
  return (
    <Page
      title="Discovered schema"
      lede="Derived from what the screens actually demanded, not designed up front. This is the input to docs/specs/memory-schema.md."
    >
      <H>namespace: decisions</H>
      <Pre>{JSON.stringify(DECISIONS[6], null, 2)}</Pre>
      <H>namespace: spend — the silence made into data</H>
      <Pre>{JSON.stringify(SPEND[0], null, 2)}</Pre>
      <H>namespace: topup — the denominator</H>
      <Pre>{JSON.stringify(TOPUPS[0], null, 2)}</Pre>
      <H>namespace: beliefs — versioned, append-only</H>
      <Pre>{JSON.stringify(BELIEFS[1], null, 2)}</Pre>
      <H>proposal — rejection carries a cooldown</H>
      <Pre>{JSON.stringify(PROPOSALS[3], null, 2)}</Pre>
      <H>learning knobs — no precedent, the spec defines these</H>
      <Pre>{JSON.stringify(HOUSE.learning, null, 2)}</Pre>

      <Card tone="note">
        <Meta>
          Never written to memory: item names · member identities · recipient addresses in clear ·
          any rendered sentence containing a name · anything a deletion request would have to
          reach. There is no delete and no edit, so minimisation is structural rather than hygiene.
          <br />
          <br />
          And nothing reaches Walrus before a decision resolves. Pending state is database-only,
          because a pending state written is a state that can never be corrected.
        </Meta>
      </Card>
    </Page>
  );
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-text-quaternary mt-[26px] mb-[9px] text-[12px] font-semibold uppercase tracking-[0.8px]">{children}</h2>
);
const Pre = ({ children }: { children: React.ReactNode }) => (
  <pre className="bg-bg-secondary border-border-secondary text-text-tertiary mb-3 overflow-auto rounded-lg border p-3 font-mono text-[11.5px] leading-relaxed">
    {children}
  </pre>
);
