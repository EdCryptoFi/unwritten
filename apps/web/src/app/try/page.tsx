'use client';

import { money } from '@unwritten/fixtures';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, Card, Kpi, Meta, Page, Progress, Rule } from '@/components/primitives';

/* The sandbox is the product's six-week arc compressed into a minute, and it keeps the same
   sequence: a house, one number, requests above it, a rule, and the rule disagreeing with the
   number you set.
 *
 * A household needs other people in it, but making the visitor role-play three members costs nine
 * taps and leaves them confused, while auto-approving on their behalf is magic. So the other two
 * members are present as REQUESTERS, and quorum is taught by hitting its limit rather than by
 * simulating someone: the last request needs a second signature and that person is not here.
 *
 * One knob differs from production — a rule forms after three decisions instead of eight. The
 * screen says so, which also shows the thresholds are configuration rather than constants. */
const MIN_EVIDENCE = 3;
const MAX_WRITES = 5;
const CHOICES = [1000, 1800, 2500] as const;
const QUEUE = [
  { from: 'Carol', cents: 3200 },
  { from: 'Sam', cents: 2800 },
  { from: 'Carol', cents: 4100 },
] as const;
const BOTH_SIGNATURE = { from: 'Carol', cents: 13900 };

interface Decision { from: string; cents: number; blobId: string }

export default function Try() {
  const [house, setHouse] = useState(false);
  const [cap, setCap] = useState<number | null>(null);
  const [taken, setTaken] = useState<Decision[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [session] = useState(() => Math.random().toString(36).slice(2, 8));

  const writes = taken.length + (taken.length >= MIN_EVIDENCE ? 1 : 0);
  const capped = writes >= MAX_WRITES;
  const derived = taken.length >= MIN_EVIDENCE;
  const threshold = taken.length ? Math.max(...taken.map((d) => d.cents)) : 0;
  const next = QUEUE[taken.length];

  /* ── step 1 · a household ────────────────────────────────────────────── */
  if (!house) {
    return (
      <Page
        title="Try it yourself"
        lede={`A house, one number, and a rule about you — written to Walrus Mainnet in sandbox-${session}, never into the Wilson house.`}
      >
        <Card>
          <Rule>Who lives with you?</Rule>
          <Meta>
            An agreement is between people, so the sandbox needs at least two of them. Carol spends
            and Sam approves — the same shape as a real household.
          </Meta>
          <Btn onClick={() => setHouse(true)}>Add Carol and Sam</Btn>
        </Card>
      </Page>
    );
  }

  /* ── step 2 · the one number ─────────────────────────────────────────── */
  if (cap === null) {
    return (
      <Page title="Try it yourself" lede="Two people in, one question to go.">
        <Card>
          <Rule>How much can one person spend without asking?</Rule>
          <Meta>
            This is the only thing setup ever asks. Pick whichever feels right — you are meant to
            get it wrong, because the whole product is the app coming back later to correct you.
          </Meta>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {CHOICES.map((c) => (
              <Btn key={c} onClick={() => setCap(c)}>{money(c)}</Btn>
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
        ['House', '3 people'],
        ['Decisions', String(taken.length)],
        ['Memories written', String(writes)],
      ]} />

      {!derived && next && (
        <Card>
          <Rule>{next.from} is asking for {money(next.cents)} · groceries</Rule>
          <Meta>
            Above your {money(cap)}, so you are asked.{' '}
            {taken.length === 0
              ? 'Nothing is derived until there is enough evidence.'
              : `${MIN_EVIDENCE - taken.length} more and a rule forms.`}
          </Meta>
          <Btn
            onClick={() => !capped && setTaken((t) => [...t, {
              from: next.from, cents: next.cents,
              blobId: `0x${Math.random().toString(16).slice(2, 10)}…sand`,
            }])}
          >
            Approve {money(next.cents)}
          </Btn>
        </Card>
      )}

      {derived && (
        <>
          {/* the payoff: the rule only means something next to the number they chose */}
          <Card tone="note">
            <p className="text-text-primary mb-2 text-[19px] leading-snug font-semibold">
              You said {money(cap)}. It is actually {money(threshold)}.
            </p>
            <Meta>
              Every one went through without discussion. In the Wilson house this arrives in week
              five, and the app proposes making it a rule — a band nobody ever configured.
            </Meta>
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-3.5">
              <Rule>You approve alone up to {money(threshold)} on groceries · {taken.length} of {taken.length}</Rule>
              <Badge tone="brand">observed</Badge>
            </div>
            <Meta>value_band · {taken.length} events · derived by the same function that runs in production</Meta>
            <Progress value={0.78} />
          </Card>

          {/* quorum, taught by hitting its limit rather than by simulating a second person */}
          {!blocked ? (
            <Card>
              <Rule>{BOTH_SIGNATURE.from} is asking for {money(BOTH_SIGNATURE.cents)} · household</Rule>
              <Meta>This one is in a different band. Try it.</Meta>
              <Btn onClick={() => setBlocked(true)}>Approve {money(BOTH_SIGNATURE.cents)}</Btn>
            </Card>
          ) : (
            <Card tone="alert">
              <Rule>This needs Sam too, and Sam is not here.</Rule>
              <Meta>
                Above a certain amount one signature is not enough. The request is held, not
                refused, and nothing is bought — &ldquo;nothing is ever purchased without
                approval&rdquo; is an invariant rather than a setting. In a real house Sam gets a
                notification, and if he goes quiet the request escalates to one person who can
                close it alone.
              </Meta>
            </Card>
          )}
        </>
      )}

      {taken.length > 0 && (
        <>
          <H>Written to Mainnet · {writes}</H>
          {taken.map((d, i) => (
            <Card key={d.blobId}>
              <Meta>decision {i + 1} · {money(d.cents)} · from {d.from} · approved by you</Meta>
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

      {blocked && (
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

      <Card>
        <Meta>
          The sandbox forms a rule after {MIN_EVIDENCE} decisions instead of 8, so you do not have
          to tap all day, and it caps at {MAX_WRITES} writes so one visitor cannot exhaust the
          account&apos;s hourly budget. Everything else is the production path — same function,
          same schema, same network.
        </Meta>
      </Card>
    </Page>
  );
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-text-quaternary mt-[26px] mb-[9px] text-[12px] font-semibold tracking-[0.8px] uppercase">{children}</h2>
);

function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className="bg-bg-brand-solid hover:bg-bg-brand-solid-hover text-text-primary-on-brand mt-3 w-full rounded-lg px-3.5 py-3 text-[14px] font-semibold sm:mt-3 sm:w-auto sm:py-2 sm:text-[13px]"
    >
      {children}
    </button>
  );
}
