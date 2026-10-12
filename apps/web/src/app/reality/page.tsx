'use client';

import { type DecisionEvent, HOUSE, money, RECIPIENTS, recipientSay } from '@unwritten/fixtures';
import { Badge, Card, Empty, Kpi, Meta, Page, Rule } from '@/components/primitives';
import { type Reconciled, sui, txUrl, useChain } from '@/lib/chain';
import { useHouse } from '@/lib/state';
import { Gate, ROLES } from '@/components/gate';

const TREASURY = { balanceCents: 41200, lastTopUpWeek: 5, lowThresholdCents: 5000 };

function RealityInner() {
  const { spendUpTo, decisionsUpTo } = useHouse();
  const { chain, loading: chainLoading } = useChain();
  const orphans: Reconciled[] = (chain?.reconciled ?? []).filter((r) => !r.approvalId);
  const all = spendUpTo.filter((x) => !x.hasApproval);

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
  const groups = new Map<string, DecisionEvent[]>();
  for (const d of decisionsUpTo) {
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
      {/* The chain half. Neither source answers this alone: the chain knows money left and nothing
          about agreement, the memory knows what was agreed and nothing about whether it happened.
          Every row below was produced by comparing them. */}
      <H>What actually moved · read from Sui through Tatum</H>
      {chainLoading && <Meta>reading the house wallet…</Meta>}
      {chain?.error && <Card><Meta>The chain is quiet right now: {chain.error}</Meta></Card>}
      {chain && !chain.error && (
        <>
          <Kpi items={[
            ['Transfers onchain', String(chain.transfers)],
            ['Decisions in memory', String(chain.decisions)],
            ['With no approval', String(orphans.length),
              orphans.length ? 'text-text-error-primary' : undefined],
          ]} />
          {chain.reconciled.map((r) => (
            <Card key={r.digest}>
              <div className="flex items-start justify-between gap-3.5">
                <div>
                  <Rule>{sui(r.mist)} · {r.category}</Rule>
                  <Meta>
                    {r.date} ·{' '}
                    {r.approvalId
                      ? `matched to ${r.approvalId}`
                      : 'nobody agreed to this — it exists in neither source alone'}
                  </Meta>
                  <a href={txUrl(r.digest)} target="_blank" rel="noreferrer"
                    className="text-text-brand-primary font-mono text-[10.5px] break-all underline decoration-dotted underline-offset-2">
                    {r.digest} ↗
                  </a>
                </div>
                <Badge tone={r.approvalId ? 'success' : 'error'}>
                  {r.approvalId ? 'reconciled' : 'unapproved'}
                </Badge>
              </div>
            </Card>
          ))}
          {chain.transfers === 0 && (
            <Empty>Nothing has left the house wallet yet.</Empty>
          )}
        </>
      )}

      <H>What the memory knows</H>
      <Kpi items={[
        ['House balance', money(TREASURY.balanceCents)],
        ['Last top-up', `wk ${TREASURY.lastTopUpWeek}`],
        ['Decisions recorded', String(decisionsUpTo.length)],
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

export default function Reality() {
  return (
    <Gate allow={[...ROLES.householdAdults]}>
      <RealityInner />
    </Gate>
  );
}
