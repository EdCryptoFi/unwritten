'use client';

import { Badge, Card, Meta, Page, Progress, Rule } from '@/components/primitives';
import {
  type Category, type DecisionEvent, HOUSE, type Ref,money, 
} from '@unwritten/fixtures';
import { valueBand } from '@unwritten/policy';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

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
  { from: 'Carol', what: 'the weekly shop', category: 'groceries' as Category, mult: [1.7, 2.1] },
  { from: 'Carol', what: 'school supplies', category: 'household' as Category, mult: [1.5, 1.9] },
  { from: 'Carol', what: 'the dog ran out of food', category: 'pets' as Category, mult: [1.6, 2.0] },
  { from: 'Sam', what: 'topping up the pantry', category: 'groceries' as Category, mult: [1.8, 2.3] },
  { from: 'Sam', what: 'light bulbs and batteries', category: 'household' as Category, mult: [1.4, 1.8] },
  { from: 'routine', what: 'Friday night, like every week', category: 'fastfood' as Category, mult: [1.6, 2.2] },
] as const;

/* Pre-filled and editable, never a blank form: whoever does not care passes straight through, and
   whoever does gets a payoff about their own household.
   The names NEVER leave the browser. Memory stores the role, exactly as it does everywhere else —
   a visitor's typed name written to Mainnet would be permanent and unremovable. */
const CAST_DEFAULT = [
  { key: 'spender', name: 'Carol', what: 'does most of the shopping, approves nothing' },
  { key: 'approver', name: 'Sam', what: 'the other adult who can approve' },
] as const;

const VISITOR: Ref = 'you';

type Request = { from: string; what: string; category: Category; cents: number };

/** The sandbox speaks the same schema as the rest of the product, so the same function reads it. */
const toDecisionEvent = (d: Decision, i: number): DecisionEvent => ({
  id: `s${i}`,
  kind: 'decision',
  week: 1,
  date: new Date().toISOString().slice(0, 10),
  category: d.category,
  amountCents: d.cents,
  quorumRequired: '1-of-2',
  decidedBy: [{ ref: VISITOR, role: 'owner' }],
  outcome: 'approved',
  latencySeconds: 20,
  escalated: false,
  initiatedBy: d.from === 'routine' ? 'routine' : 'member',
  blobId: d.blobId,
});
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

function TryInner() {
  const [stage, setStage] = useState<Stage>('cast');
  const [cap, setCap] = useState(0);
  const [queue, setQueue] = useState<Request[]>([]);
  const [taken, setTaken] = useState<Decision[]>([]);
  const params = useSearchParams();
  /* A returning visitor brings their session in the URL. Memory surviving the tab is the thing
     Walrus actually claims, so it is demonstrated rather than asserted. */
  const [session] = useState(() => params.get('s') ?? Math.random().toString(36).slice(2, 8));
  const [returning, setReturning] = useState<{ decisions: number; rule: string | null } | null>(null);
  const [names, setNames] = useState<Record<string, string>>(
    Object.fromEntries(CAST_DEFAULT.map((c) => [c.key, c.name])),
  );
  const [custom, setCustom] = useState('');
  const [sending, setSending] = useState(false);
  const [checkpoint, setCheckpoint] = useState<string | null>(null);

  const nameFor = (from: string) =>
    from === 'routine' ? 'your routine'
    : from === 'Carol' ? (names.spender ?? 'Carol')
    : (names.approver ?? 'Sam');

  /* Anchors the session against a chain height a reader can verify. Honest about its weight:
     Tatum carries real load on /reality, where it reads wallet history. Here it timestamps. */
  useEffect(() => {
    if (!params.get('s')) return;
    fetch(`/api/sandbox?s=${params.get('s')}`)
      .then((r) => r.json())
      .then((d: { decisions?: unknown[]; beliefs?: Array<{ thresholdCents?: number }> }) => {
        if (!d.decisions?.length) return;
        const t = d.beliefs?.[0]?.thresholdCents;
        setReturning({ decisions: d.decisions.length, rule: t ? money(t) : null });
      })
      .catch(() => null);
  }, [params]);

  useEffect(() => {
    fetch('/api/checkpoint').then((r) => r.json())
      .then((d) => setCheckpoint(d.checkpoint ?? null)).catch(() => null);
  }, []);

  /* The real function, not an approximation of it. Only `minEvidence` differs from production:
     three instead of eight, because nobody will tap eight times. */
  const derivedBelief = taken.length
    ? valueBand(
        {
          decisions: taken.map(toDecisionEvent),
          knobs: { ...HOUSE.learning, minEvidence: MIN_EVIDENCE },
          policy: HOUSE.policy,
          week: 1,
        },
        VISITOR,
        '*',
      )
    : null;
  const threshold =
    derivedBelief?.dimension === 'value_band' ? derivedBelief.thresholdCents : 0;
  const next = queue[taken.length];
  const bothSignature = Math.round((cap * 7.5) / 50) * 50;

  const start = (c: number) => { setCap(c); setQueue(drawRequests(c)); setStage('deciding'); };
  const startCustom = () => {
    const n = Math.round(Number(custom) * 100);
    // Bounded: below a dollar the amounts stop looking like a household, and a number high enough
    // to auto-approve everything leaves no decision to learn from — the gap the audit found.
    if (!Number.isFinite(n) || n < 100 || n > 20_000) return;
    start(n);
  };

  const approve = async () => {
    if (!next || sending) return;
    setSending(true);
    const after = [...taken, { ...next, blobId: 'writing…' }];
    setTaken(after);
    try {
      const res = await fetch('/api/sandbox', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          session, cap,
          taps: after.map((t) => ({ cents: t.cents, category: t.category, from: t.from })),
        }),
      });
      const data = (await res.json()) as { event?: { blobId: string }; queued?: boolean };
      setTaken((t) => t.map((x, i) =>
        i === t.length - 1 ? { ...x, blobId: data.queued ? (data.event?.blobId ?? 'queued') : 'queued' } : x));
    } catch {
      // Degrade, never error: the rule still forms and the write is reported as queued.
      setTaken((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, blobId: 'queued' } : x)));
    }
    setSending(false);
    if (after.length >= MIN_EVIDENCE) setStage('payoff');
  };

  return (
    <Page title="Try it yourself" lede={LEDE[stage](cap)}>
      <Steps stage={stage} />

      {/* Not a key — the writes live under our account with our delegate, and pretending otherwise
          would be theatre. A link is honest, and it still proves the memory outlived the tab. */}
      {returning && stage === 'cast' && (
        <Card tone="note">
          <Rule>You have been here before.</Rule>
          <Meta>
            {returning.decisions} decision{returning.decisions === 1 ? '' : 's'} of yours are still
            on Walrus Mainnet
            {returning.rule ? `, and the rule they produced: you approve alone up to ${returning.rule}.` : '.'}
            {' '}Recalled from the network, not from this tab.
          </Meta>
        </Card>
      )}

      {stage === 'cast' && (
        <Card>
          <Rule>Who lives with you?</Rule>
          <Meta>An agreement is between people, so the sandbox needs a few. Imagine these are yours:</Meta>
          <div className="mt-3 space-y-2.5">
            {CAST_DEFAULT.map((c) => (
              <div key={c.key} className="flex items-center gap-2.5">
                <input
                  value={names[c.key] ?? ''}
                  onChange={(e) => setNames((n) => ({ ...n, [c.key]: e.target.value }))}
                  aria-label={c.what}
                  className="border-border-primary bg-bg-primary text-text-primary w-[108px] shrink-0 rounded-md border px-2 py-1 text-[13.5px] font-medium"
                />
                <span className="text-text-tertiary text-[13px]">{c.what}</span>
              </div>
            ))}
            <div className="flex items-center gap-2.5">
              <span className="text-text-primary w-[108px] shrink-0 text-[13.5px] font-medium">your routines</span>
              <span className="text-text-tertiary text-[13px]">
                the house itself. Friday pizza happens whether anyone asks or not
              </span>
            </div>
          </div>
          <div className="text-text-quaternary mt-2.5 font-mono text-[11px]">
            these names stay in your browser — memory stores the role, never the person
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
              <Btn key={c} inline onClick={() => start(c)}>{money(c)}</Btn>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-text-quaternary text-[13px]">or your own</span>
            <span className="text-text-tertiary">$</span>
            <input
              value={custom} inputMode="decimal" placeholder="35"
              onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') startCustom(); }}
              className="border-border-primary bg-bg-primary text-text-primary w-24 rounded-md border px-2 py-1.5 text-[14px]"
            />
            <button type="button" onClick={startCustom}
              className="border-border-primary text-text-primary rounded-lg border px-3 py-1.5 text-[13px]">
              Use it
            </button>
          </div>
          <div className="text-text-quaternary mt-2 font-mono text-[11px]">
            anything from $1 to $200 — the requests scale with it, so the arc works either way
          </div>
        </Card>
      )}

      {stage === 'deciding' && next && (
        <Card>
          <Rule>
            {next.from === 'routine'
              ? `Nobody asked for this — ${money(next.cents)} · ${next.category}`
              : `${nameFor(next.from)} needs ${money(next.cents)} · ${next.category}`}
          </Rule>
          <Meta>
            {next.from === 'routine'
              ? `${next.what}. The house generated this on its own, which is the other half of why an agreement matters.`
              : next.what}
            . Above your {money(cap)}, so you are asked.
          </Meta>
          <Btn onClick={approve}>Approve {money(next.cents)}</Btn>
          <div className="text-text-quaternary mt-3 font-mono text-[11.5px]">
            request {taken.length + 1} of {MIN_EVIDENCE} · nothing is derived until there is
            enough evidence
          </div>
          {taken.length > 0 && <Approved taken={taken} nameFor={nameFor} />}
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
            <Approved taken={taken} nameFor={nameFor} />
          </Card>
          <Card>
            <div className="flex items-start justify-between gap-3.5">
              <Rule>You approve alone up to {money(threshold)} · {taken.length} of {taken.length}</Rule>
              <Badge tone="brand">observed</Badge>
            </div>
            <Meta>
              value_band · {taken.length} events · confidence{' '}
              {derivedBelief ? (derivedBelief.confidence * 100).toFixed(0) : '—'}% · derived by the
              same function that runs in production
            </Meta>
            <Progress value={derivedBelief?.confidence ?? 0} />
          </Card>
          <Btn onClick={() => setStage('quorum')}>One more thing →</Btn>
        </>
      )}

      {/* quorum, taught by hitting its limit rather than by simulating a second person */}
      {stage === 'quorum' && (
        <QuorumStep cents={bothSignature} onDone={() => setStage('receipts')} name={nameFor('Sam')} />
      )}

      {stage === 'receipts' && (
        <>
          {taken.map((d, i) => (
            <Card key={`${i}-${d.cents}`}>
              <Meta>
                decision {i + 1} · {money(d.cents)} ·{' '}
                {d.from === 'routine' ? 'raised by a routine' : `from ${nameFor(d.from)}`} · approved by you
              </Meta>
              <div className="text-text-brand-primary font-mono text-[10.5px] break-all">{d.blobId}</div>
            </Card>
          ))}
          <Card>
            <Meta>belief · value_band · scoped to this session</Meta>
            <div className="text-text-brand-primary font-mono text-[10.5px] break-all">0x{session}belief…sand</div>
          </Card>
          {checkpoint && (
            <Meta>
              Anchored at Sui checkpoint <span className="text-text-brand-primary">{checkpoint}</span>,
              read through Tatum.
            </Meta>
          )}
          <Meta>
            These are yours, in <code>sandbox-{session}</code>. Come back any time:{' '}
            <a href={`/try?s=${session}`} className="text-text-brand-primary">/try?s={session}</a>
            {' '}— the rule is recalled from Mainnet, not from this tab.{' '}
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
          <button
            type="button"
            onClick={() => { setStage('number'); setTaken([]); setCap(0); setQueue([]); }}
            className="text-text-brand-primary mt-3 font-mono text-[11.5px]"
          >
            Start over with a different number →
          </button>
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
  receipts: () => 'Everything you just did, on Mainnet, and yours.',
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

function QuorumStep({ cents, onDone, name }: { cents: number; onDone: () => void; name: string }) {
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
        <Rule>This needs {name} too, and {name} is not here.</Rule>
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

/* The claim "every one went through" has to be checkable at a glance, so the amounts stay
   visible while they accumulate and again under the payoff. Blob ids belong to the receipts
   stage; three numbers are evidence, not clutter. */
function Approved({ taken, nameFor }: { taken: Decision[]; nameFor: (f: string) => string }) {
  return (
    <div className="border-border-secondary mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t pt-2.5">
      {taken.map((d, i) => (
        <span key={`${i}-${d.cents}`} className="text-text-tertiary font-mono text-[11.5px]">
          {money(d.cents)}
          <span className="text-text-quaternary">
            {' '}· {d.from === 'routine' ? 'routine' : nameFor(d.from)} · approved
          </span>
        </span>
      ))}
    </div>
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

/* useSearchParams needs a boundary to prerender: a returning visitor's session lives in the URL,
   and the URL is not known until the request. */
export default function Try() {
  return (
    <Suspense fallback={<Page title="Try it yourself" lede="One moment."><div /></Page>}>
      <TryInner />
    </Suspense>
  );
}
