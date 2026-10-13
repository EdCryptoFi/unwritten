'use client';

import { CATEGORY_LABEL, CategoryIcon } from '@/components/category-icon';
import { Badge, Card, ClayAvatar, ClayButton, Meta, Page, Progress, Rule } from '@/components/primitives';
import { useHouse } from '@/lib/state';
import { type Category, type DecisionEvent, HOUSE, type Ref, money } from '@unwritten/fixtures';
import { valueBand } from '@unwritten/policy';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

/* The sandbox is the product's six-week arc compressed into a minute. It is a STAGE MACHINE, not
   a page that accumulates: each stage replaces the last, so the payoff lands alone instead of
   competing with receipts, a quorum block and an explainer stacked beneath it.
 *
 * Personal on three axes — the people, what the house spends on, and the one number — and every
 * one of them stays in the browser except what memory already stores everywhere else: a role, a
 * category, an amount. The server validates category and amount; names never reach it.
 *
 * One knob differs from production — a rule forms after three decisions instead of eight. The
 * screen says so, which also shows the thresholds are configuration rather than constants. */
type Stage = 'cast' | 'spend' | 'number' | 'deciding' | 'payoff' | 'quorum' | 'receipts';
type From = 'spender' | 'approver' | 'routine';

const MIN_EVIDENCE = 3;
const CHOICES = [1000, 1800, 2500] as const;

/* What a request sounds like, per category. `from` is a ROLE, so the visitor's names fill it in.
   `mult` bounds the amount as a multiple of the visitor's number: every request sits above it,
   or it would need no approval and the arc would collapse. */
const POOL: Record<Exclude<Category, 'unclassified'>, Array<{ from: From; what: string; mult: [number, number] }>> = {
  groceries: [
    { from: 'spender', what: 'the weekly shop', mult: [1.7, 2.1] },
    { from: 'approver', what: 'topping up the pantry', mult: [1.8, 2.3] },
  ],
  fastfood: [
    { from: 'routine', what: 'Friday night, like every week', mult: [1.6, 2.2] },
    { from: 'spender', what: 'takeaway after practice', mult: [1.4, 1.8] },
  ],
  games: [
    { from: 'spender', what: 'the game everyone at school has', mult: [1.6, 2.2] },
    { from: 'spender', what: 'an in-game top-up', mult: [1.2, 1.6] },
  ],
  subscriptions: [
    { from: 'routine', what: 'the streaming renewal', mult: [1.3, 1.6] },
    { from: 'approver', what: 'upgrading the music plan', mult: [1.3, 1.7] },
  ],
  pets: [
    { from: 'spender', what: 'the dog ran out of food', mult: [1.6, 2.0] },
    { from: 'approver', what: 'the vet co-pay', mult: [1.9, 2.4] },
  ],
  household: [
    { from: 'approver', what: 'light bulbs and batteries', mult: [1.4, 1.8] },
    { from: 'spender', what: 'school supplies', mult: [1.5, 1.9] },
  ],
};
const PICKABLE = Object.keys(POOL) as Array<keyof typeof POOL>;
const DEFAULT_CATS: Array<keyof typeof POOL> = ['groceries', 'fastfood', 'household'];

/* Pre-filled and editable, never a blank form: whoever does not care passes straight through, and
   whoever does gets a payoff about their own household.
   The names NEVER leave the browser. Memory stores the role, exactly as it does everywhere else —
   a visitor's typed name written to Mainnet would be permanent and unremovable. */
const CAST_DEFAULT = [
  { key: 'spender' as const, name: 'Carol', what: 'does most of the shopping, approves nothing', color: 'neutral' as const },
  { key: 'approver' as const, name: 'Sam', what: 'the other adult who can approve', color: 'secondary' as const },
];

const VISITOR: Ref = 'you';

type Request = { from: From; what: string; category: Category; cents: number };
type Decision = Request & { blobId: string };

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

/* Three requests from the categories the visitor picked. If any picked category has a routine,
   one of the three is it — the only moment the house acts without being asked. */
function drawRequests(cap: number, cats: Array<keyof typeof POOL>): Request[] {
  const round = (n: number) => Math.round(n / 50) * 50;
  const shuffle = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);
  const all = cats.flatMap((c) => POOL[c].map((p) => ({ ...p, category: c as Category })));
  const routine = shuffle(all.filter((p) => p.from === 'routine'))[0];
  const people = shuffle(all.filter((p) => p.from !== 'routine'));
  const chosen = routine ? [routine, ...people.slice(0, 2)] : people.slice(0, 3);
  // A single picked category with two entries still needs a third: repeat one with a new amount.
  while (chosen.length < 3 && all.length) chosen.push(shuffle(all)[0] as (typeof all)[number]);
  return shuffle(chosen).map((c) => ({
    from: c.from, what: c.what, category: c.category,
    cents: round(cap * (c.mult[0] + Math.random() * (c.mult[1] - c.mult[0]))),
  }));
}

const STEPS: Array<[Stage, string]> = [
  ['cast', 'Your people'], ['spend', 'What you buy'], ['number', 'Your number'],
  ['deciding', 'Decisions'], ['payoff', 'The rule'], ['quorum', 'The limit'], ['receipts', 'Proof'],
];

function TryInner() {
  const { decisions: houseDecisions } = useHouse();
  const [stage, setStage] = useState<Stage>('cast');
  const [cap, setCap] = useState(0);
  const [cats, setCats] = useState<Array<keyof typeof POOL>>(DEFAULT_CATS);
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

  const nameFor = (from: From) =>
    from === 'routine' ? 'your routine' : (names[from]?.trim() || (from === 'spender' ? 'Carol' : 'Sam'));
  const initial = (from: From) => (from === 'routine' ? '↻' : nameFor(from).charAt(0).toUpperCase() || '?');

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

  /* Anchors the session against a chain height a reader can verify. Honest about its weight:
     Tatum carries real load on /reality, where it reads wallet history. Here it timestamps. */
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
  const threshold = derivedBelief?.dimension === 'value_band' ? derivedBelief.thresholdCents : 0;
  const next = queue[taken.length];
  const bothSignature = Math.round((cap * 7.5) / 50) * 50;

  const start = (c: number) => { setCap(c); setQueue(drawRequests(c, cats)); setStage('deciding'); };
  const startCustom = () => {
    const n = Math.round(Number(custom) * 100);
    // Bounded: below a dollar the amounts stop looking like a household, and a number high enough
    // to auto-approve everything leaves no decision to learn from — the gap the audit found.
    if (!Number.isFinite(n) || n < 100 || n > 20_000) return;
    start(n);
  };
  const toggleCat = (c: keyof typeof POOL) =>
    setCats((xs) => (xs.includes(c) ? (xs.length > 1 ? xs.filter((x) => x !== c) : xs) : xs.length < 4 ? [...xs, c] : xs));

  const approve = async () => {
    if (!next || sending) return;
    setSending(true);
    const after = [...taken, { ...next, blobId: 'writing…' }];
    setTaken(after);
    try {
      const res = await fetch('/api/sandbox', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // `from` is the role key, never a typed name — the server uses it only to tell a routine
        // from a member, and it never reaches memory either way.
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

  /* For the payoff: which of their categories carried the rule, and who asked most. */
  const byCat = [...new Set(taken.map((t) => t.category))];
  /* "Mostly asked by X" only when X actually asked more than anyone else — a 1-1 tie said
     "mostly" about one of them, which was simply false. */
  const askers = taken.filter((t) => t.from !== 'routine').map((t) => nameFor(t.from));
  const tally = [...new Set(askers)].map((n) => [n, askers.filter((x) => x === n).length] as const)
    .sort((a, b) => b[1] - a[1]);
  const [lead, second] = tally;
  const askedLine = !lead ? ''
    : !second ? `, asked by ${lead[0]}`
    : lead[1] > second[1] ? `, mostly asked by ${lead[0]}`
    : `, asked by ${tally.map(([n]) => n).join(' and ')}`;

  return (
    <Page title="Try it yourself" lede={LEDE[stage](cap)}>
      <Steps stage={stage} />

      {/* Not a key — the writes live under our account with our delegate, and pretending otherwise
          would be theatre. A link is honest, and it still proves the memory outlived the tab. */}
      {returning && stage === 'cast' && (
        <Card tone="note" className="mb-4">
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
          <Meta>An agreement is between people. Rename them to the people in your house — you are the owner.</Meta>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <ClayAvatar label="Y" color="primary" />
              <div>
                <p className="text-on-surface text-sm font-semibold">You · owner</p>
                <p className="text-body-sm text-on-surface-variant">approve, and hold the key that signs policy</p>
              </div>
            </div>
            {CAST_DEFAULT.map((c) => (
              <div key={c.key} className="flex items-center gap-3">
                <ClayAvatar label={(names[c.key] ?? '').charAt(0).toUpperCase() || '?'} color={c.color} />
                <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <input
                    value={names[c.key] ?? ''}
                    maxLength={20}
                    onChange={(e) => setNames((n) => ({ ...n, [c.key]: e.target.value }))}
                    aria-label={c.what}
                    className="clay-well text-on-surface w-full rounded-full px-4 py-2 text-sm font-semibold outline-none sm:w-40"
                  />
                  <span className="text-body-sm text-on-surface-variant">{c.key} · {c.what}</span>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <span className="bg-surface-container text-on-surface-variant flex h-10 w-10 items-center justify-center rounded-full">
                <span className="material-symbols-outlined text-[20px]">autorenew</span>
              </span>
              <div>
                <p className="text-on-surface text-sm font-semibold">your routines</p>
                <p className="text-body-sm text-on-surface-variant">the house itself — a renewal or Friday pizza happens whether anyone asks or not</p>
              </div>
            </div>
          </div>
          <p className="text-on-surface-variant mt-3 font-mono text-[11px]">
            these names stay in your browser — memory stores the role, never the person
          </p>
          <ClayButton className="mt-4" onClick={() => setStage('spend')}>That&apos;s my house</ClayButton>
        </Card>
      )}

      {stage === 'spend' && (
        <Card>
          <Rule>What does your house actually spend on?</Rule>
          <Meta>Pick up to four. The requests you will be asked to approve come from these.</Meta>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PICKABLE.map((c) => {
              const on = cats.includes(c);
              return (
                <button key={c} type="button" onClick={() => toggleCat(c)} aria-pressed={on}
                  className={`relative flex flex-col items-center gap-2 rounded-xl p-4 transition-all ${
                    on ? 'clay-card clay-card-glow-primary' : 'clay-well opacity-70 hover:opacity-100'
                  }`}>
                  {/* a ring would be overwritten by the clay box-shadow, so selection is a mark */}
                  <span className={`absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full ${
                    on ? 'bg-primary text-on-primary shadow-[0_4px_10px_rgba(70,72,212,0.3)]' : 'bg-surface-container-lowest text-outline-variant'
                  }`}>
                    <span className="material-symbols-outlined text-[16px]">{on ? 'check' : 'add'}</span>
                  </span>
                  <CategoryIcon category={c} size={56} />
                  <span className={`text-sm font-semibold ${on ? 'text-primary' : 'text-on-surface-variant'}`}>{CATEGORY_LABEL[c]}</span>
                </button>
              );
            })}
          </div>
          <p className="text-on-surface-variant mt-3 font-mono text-[11px]">
            {cats.length} picked · {cats.some((c) => POOL[c].some((p) => p.from === 'routine'))
              ? 'one of your requests will come from a routine'
              : 'pick fast food or subscriptions to see a routine ask on its own'}
          </p>
          <ClayButton className="mt-4" onClick={() => setStage('number')}>That&apos;s what we buy</ClayButton>
        </Card>
      )}

      {stage === 'number' && (
        <Card>
          <Rule>How much can one person spend without asking?</Rule>
          <Meta>
            This is the only thing setup ever asks. Pick whichever feels right — you are meant to
            get it wrong, because the whole product is the app coming back later to correct you.
          </Meta>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {CHOICES.map((c) => (
              <ClayButton key={c} variant="secondary" onClick={() => start(c)}>{money(c)}</ClayButton>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-on-surface-variant text-sm">or your own</span>
            <span className="clay-well inline-flex items-center rounded-full px-3 py-1.5">
              <span className="text-on-surface-variant">$</span>
              <input
                value={custom} inputMode="decimal" placeholder="35"
                onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter') startCustom(); }}
                aria-label="your own number in dollars"
                className="text-on-surface w-16 bg-transparent px-1 text-sm outline-none"
              />
            </span>
            <ClayButton variant="secondary" size="sm" onClick={startCustom}>Use it</ClayButton>
          </div>
          <p className="text-on-surface-variant mt-2 font-mono text-[11px]">
            anything from $1 to $200 — the requests scale with it, so the arc works either way
          </p>
        </Card>
      )}

      {stage === 'deciding' && next && (
        <Card>
          <div className="flex items-start gap-4">
            <CategoryIcon category={next.category} size={64} />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="clay-avatar bg-surface-container-high text-on-surface-variant h-7 w-7 text-xs font-bold">{initial(next.from)}</span>
                <span className="text-on-surface-variant text-body-sm">
                  {next.from === 'routine' ? 'nobody asked — a routine' : `${nameFor(next.from)} asks`}
                </span>
              </div>
              <Rule>{money(next.cents)} · {CATEGORY_LABEL[next.category].toLowerCase()}</Rule>
              <Meta>
                {next.what}.{' '}
                {next.from === 'routine'
                  ? 'The house generated this on its own, which is the other half of why an agreement matters. '
                  : ''}
                Above your {money(cap)}, so you are asked.
              </Meta>
            </div>
          </div>
          <ClayButton className="mt-4" onClick={approve} disabled={sending}>
            {sending ? 'Writing to Walrus…' : `Approve ${money(next.cents)}`}
          </ClayButton>
          <p className="text-on-surface-variant mt-3 font-mono text-[11.5px]">
            request {taken.length + 1} of {MIN_EVIDENCE} · nothing is derived until there is enough evidence
          </p>
          {taken.length > 0 && <Approved taken={taken} nameFor={nameFor} />}
        </Card>
      )}

      {/* the payoff, alone on the screen. It only means something next to the number they chose. */}
      {stage === 'payoff' && (
        <>
          <Card tone="note" className="mb-4">
            <p className="text-on-surface mb-3 text-[28px] leading-tight font-extrabold tracking-tight">
              You said {money(cap)}.
              <br />
              It is actually <span className="text-primary">{money(threshold)}</span>.
            </p>
            <Meta>
              Across {byCat.map((c) => CATEGORY_LABEL[c].toLowerCase()).join(', ')}
              {askedLine} — every one went through without
              discussion. In the Wilson house this arrives in week five, and the app proposes making
              it a rule: a band nobody ever configured.
            </Meta>
            <Approved taken={taken} nameFor={nameFor} />
          </Card>
          <Card className="mb-4">
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
          <ClayButton onClick={() => setStage('quorum')}>One more thing →</ClayButton>
        </>
      )}

      {/* quorum, taught by hitting its limit rather than by simulating a second person */}
      {stage === 'quorum' && (
        <QuorumStep cents={bothSignature} onDone={() => setStage('receipts')}
          asker={nameFor('spender')} approver={nameFor('approver')} />
      )}

      {stage === 'receipts' && (
        <>
          {taken.map((d, i) => (
            <Card key={`${i}-${d.cents}`} className="mb-3">
              <div className="flex items-center gap-3">
                <CategoryIcon category={d.category} size={32} />
                <div className="min-w-0">
                  <Meta>
                    decision {i + 1} · {money(d.cents)} ·{' '}
                    {d.from === 'routine' ? 'raised by a routine' : `from ${nameFor(d.from)}`} · approved by you
                  </Meta>
                  <div className="text-primary font-mono text-[10.5px] break-all">{d.blobId}</div>
                </div>
              </div>
            </Card>
          ))}
          <Card className="mb-3">
            <Meta>belief · value_band · scoped to this session</Meta>
            <div className="text-primary font-mono text-[10.5px] break-all">0x{session}belief…sand</div>
          </Card>
          {checkpoint && (
            <Meta>
              Anchored at Sui checkpoint <span className="text-primary">{checkpoint}</span>, read through Tatum.
            </Meta>
          )}
          <div className="mt-2">
            <Meta>
              These are yours, in <code>sandbox-{session}</code>. Come back any time:{' '}
              <a href={`/try?s=${session}`} className="text-primary">/try?s={session}</a>
              {' '}— the rule is recalled from Mainnet, not from this tab.{' '}
              <Link href="/proof" className="text-primary">Verify them on the proof page →</Link>
            </Meta>
          </div>

          <Card tone="note" className="mt-4">
            <Rule>That took three decisions. The Wilson house has {houseDecisions.length}.</Rule>
            <Meta>
              Six weeks in, it knows who the house defers to on household purchases, that nothing
              under $18 is ever discussed, that Friday is fast food night, and that a rule the family
              wrote down is no longer the rule they follow.
            </Meta>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Link href="/agreement" className="clay-pill clay-pill-primary px-5 py-2.5 text-center text-sm font-semibold">
                See six weeks of it →
              </Link>
              <Link href="/reality" className="clay-pill clay-pill-secondary px-5 py-2.5 text-center text-sm font-semibold">
                Or what the chain caught
              </Link>
            </div>
          </Card>

          <div className="mt-4">
            <Meta>
              The sandbox forms a rule after {MIN_EVIDENCE} decisions instead of 8, so you do not have
              to tap all day. Everything else is the production path — same function, same schema,
              same network.
            </Meta>
          </div>
          <button
            type="button"
            onClick={() => { setStage('spend'); setTaken([]); setCap(0); setQueue([]); }}
            className="text-primary mt-3 font-mono text-[11.5px]"
          >
            Start over with different categories or a different number →
          </button>
        </>
      )}
    </Page>
  );
}

const LEDE: Record<Stage, (cap: number) => string> = {
  cast: () => 'Your people, what you buy, one number — and a rule about you, written to Walrus Mainnet, never into the Wilson house.',
  spend: () => 'Three people in. Now what your house spends on.',
  number: () => 'One question to go.',
  deciding: (c) => `You said ${money(c)}. Now approve what comes in and see whether that was true.`,
  payoff: () => 'Nobody wrote this rule. It came out of what you just did.',
  quorum: () => 'One thing a single signature cannot do.',
  receipts: () => 'Everything you just did, on Mainnet, and yours.',
};

function Steps({ stage }: { stage: Stage }) {
  const at = STEPS.findIndex(([s]) => s === stage);
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {STEPS.map(([s, label], i) => (
        <span
          key={s}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            i < at ? 'bg-secondary-fixed text-on-secondary-fixed-variant'
            : i === at ? 'bg-primary text-on-primary shadow-[0_4px_10px_rgba(70,72,212,0.3)]'
            : 'bg-surface-container-low text-on-surface-variant'
          }`}
        >
          {i < at ? '✓ ' : ''}{label}
        </span>
      ))}
    </div>
  );
}

function QuorumStep({ cents, onDone, asker, approver }: { cents: number; onDone: () => void; asker: string; approver: string }) {
  const [blocked, setBlocked] = useState(false);
  if (!blocked) {
    return (
      <Card>
        <div className="flex items-start gap-4">
          <CategoryIcon category="household" size={56} />
          <div>
            <Rule>{asker} needs {money(cents)} · household</Rule>
            <Meta>This one is in a different band. Try it.</Meta>
          </div>
        </div>
        <ClayButton className="mt-4" onClick={() => setBlocked(true)}>Approve {money(cents)}</ClayButton>
      </Card>
    );
  }
  return (
    <>
      <Card tone="alert" className="mb-4">
        <Rule>This needs {approver} too, and {approver} is not here.</Rule>
        <Meta>
          Above a certain amount one signature is not enough. The request is held, not refused, and
          nothing is bought — &ldquo;nothing is ever purchased without approval&rdquo; is an
          invariant rather than a setting. In a real house {approver} gets a notification, and if
          they go quiet it escalates to one person who can close it alone.
        </Meta>
      </Card>
      <ClayButton onClick={onDone}>See what you wrote →</ClayButton>
    </>
  );
}

/* The claim "every one went through" has to be checkable at a glance, so the amounts stay
   visible while they accumulate and again under the payoff. Blob ids belong to the receipts
   stage; three numbers are evidence, not clutter. */
function Approved({ taken, nameFor }: { taken: Decision[]; nameFor: (f: From) => string }) {
  return (
    <div className="border-outline-variant/60 mt-4 flex flex-wrap gap-2 border-t pt-3">
      {taken.map((d, i) => (
        <span key={`${i}-${d.cents}`} className="bg-surface-container-low inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1">
          <CategoryIcon category={d.category} size={22} />
          <span className="text-on-surface font-mono text-[11.5px]">{money(d.cents)}</span>
          <span className="text-on-surface-variant font-mono text-[11px]">
            · {d.from === 'routine' ? 'routine' : nameFor(d.from)} · ✓
          </span>
        </span>
      ))}
    </div>
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
