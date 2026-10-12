'use client';

import {
  DECISIONS, HOUSE, money, RECIPIENTS, recipientSay, SPEND, upTo,
} from '@unwritten/fixtures';
import { Badge, Card, Empty, Kpi, Meta, Page, Rule } from '@/components/primitives';
import { useApp } from '@/lib/state';

const TREASURY = { balanceCents: 41200, lastTopUpWeek: 5, lowThresholdCents: 5000 };

export default function Reality() {
  const { week } = useApp();
  const all = upTo(SPEND, week).filter((x) => !x.hasApproval);

  // Fail safe: a recipient we have not classified is never treated as a commitment, so it stays
  // in the anomaly set. Failing to "I don't know, so I told you" beats failing to "let it through".
  const known = (r: string) => RECIPIENTS[r] && RECIPIENTS[r]!.category !== 'unclassified';
  const creep = all.filter((x) => known(x.recipientRef) && RECIPIENTS[x.recipientRef]!.isCommitment
    && x.expectedCents !== undefined && x.amountCents > x.expectedCents);
  const off = all.filter((x) => x.offRhythm);
  const unknown = all.filter((x) => !known(x.recipientRef));
  const plain = all.filter((x) => known(x.recipientRef)
    && !RECIPIENTS[x.recipientRef]!.isCommitment && !x.offRhythm);

  // Splitting a purchase to stay inside a cap: same day, same category, each part under the
  // floor, the total over it. No value-based rule can see this.
  const groups = new Map<string, typeof DECISIONS>();
  for (const d of upTo(DECISIONS, week)) {
    const k = `${d.date}|${d.category}`;
    groups.set(k, [...(groups.get(k) ?? []), d]);
  }
  const splits = [...groups.entries()].filter(([, v]) =>
    v.length > 1
    && v.reduce((a, b) => a + b.amountCents, 0) > HOUSE.policy.bothFloorCents
    && v.every((x) => x.amountCents <= HOUSE.policy.bothFloorCents));

  const unaccounted = plain.reduce((a, b) => a + b.amountCents, 0);

  return (
    <Page
      title="Reality check"
      lede="The agreement, measured against what actually moved onchain. Read through Tatum's Data API."
    >
      <Kpi items={[
        ['House balance', money(TREASURY.balanceCents)],
        ['Last top-up', `wk ${TREASURY.lastTopUpWeek}`],
        ['Decisions recorded', String(upTo(DECISIONS, week).length)],
        ['Unaccounted', money(unaccounted), unaccounted ? 'text-text-error-primary' : undefined],
      ]} />

      {unknown.length > 0 && (
        <Card>
          <div className="flex items-start justify-between gap-3.5">
            <div>
              <Rule>{unknown.length} charge{unknown.length === 1 ? '' : 's'} we cannot classify yet</Rule>
              <Meta>
                Unclassified never counts as a standing commitment, so these stay in the anomaly set.
              </Meta>
            </div>
            <Badge tone="error">unclassified</Badge>
          </div>
        </Card>
      )}

      {creep.map((x) => (
        <Card key={x.id}>
          <div className="flex items-start justify-between gap-3.5">
            <div>
              <Rule>
                {recipientSay(x.recipientRef)} went from {money(x.expectedCents ?? 0)} to {money(x.amountCents)}
              </Rule>
              <Meta>{x.date} · nobody approved it · nobody noticed</Meta>
            </div>
            <Badge tone="warning">repriced</Badge>
          </div>
        </Card>
      ))}

      {off.map((x) => (
        <Card key={x.id}>
          <div className="flex items-start justify-between gap-3.5">
            <div>
              <Rule>{money(x.amountCents)} · {x.category} · {x.offRhythm}</Rule>
              <Meta>
                under the {money(HOUSE.policy.bothFloorCents)} floor — only cadence catches this
              </Meta>
            </div>
            <Badge tone="warning">off-rhythm</Badge>
          </div>
        </Card>
      ))}

      {splits.length > 0 && (
        <>
          <H>Structuring · {splits.length}</H>
          {splits.map(([k, v]) => (
            <Card key={k}>
              <div className="flex items-start justify-between gap-3.5">
                <div>
                  <Rule>
                    {v.length} requests on {k.split('|')[0]} summing{' '}
                    {money(v.reduce((a, b) => a + b.amountCents, 0))}
                  </Rule>
                  <Meta>
                    each one under the {money(HOUSE.policy.bothFloorCents)} floor, the total over it
                    — a purchase split to stay inside a cap
                  </Meta>
                </div>
                <Badge tone="warning">split</Badge>
              </div>
            </Card>
          ))}
        </>
      )}

      {plain.length > 0 ? (
        <>
          <H>No approval recorded · {plain.length}</H>
          {plain.map((x) => (
            <Card key={x.id}>
              <div className="flex items-start justify-between gap-3.5">
                <div>
                  <Rule>{money(x.amountCents)} · {x.category}</Rule>
                  <Meta>{x.date} · {recipientSay(x.recipientRef)} · {x.wallet} wallet</Meta>
                </div>
                <Badge tone="error">unapproved</Badge>
              </div>
            </Card>
          ))}
        </>
      ) : (
        all.length === 0 && <Empty>Every onchain movement has a matching approval.</Empty>
      )}

      <Card tone="note">
        <Meta>
          This screen shows information the app could not have had without reading the chain. That
          is what makes the integration load-bearing rather than decorative — and it is why the
          screen is mandatory in the demo.
        </Meta>
      </Card>
    </Page>
  );
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-text-quaternary mt-[26px] mb-[9px] text-[12px] font-semibold uppercase tracking-[0.8px]">
    {children}
  </h2>
);
