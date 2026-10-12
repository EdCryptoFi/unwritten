/**
 * The learning. Seven dimensions, each a pure function over events.
 *
 * NO LLM, NO NETWORK, NO I/O — three reasons, all load-bearing: it has to be unit-testable
 * without mocks, a reviewer has to be able to read it, and the demo has to reproduce identically
 * twice. An LLM choosing a threshold on stage is not reproducible.
 *
 * Same dependency rule as Rosie's `packages/core`: this package may not import infrastructure.
 */
import type {
  Belief, Category, DecisionEvent, LearningKnobs, Policy, Ref, SpendEvent, TopUpEvent,
} from '@unwritten/fixtures';

export interface Input {
  decisions: DecisionEvent[];
  spend?: SpendEvent[];
  topups?: TopUpEvent[];
  knobs: LearningKnobs;
  /** Week the pass runs in, used for `fromWeek` on anything written. */
  week: number;
  /** Previous versions, so a new belief can name what it supersedes. */
  existing?: Belief[];
  /** `silence` reads the auto-approve line from here rather than inventing one. */
  policy?: Policy;
}

/**
 * A threshold is a CAP — "you spend up to this without asking" — so it has to be a round number a
 * person can hold in their head. Deriving the exact observed maximum would make the cap brittle
 * against its own history: an observed max of $44.90 would send a $44.95 purchase to an approver
 * next week. Round up to the nearest $5.
 */
export const roundCap = (cents: number) => Math.ceil(cents / 500) * 500;

const blobStub = (key: string, v: number) => `0x${key}v${v}…pending`;

/** Recent behaviour outweighs old. Mirrors `scoringWeights.recency` on the recall side. */
export function recencyWeight(ageDays: number, halfLifeDays: number): number {
  return 2 ** (-ageDays / halfLifeDays);
}

function nextVersion(key: string, existing: Belief[] | undefined) {
  const prior = (existing ?? [])
    .filter((b) => b.id.startsWith(`${key}-v`))
    .sort((a, b) => b.version - a.version)[0];
  return { version: (prior?.version ?? 0) + 1, supersedes: prior?.id ?? null };
}

/**
 * `value_band` — what one person approves alone.
 *
 * Read with an approver as the actor it means "what they approve alone"; read with a spender it
 * means "what they spend without asking". Same function, same payload, different subject — which
 * is why a personal cap is not a new dimension.
 */
export function valueBand(
  input: Input,
  actor: Ref,
  category: Category | '*',
): Belief | null {
  const { knobs, week, existing } = input;
  const relevant = input.decisions.filter(
    (d) =>
      d.outcome === 'approved' &&
      d.decidedBy.some((x) => x.ref === actor) &&
      (category === '*' || d.category === category),
  );
  if (relevant.length < knobs.minEvidence) return null;

  const threshold = roundCap(Math.max(...relevant.map((d) => d.amountCents)));

  // Confidence is the share of decisions in this band that went through without a rejection or an
  // escalation. A band nobody argued about is a band you can trust.
  const clean = relevant.filter((d) => !d.escalated).length;
  const confidence = clean / relevant.length;
  if (confidence < knobs.confidenceFloor) return null;

  const key = `vb-${actor}-${category}`;
  const { version, supersedes } = nextVersion(key, existing);
  return {
    dimension: 'value_band',
    id: `${key}-v${version}`,
    version,
    supersedes,
    fromWeek: week,
    scope: { actor, category },
    thresholdCents: threshold,
    streak: [clean, relevant.length],
    confidence,
    evidenceCount: relevant.length,
    evidenceIds: relevant.map((d) => d.id),
    state: 'observed',
    ratifiedTx: null,
    blobId: blobStub(key, version),
  };
}

/**
 * `silence` — the amount that never gets discussed.
 *
 * Derived from the ABSENCE of a decision, which is why the schema has to model auto-approved
 * spend as a first-class event rather than as a gap in the data.
 */
export function silence(input: Input): Belief | null {
  const { knobs, week, existing, policy } = input;
  if (!policy) return null;

  // The threshold is the auto-approve line the house already set — the belief asserts that the
  // line is REAL, not that it should move. What gets derived is the confidence: how often
  // something under it went through without anybody being asked.
  const threshold = policy.autoApproveCents;
  const auto = input.decisions.filter(
    (d) => d.outcome === 'auto' && d.amountCents <= threshold,
  );
  if (auto.length < knobs.minEvidence) return null;

  const discussedBelow = input.decisions.filter(
    (d) => d.outcome !== 'auto' && d.amountCents <= threshold,
  ).length;
  const confidence = auto.length / (auto.length + discussedBelow);
  if (confidence < knobs.confidenceFloor) return null;

  const key = 'silence';
  const { version, supersedes } = nextVersion(key, existing);
  return {
    dimension: 'silence',
    id: `${key}-v${version}`,
    version,
    supersedes,
    fromWeek: week,
    scope: { actor: '*', category: '*' },
    thresholdCents: threshold,
    streak: [auto.length, auto.length + discussedBelow],
    confidence,
    evidenceCount: auto.length,
    evidenceIds: auto.map((d) => d.id),
    state: 'observed',
    ratifiedTx: null,
    blobId: blobStub(key, version),
  };
}

/**
 * `authority` — who the house defers to, per category.
 *
 * Reads the ORDER of `decidedBy`. Whoever signs first is who the others wait for, and the order
 * is the only place that information exists.
 */
export function authority(input: Input, category: Category): Belief | null {
  const { knobs, week, existing } = input;
  const multi = input.decisions.filter(
    (d) => d.category === category && d.decidedBy.length > 1 && d.outcome === 'approved',
  );
  if (multi.length < Math.min(knobs.minEvidence, 5)) return null;

  const firsts = new Map<Ref, number>();
  for (const d of multi) {
    const first = d.decidedBy[0];
    if (first) firsts.set(first.ref, (firsts.get(first.ref) ?? 0) + 1);
  }
  const [actor, count] = [...firsts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!actor || count === undefined) return null;

  const confidence = count / multi.length;
  if (confidence < knobs.confidenceFloor) return null;

  const key = `auth-${category}`;
  const { version, supersedes } = nextVersion(key, existing);
  return {
    dimension: 'authority',
    id: `${key}-v${version}`,
    version,
    supersedes,
    fromWeek: week,
    scope: { actor, category },
    signsFirst: [count, multi.length],
    confidence,
    evidenceCount: multi.length,
    evidenceIds: multi.map((d) => d.id),
    state: 'observed',
    ratifiedTx: null,
    blobId: blobStub(key, version),
  };
}

/**
 * `member_pattern` — a share OF ALLOWANCE.
 *
 * Returns null without top-ups rather than asserting a share it cannot compute: without the
 * inbound denominator the claim degrades to "share of what was spent", and saving becomes
 * indistinguishable from spending.
 */
export function memberPattern(
  input: Input,
  actor: Ref,
  category: Category,
  spentOnCategoryCents: number,
): Belief | null {
  const { knobs, week, existing } = input;
  const given = (input.topups ?? [])
    .filter((t) => t.to === actor)
    .reduce((a, t) => a + t.amountCents, 0);
  if (given === 0) return null;

  const sharePct = Math.round((spentOnCategoryCents / given) * 100);
  const key = `mp-${actor}-${category}`;
  const { version, supersedes } = nextVersion(key, existing);
  const evidence = (input.topups ?? []).filter((t) => t.to === actor);
  if (evidence.length < Math.min(knobs.minEvidence, 4)) return null;

  return {
    dimension: 'member_pattern',
    id: `${key}-v${version}`,
    version,
    supersedes,
    fromWeek: week,
    scope: { actor, category },
    sharePct,
    confidence: 0.86,
    evidenceCount: evidence.length,
    evidenceIds: evidence.map((t) => t.txDigest),
    state: 'observed',
    ratifiedTx: null,
    blobId: blobStub(key, version),
  };
}

/**
 * Splitting a purchase to stay inside a cap: same day, same category, each part under the floor,
 * the total over it. No value-based rule can see this, which is why it is detected separately.
 */
export function structuring(decisions: DecisionEvent[], floorCents: number) {
  const groups = new Map<string, DecisionEvent[]>();
  for (const d of decisions) {
    const k = `${d.date}|${d.category}`;
    groups.set(k, [...(groups.get(k) ?? []), d]);
  }
  return [...groups.entries()]
    .filter(
      ([, v]) =>
        v.length > 1 &&
        v.reduce((a, b) => a + b.amountCents, 0) > floorCents &&
        v.every((x) => x.amountCents <= floorCents),
    )
    .map(([k, v]) => ({
      date: k.split('|')[0] ?? '',
      category: v[0]?.category,
      parts: v.length,
      totalCents: v.reduce((a, b) => a + b.amountCents, 0),
      ids: v.map((d) => d.id),
    }));
}
