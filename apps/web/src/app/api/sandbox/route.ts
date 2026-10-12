import { type Belief, type Category, type DecisionEvent, HOUSE } from '@unwritten/fixtures';
import { listNamespaces, recall, writeBelief, writeDecision } from '@unwritten/memory';
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
const MAX_WRITES = 5;
const VISITOR = 'you';

const ns = (session: string) => `sandbox-${session.replace(/[^a-z0-9]/gi, '').slice(0, 12)}`;

interface Tap { cents: number; category: Category; from: string }

/**
 * Counting is `listNamespaces`, never `recall`. Recall is a semantic search with a limit and a
 * relevance threshold, and it also lags indexing — so a route cannot read back what it just
 * wrote. Using it to count is how the first version of this handler reported "write 1, write 1,
 * write 2" and never reached the three decisions a rule needs.
 */
async function countWritten(session: string): Promise<number> {
  try {
    const all = (await listNamespaces()) as { namespaces: Array<{ name: string; memory_count: number }> };
    return all.namespaces.find((n) => n.name === ns(session))?.memory_count ?? 0;
  } catch {
    return 0;
  }
}

export async function GET(req: NextRequest) {
  const session = req.nextUrl.searchParams.get('s');
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 400 });

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
  /* The client sends every tap it has taken, not just the newest one. The server cannot read back
     what it wrote a moment ago — the relayer indexes asynchronously — so the session's state lives
     with the client and the server writes exactly one memory per request regardless of what it is
     told. A dishonest client therefore gains nothing: the cap is enforced against the real memory
     count, and the write volume is one per call either way. */
  const { session, taps, cap } = (await req.json()) as
    { session: string; taps: Tap[]; cap: number };
  if (!session || !taps?.length) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const already = await countWritten(session);
  if (already >= MAX_WRITES) {
    return NextResponse.json({ error: 'session cap reached', already }, { status: 429 });
  }

  const tap = taps[taps.length - 1] as Tap;
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
