'use client';

import { type DecisionEvent, HOUSE, money, RECIPIENTS, recipientSay } from '@unwritten/fixtures';
import { Badge, Card, Empty, Kpi, Meta, Page, Rule } from '@/components/primitives';
import { type Reconciled, sui, txUrl, useChain } from '@/lib/chain';
import { useHouse } from '@/lib/state';
import { Gate, ROLES } from '@/components/gate';

/* The balance is read from the chain through Tatum — see `/api/chain`. Only the nudge threshold
   and the top-up week are ours, because they are policy and seeding, not facts about money. */
const TREASURY = { lastTopUpWeek: 5, lowThresholdMist: 500_000_000n };

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

  /* The nudge fires off the real balance. A read that nothing branches on is decoration. */
  const low = chain?.balanceMist !== undefined
    && BigInt(chain.balanceMist) < TREASURY.lowThresholdMist;

  return (
    <Page
      title="Reality check"
      lede="Money moves whether or not anyone agreed to it. This is the difference, and it is the only thing here neither the chain nor the memory could tell you alone."
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
                      ? `agreed to, in ${r.approvalId}`
                      : 'this one left the wallet without anybody saying yes'}
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
        ['House balance', chain?.balanceMist ? sui(Number(chain.balanceMist)) : '—',
          low ? 'text-text-warning-primary' : undefined],
        ['Last top-up', `wk ${TREASURY.lastTopUpWeek}`],
        ['Decisions recorded', String(decisionsUpTo.length)],
        ['Unaccounted', money(unaccounted), unaccounted ? 'text-text-error-primary' : undefined],
      ]} />

      {unknown.length > 0 && (
        <Card>
          <div className="flex items-start justify-between gap-3.5">
            <div>
              <Rule>
                {unknown.length} charge{unknown.length === 1 ? '' : 's'} nobody has named yet
              </Rule>
              <Meta>
                Tell us what they are once and we stop asking. Until then they stay flagged — we
                would rather bother you than quietly wave something through.
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
              <Meta>
                {x.date}. Nobody approved it because nobody is ever asked — which is exactly how a
                price goes up for a year without anyone noticing.
              </Meta>
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
                Under your {money(HOUSE.policy.bothFloorCents)} floor, so no rule about amounts
                would ever have seen it. Only the fact that it happened on the wrong day.
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
                    Each part sits under your {money(HOUSE.policy.bothFloorCents)} floor and the
                    total does not. Worth a conversation rather than an accusation — splitting a
                    shop across two taps is also just what people do.
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
          Everything above came from comparing two things that disagree. The chain knows money
          left and nothing about whether anyone agreed; the memory knows what was agreed and
          nothing about whether it happened.
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
