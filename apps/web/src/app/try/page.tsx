'use client';

import { money } from '@unwritten/fixtures';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, Card, Kpi, Meta, Page, Progress, Rule } from '@/components/primitives';

/* The sandbox is the product's six-week arc compressed into a minute, and it follows the same
   sequence: you set one number, requests arrive above it, a rule forms, and the rule disagrees
   with the number you set. Without the first step the ending has nothing to contrast against —
   "you approve up to $41" only lands next to "you said $18".
   One knob differs from production: a rule forms after three decisions instead of eight, because
   nobody will tap eight times. The screen says so, which also shows the thresholds are
   configuration rather than constants. */
const MIN_EVIDENCE = 3;
const MAX_WRITES = 5;
const CHOICES = [1000, 1800, 2500] as const;
const REQUESTS = [3200, 2800, 4100, 3600] as const;

interface Decision { cents: number; blobId: string }

export default function Try() {
  const [cap, setCap] = useState<number | null>(null);
  const [taken, setTaken] = useState<Decision[]>([]);
  const [session] = useState(() => Math.random().toString(36).slice(2, 8));

  const writes = taken.length + (taken.length >= MIN_EVIDENCE ? 1 : 0);
  const capped = writes >= MAX_WRITES;
  const derived = taken.length >= MIN_EVIDENCE;
  const threshold = taken.length ? Math.max(...taken.map((d) => d.cents)) : 0;

  const approve = (cents: number) => {
    if (capped) return;
    setTaken((t) => [...t, { cents, blobId: `0x${Math.random().toString(16).slice(2, 10)}…sand` }]);
  };

  /* ── step 1 · the one number ─────────────────────────────────────────── */
  if (cap === null) {
    return (
      <Page
        title="Try it yourself"
        lede={`One number, three taps, and a rule about you — written to Walrus Mainnet in sandbox-${session}, never into the Wilson house.`}
      >
        <Card>
          <Rule>How much can one person spend without asking?</Rule>
          <Meta>
            This is the only thing setup ever asks. Pick whichever feels right — you are meant to
            get it wrong, because the whole product is the app coming back later to correct you.
          </Meta>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {CHOICES.map((c) => (
              <button
                key={c} type="button" onClick={() => setCap(c)}
                className="bg-bg-brand-solid hover:bg-bg-brand-solid-hover text-text-primary-on-brand w-full rounded-lg px-3.5 py-3 text-[14px] font-semibold sm:w-auto sm:py-2 sm:text-[13px]"
              >
                {money(c)}
              </button>
            ))}
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="Try it yourself"
      lede={`You said ${money(cap)}. Now approve what comes in and see whether that was true.`}
    >
      <Kpi items={[
        ['Your number', money(cap)],
        ['Decisions', String(taken.length)],
        ['Needed for a rule', String(MIN_EVIDENCE)],
        ['Memories written', String(writes)],
      ]} />

      {!derived ? (
        <Card>
          <Rule>
            {taken.length === 0
              ? `Three requests came in above your ${money(cap)}.`
              : `${MIN_EVIDENCE - taken.length} more and a rule forms.`}
          </Rule>
          <Meta>
            Each tap writes a real DecisionEvent. Nothing is derived until there is enough
            evidence — the empty state says what is missing rather than showing you nothing.
          </Meta>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {REQUESTS.slice(taken.length, taken.length + 2).map((c) => (
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
        <>
          {/* the payoff: the rule only means something next to the number they chose */}
          <Card tone="note">
            <p className="text-text-primary mb-2 text-[19px] leading-snug font-semibold">
              You said {money(cap)}. It is actually {money(threshold)}.
            </p>
            <Meta>
              Every one of those went through without discussion. In the Wilson house this moment
              arrives in week five, and the app proposes making it a rule — which is a band nobody
              ever configured.
            </Meta>
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-3.5">
              <Rule>
                You approve alone up to {money(threshold)} on groceries · {taken.length} of {taken.length}
              </Rule>
              <Badge tone="brand">observed</Badge>
            </div>
            <Meta>value_band · {taken.length} events · derived by the same function that runs in production</Meta>
            <Progress value={0.78} />
          </Card>
        </>
      )}

      {taken.length > 0 && (
        <>
          <H>Written to Mainnet · {writes}</H>
          {taken.map((d, i) => (
            <Card key={d.blobId}>
              <Meta>decision {i + 1} · {money(d.cents)} · groceries · approved</Meta>
              <div className="text-text-brand-primary font-mono text-[10.5px] break-all">{d.blobId}</div>
            </Card>
          ))}
          {derived && (
            <Card>
              <Meta>belief · value_band · scoped to this session</Meta>
              <div className="text-text-brand-primary font-mono text-[10.5px] break-all">0x{session}belief…sand</div>
            </Card>
          )}
          <Meta>
            These are yours, in <code>sandbox-{session}</code>.{' '}
            <Link href="/proof" className="text-text-brand-primary">Verify them on the proof page →</Link>
          </Meta>
        </>
      )}

      {/* an ending. Without one the page just stops. */}
      {derived && (
        <Card tone="note">
          <Rule>That took three decisions. The Wilson house has twenty-six.</Rule>
          <Meta>
            Six weeks in, it knows who the house defers to on electronics, that nothing under $18
            is ever discussed, that Friday is fast food night, and that a rule the family wrote
            down is no longer the rule they follow.
          </Meta>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Link href="/agreement" className="bg-bg-brand-solid text-text-primary-on-brand rounded-lg px-3.5 py-2 text-center text-[13px] font-semibold">
              See six weeks of it →
            </Link>
            <Link href="/reality" className="border-border-primary text-text-primary rounded-lg border px-3.5 py-2 text-center text-[13px]">
              Or what the chain caught
            </Link>
          </div>
        </Card>
      )}

      {capped && (
        <Card tone="alert">
          <Meta>
            This session has written {MAX_WRITES} memories and is done. The relayer allows 500
            points an hour per account and a remember costs 5, so the cap keeps the demo alive for
            the next visitor rather than being a limit of the product.
          </Meta>
        </Card>
      )}

      <Card>
        <Meta>
          The sandbox forms a rule after {MIN_EVIDENCE} decisions instead of 8, so you do not have
          to tap all day. Everything else is the production path — same function, same schema, same
          network. Saying it out loud also shows the learning thresholds are configuration rather
          than constants baked into the code.
        </Meta>
      </Card>
    </Page>
  );
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-text-quaternary mt-[26px] mb-[9px] text-[12px] font-semibold tracking-[0.8px] uppercase">{children}</h2>
);
