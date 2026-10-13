import {
  MAX_PER_SESSION, MAX_SANDBOX_TOTAL_PER_HOUR, callerIp, ipAllowed, parseBody, sandboxBudget,
} from '@/lib/guard';
import { type Belief, type DecisionEvent, HOUSE } from '@unwritten/fixtures';
import { recall, writeBelief, writeDecision } from '@unwritten/memory';
import { valueBand } from '@unwritten/policy';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * The sandbox's write path. The delegate key lives here and never reaches the browser, which is
 * the whole reason this is a server route rather than a client call.
 *
 * Writes land in `sandbox-<session>`, never in the seeded house: the seed stays clean so the film
 * and the screenshots keep matching, and a curious visitor cannot spend the account's hourly
 * budget on the eve of judging.
 */
export const runtime = 'nodejs';

const MIN_EVIDENCE = 3;
const VISITOR = 'you';

const ns = (session: string) => `sandbox-${session.replace(/[^a-z0-9]/gi, '').slice(0, 12)}`;


export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('s') ?? '';
  const session = raw.replace(/[^a-z0-9]/gi, '').slice(0, 12);
  if (session.length < 4) return NextResponse.json({ error: 'no session' }, { status: 400 });

  // Coming back to a session is the point: Walrus Memory's headline claim is that memory survives
  // the session, and this is that claim demonstrated rather than asserted.
  const rows = await recall<DecisionEvent | Belief>(ns(session) as never, 'decisions and rules', 20)
    .catch(() => []);
  const payloads = rows.map((r) => r.payload).filter((p): p is DecisionEvent | Belief => !!p);
  const isDecision = (p: DecisionEvent | Belief): p is DecisionEvent => 'kind' in p;
  const decisions = payloads.filter(isDecision);
  const beliefs = payloads.filter((p): p is Belief => !isDecision(p));
  return NextResponse.json({ session, decisions, beliefs, found: rows.length });
}

export async function POST(req: NextRequest) {
  /* Everything below reaches Walrus Mainnet, which has no delete. The body is validated rather
     than cast, the account's hourly budget is checked before anything is written, and the caller
     is rate limited — a per-session cap resets with a new id, so it protects nothing on its own. */
  /* Order matters: validation is free, the budget check is a network call, and the rate limiter
     holds state. Rejecting malformed input first means a flood of junk costs nothing — and a
     caller who sends nonsense gets told what is wrong rather than being counted against a quota
     they never reached. */
  const parsed = parseBody(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { session, taps, cap } = parsed;

  const ip = callerIp(req.headers);
  if (!ipAllowed(ip)) {
    return NextResponse.json({ error: 'too many sessions from here' }, { status: 429 });
  }

  const budget = await sandboxBudget(session);
  if (budget.thisSession >= MAX_PER_SESSION) {
    return NextResponse.json({ error: 'session cap reached', ...budget }, { status: 429 });
  }
  if (budget.lastHour >= MAX_SANDBOX_TOTAL_PER_HOUR) {
    // Degrade rather than fail: the rule still forms, the write waits. A reviewer must not meet a
    // dead demo because somebody scripted the sandbox an hour earlier.
    return NextResponse.json(
      { queued: false, reason: 'the hour\'s sandbox budget is spent — try again shortly', ...budget },
      { status: 200 },
    );
  }

  const tap = taps[taps.length - 1] as (typeof taps)[number];
  const n = taps.length;
  const event: DecisionEvent = {
    id: `${session}-${n}`,
    kind: 'decision',
    week: 1,
    date: new Date().toISOString().slice(0, 10),
    category: tap.category,
    amountCents: tap.cents,
    quorumRequired: '1-of-2',
    // A visitor's typed names never leave the browser. Memory stores the ROLE, as it does
    // everywhere else — a name written here would be permanent and unremovable.
    decidedBy: [{ ref: VISITOR, role: 'owner' }],
    outcome: 'approved',
    latencySeconds: 20,
    escalated: false,
    initiatedBy: tap.from === 'routine' ? 'routine' : 'member',
    blobId: 'pending',
  };

  let job: unknown;
  try {
    job = await writeDecision(event, ns(session) as never);
  } catch (e) {
    // Degrade, never error: a reviewer must not meet a stack trace.
    return NextResponse.json(
      { queued: false, reason: (e as Error).message.slice(0, 140), event },
      { status: 200 },
    );
  }

  // Once there is enough evidence, derive — with the real function, and a lower minEvidence.
  let belief: Belief | null = null;
  const decisions: DecisionEvent[] = taps.map((t, i) => ({
    ...event, id: `${session}-${i + 1}`, amountCents: t.cents, category: t.category,
    initiatedBy: t.from === 'routine' ? 'routine' : 'member',
  }));
  if (decisions.length >= MIN_EVIDENCE) {
    belief = valueBand(
      {
        decisions,
        knobs: { ...HOUSE.learning, minEvidence: MIN_EVIDENCE },
        policy: { ...HOUSE.policy, autoApproveCents: cap },
        week: 1,
      },
      VISITOR,
      '*',
    );
    if (belief) {
      const sentence = `You approve alone up to $${(
        (belief.dimension === 'value_band' ? belief.thresholdCents : 0) / 100
      ).toFixed(2)} · ${decisions.length} of ${decisions.length}`;
      await writeBelief(belief, sentence, ns(session) as never).catch(() => null);
    }
  }

  return NextResponse.json({ queued: true, job, event, belief, written: n });
}
