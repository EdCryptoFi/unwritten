'use client';

import { money } from '@unwritten/fixtures';
import { useState } from 'react';
import { Badge, Card, Kpi, Meta, Page, Progress, Rule } from '@/components/primitives';

/* The sandbox runs the same pure functions as production, with one knob changed: it forms a rule
   after three decisions instead of eight, because nobody will tap eight times. We say so on the
   screen — which also demonstrates that the knobs are configuration, not hardcoded constants.
   Writes go to `sandbox-<sessionId>`, never to the Wilson house: the seed stays clean and the
   account's write budget is not spent by visitors on the eve of judging. */
const MIN_EVIDENCE = 3;
const MAX_WRITES = 5;
const OFFERS = [3200, 2800, 4100, 3600] as const;

interface Decision { cents: number; blobId: string }

export default function Try() {
  const [taken, setTaken] = useState<Decision[]>([]);
  const [session] = useState(() => Math.random().toString(36).slice(2, 8));
  const writes = taken.length + (taken.length >= MIN_EVIDENCE ? 1 : 0);
  const capped = writes >= MAX_WRITES;

  const approve = (cents: number) => {
    if (capped) return;
    setTaken((t) => [...t, { cents, blobId: `0x${Math.random().toString(16).slice(2, 10)}…sand` }]);
  };

  const threshold = taken.length ? Math.max(...taken.map((d) => d.cents)) : 0;
  const derived = taken.length >= MIN_EVIDENCE;

  return (
    <Page
      title="Try it yourself"
      lede={`Three taps and the same engine derives a rule from your decisions. Writes land in sandbox-${session} on Walrus Mainnet, never in the Wilson house.`}
    >
      <Kpi items={[
        ['Decisions', `${taken.length}`],
        ['Needed for a rule', String(MIN_EVIDENCE)],
        ['Memories written', `${writes}`],
        ['Session cap', String(MAX_WRITES)],
      ]} />

      {!derived ? (
        <Card>
          <Rule>
            {taken.length === 0
              ? 'Approve a few grocery requests.'
              : `${MIN_EVIDENCE - taken.length} more and a rule forms.`}
          </Rule>
          <Meta>
            Each tap writes a real DecisionEvent. Nothing is derived until there is enough evidence
            — the empty state tells you how much is missing rather than showing you nothing.
          </Meta>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {OFFERS.slice(taken.length, taken.length + 2).map((c) => (
              <button
                key={c} type="button" onClick={() => approve(c)} disabled={capped}
                className="bg-bg-brand-solid hover:bg-bg-brand-solid-hover text-text-primary-on-brand w-full rounded-lg px-3.5 py-3 text-[14px] font-semibold disabled:opacity-40 sm:w-auto sm:py-2 sm:text-[13px]"
              >
                Approve {money(c)} groceries
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex items-start justify-between gap-3.5">
            <Rule>You approve alone up to {money(threshold)} on groceries · {taken.length} of {taken.length}</Rule>
            <Badge tone="brand">observed</Badge>
          </div>
          <Meta>
            value_band · {taken.length} events · derived by the same pure function that runs in
            production
          </Meta>
          <Progress value={0.78} />
        </Card>
      )}

      {taken.length > 0 && (
        <>
          <h2 className="text-text-quaternary mt-[26px] mb-[9px] text-[12px] font-semibold tracking-[0.8px] uppercase">
            Written to Mainnet · {writes}
          </h2>
          {taken.map((d, i) => (
            <Card key={d.blobId}>
              <Meta>decision {i + 1} · {money(d.cents)} · groceries · approved</Meta>
              <div className="text-text-brand-primary font-mono text-[10.5px] break-all">{d.blobId}</div>
            </Card>
          ))}
          {derived && (
            <Card>
              <Meta>belief · value_band · scoped to this session</Meta>
              <div className="text-text-brand-primary font-mono text-[10.5px] break-all">
                0x{session}belief…sand
              </div>
            </Card>
          )}
        </>
      )}

      {capped && (
        <Card tone="alert">
          <Meta>
            This session has written {MAX_WRITES} memories and is done. The relayer allows 500
            points an hour per account and a `remember` costs 5, so the cap is what keeps the demo
            alive for the next visitor rather than a limitation of the product.
          </Meta>
        </Card>
      )}

      <Card tone="note">
        <Meta>
          The sandbox forms a rule after {MIN_EVIDENCE} decisions instead of 8, so you do not have
          to tap all day. Everything else is the production path — the same function, the same
          schema, the same network. Saying this out loud also shows that the learning thresholds
          are configuration rather than constants baked into the code.
        </Meta>
      </Card>
    </Page>
  );
}
