'use client';

import { money } from '@unwritten/fixtures';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, Card, Meta, Page, Progress, Rule } from '@/components/primitives';

/* The sandbox is the product's six-week arc compressed into a minute. It is a STAGE MACHINE, not
   a page that accumulates: each stage replaces the last, so the payoff lands alone instead of
   competing with receipts, a quorum block and an explainer stacked beneath it.
 *
 * One knob differs from production — a rule forms after three decisions instead of eight. The
 * screen says so, which also shows the thresholds are configuration rather than constants. */
type Stage = 'cast' | 'number' | 'deciding' | 'payoff' | 'quorum' | 'receipts';

const MIN_EVIDENCE = 3;
const CHOICES = [1000, 1800, 2500] as const;

const POOL = [
  { from: 'Carol', what: 'the weekly shop', category: 'groceries', mult: [1.7, 2.1] },
  { from: 'Carol', what: 'school supplies', category: 'household', mult: [1.5, 1.9] },
  { from: 'Carol', what: 'the dog ran out of food', category: 'pets', mult: [1.6, 2.0] },
  { from: 'Sam', what: 'topping up the pantry', category: 'groceries', mult: [1.8, 2.3] },
  { from: 'Sam', what: 'light bulbs and batteries', category: 'household', mult: [1.4, 1.8] },
  { from: 'routine', what: 'Friday night, like every week', category: 'fastfood', mult: [1.6, 2.2] },
] as const;

const CAST = [
  ['Carol', 'your partner — does most of the shopping, approves nothing'],
  ['Sam', 'the other adult who can approve. Above a certain amount you need both of you'],
  ['your routines', 'the house itself. Friday pizza happens whether anyone asks or not'],
] as const;

type Request = { from: string; what: string; category: string; cents: number };
type Decision = Request & { blobId: string };

/* Bounded on purpose: the amount is a multiple of the number the visitor chose, so every request
   sits above their cap. A request below it would need no approval and the arc would collapse.
   One of the three is always the routine — the only moment the house acts without being asked. */
function drawRequests(cap: number): Request[] {
  const round = (n: number) => Math.round(n / 50) * 50;
  const pick = (c: (typeof POOL)[number]): Request => ({
    from: c.from, what: c.what, category: c.category,
    cents: round(cap * (c.mult[0] + Math.random() * (c.mult[1] - c.mult[0]))),
  });
  const routine = POOL.find((c) => c.from === 'routine')!;
  const people = POOL.filter((c) => c.from !== 'routine').sort(() => Math.random() - 0.5).slice(0, 2);
  return [...people, routine].sort(() => Math.random() - 0.5).map(pick);
}

const STEPS: Array<[Stage, string]> = [
  ['cast', 'Your house'], ['number', 'Your number'], ['deciding', 'Decisions'],
  ['payoff', 'The rule'], ['quorum', 'The limit'], ['receipts', 'Proof'],
];

export default function Try() {
  const [stage, setStage] = useState<Stage>('cast');
  const [cap, setCap] = useState(0);
  const [queue, setQueue] = useState<Request[]>([]);
  const [taken, setTaken] = useState<Decision[]>([]);
  const [session] = useState(() => Math.random().toString(36).slice(2, 8));

  const threshold = taken.length ? Math.max(...taken.map((d) => d.cents)) : 0;
  const next = queue[taken.length];
  const bothSignature = Math.round((cap * 7.5) / 50) * 50;

  const approve = () => {
    if (!next) return;
    const after = [...taken, { ...next, blobId: `0x${Math.random().toString(16).slice(2, 10)}…sand` }];
    setTaken(after);
    if (after.length >= MIN_EVIDENCE) setStage('payoff');
  };

  return (
    <Page title="Try it yourself" lede={LEDE[stage](cap)}>
      <Steps stage={stage} />

      {stage === 'cast' && (
        <Card>
          <Rule>Who lives with you?</Rule>
          <Meta>An agreement is between people, so the sandbox needs a few. Imagine these are yours:</Meta>
          <div className="mt-3 space-y-2.5">
            {CAST.map(([who, what]) => (
              <div key={who} className="flex gap-2.5">
                <span className="text-text-primary w-[108px] shrink-0 text-[13.5px] font-medium">{who}</span>
                <span className="text-text-tertiary text-[13px]">{what}</span>
              </div>
            ))}
          </div>
          <Btn onClick={() => setStage('number')}>That&apos;s my house</Btn>
        </Card>
      )}

      {stage === 'number' && (
        <Card>
          <Rule>How much can one person spend without asking?</Rule>
          <Meta>
            This is the only thing setup ever asks. Pick whichever feels right — you are meant to
            get it wrong, because the whole product is the app coming back later to correct you.
          </Meta>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {CHOICES.map((c) => (
              <Btn key={c} inline onClick={() => { setCap(c); setQueue(drawRequests(c)); setStage('deciding'); }}>
                {money(c)}
              </Btn>
            ))}
          </div>
        </Card>
      )}

      {stage === 'deciding' && next && (
        <Card>
          <Rule>
            {next.from === 'routine'
              ? `Nobody asked for this — ${money(next.cents)} · ${next.category}`
              : `${next.from} needs ${money(next.cents)} · ${next.category}`}
          </Rule>
          <Meta>
            {next.from === 'routine'
              ? `${next.what}. The house generated this on its own, which is the other half of why an agreement matters.`
              : next.what}
            . Above your {money(cap)}, so you are asked.
          </Meta>
          <Btn onClick={approve}>Approve {money(next.cents)}</Btn>
          <div className="text-text-quaternary mt-3 font-mono text-[11.5px]">
            {taken.length} of {MIN_EVIDENCE} · nothing is derived until there is enough evidence
          </div>
        </Card>
      )}

      {/* the payoff, alone on the screen. It only means something next to the number they chose. */}
      {stage === 'payoff' && (
        <>
          <Card tone="note">
            <p className="text-text-primary mb-2.5 text-[26px] leading-tight font-semibold">
              You said {money(cap)}.
              <br />
              It is actually {money(threshold)}.
            </p>
            <Meta>
              Every one went through without discussion. In the Wilson house this arrives in week
              five, and the app proposes making it a rule — a band nobody ever configured.
            </Meta>
          </Card>
          <Card>
            <div className="flex items-start justify-between gap-3.5">
              <Rule>You approve alone up to {money(threshold)} · {taken.length} of {taken.length}</Rule>
              <Badge tone="brand">observed</Badge>
            </div>
            <Meta>value_band · {taken.length} events · written to Walrus Mainnet</Meta>
            <Progress value={0.78} />
          </Card>
          <Btn onClick={() => setStage('quorum')}>One more thing →</Btn>
        </>
      )}

      {/* quorum, taught by hitting its limit rather than by simulating a second person */}
      {stage === 'quorum' && (
        <QuorumStep cents={bothSignature} onDone={() => setStage('receipts')} />
      )}

      {stage === 'receipts' && (
        <>
          {taken.map((d, i) => (
            <Card key={d.blobId}>
              <Meta>
                decision {i + 1} · {money(d.cents)} ·{' '}
                {d.from === 'routine' ? 'raised by a routine' : `from ${d.from}`} · approved by you
              </Meta>
              <div className="text-text-brand-primary font-mono text-[10.5px] break-all">{d.blobId}</div>
            </Card>
          ))}
          <Card>
            <Meta>belief · value_band · scoped to this session</Meta>
            <div className="text-text-brand-primary font-mono text-[10.5px] break-all">0x{session}belief…sand</div>
          </Card>
          <Meta>
            These are yours, in <code>sandbox-{session}</code>.{' '}
            <Link href="/proof" className="text-text-brand-primary">Verify them on the proof page →</Link>
          </Meta>

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

          <Meta>
            The sandbox forms a rule after {MIN_EVIDENCE} decisions instead of 8, so you do not have
            to tap all day. Everything else is the production path — same function, same schema,
            same network.
          </Meta>
        </>
      )}
    </Page>
  );
}

const LEDE: Record<Stage, (cap: number) => string> = {
  cast: () => 'A house, one number, and a rule about you — written to Walrus Mainnet, never into the Wilson house.',
  number: () => 'Three people in. One question to go.',
  deciding: (c) => `You said ${money(c)}. Now approve what comes in and see whether that was true.`,
  payoff: () => 'Nobody wrote this rule. It came out of what you just did.',
  quorum: () => 'One thing a single signature cannot do.',
  receipts: () => 'Four real memories, yours, on Mainnet.',
};

function Steps({ stage }: { stage: Stage }) {
  const at = STEPS.findIndex(([s]) => s === stage);
  return (
    <div className="mb-6 flex flex-wrap gap-x-2 gap-y-1">
      {STEPS.map(([s, label], i) => (
        <span
          key={s}
          className={`font-mono text-[11px] ${
            i < at ? 'text-text-quaternary' : i === at ? 'text-text-brand-primary' : 'text-text-disabled'
          }`}
        >
          {label}
          {i < STEPS.length - 1 && <span className="text-text-disabled ml-2">·</span>}
        </span>
      ))}
    </div>
  );
}

function QuorumStep({ cents, onDone }: { cents: number; onDone: () => void }) {
  const [blocked, setBlocked] = useState(false);
  if (!blocked) {
    return (
      <Card>
        <Rule>Carol needs {money(cents)} · household</Rule>
        <Meta>This one is in a different band. Try it.</Meta>
        <Btn onClick={() => setBlocked(true)}>Approve {money(cents)}</Btn>
      </Card>
    );
  }
  return (
    <>
      <Card tone="alert">
        <Rule>This needs Sam too, and Sam is not here.</Rule>
        <Meta>
          Above a certain amount one signature is not enough. The request is held, not refused, and
          nothing is bought — &ldquo;nothing is ever purchased without approval&rdquo; is an
          invariant rather than a setting. In a real house Sam gets a notification, and if he goes
          quiet it escalates to one person who can close it alone.
        </Meta>
      </Card>
      <Btn onClick={onDone}>See what you wrote →</Btn>
    </>
  );
}

function Btn({ children, onClick, inline }: { children: React.ReactNode; onClick: () => void; inline?: boolean }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`bg-bg-brand-solid hover:bg-bg-brand-solid-hover text-text-primary-on-brand w-full rounded-lg px-3.5 py-3 text-[14px] font-semibold sm:w-auto sm:py-2 sm:text-[13px] ${inline ? '' : 'mt-3'}`}
    >
      {children}
    </button>
  );
}
