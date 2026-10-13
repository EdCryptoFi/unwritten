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

/**
 * Confidence has to account for SAMPLE SIZE, not just purity. Eleven clean observations out of
 * eleven is strong evidence, but a system that reports 1.0 from eleven events is claiming a
 * certainty it has not earned — and the number is shown to a family who will act on it.
 * Laplace smoothing: eleven of eleven becomes 0.92, three of three becomes 0.8.
 */
export const confidenceOf = (hits: number, total: number) => (hits + 1) / (total + 2);

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
  const confidence = confidenceOf(clean, relevant.length);
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
  const confidence = confidenceOf(auto.length, auto.length + discussedBelow);
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

  const confidence = confidenceOf(count, multi.length);
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
    confidence: confidenceOf(evidence.length, evidence.length),
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

/**
 * `drift` — a ratified rule that is no longer the rule the house follows.
 *
 * The product's sharpest moment, and it scolds the RULE rather than the spending. Detected by
 * measuring how fast the second signature arrives: a quorum where the co-signer rubber-stamps
 * within minutes is a quorum in name only.
 */
export function drift(
  input: Input,
  category: Category,
  statedRule: string,
  rubberStampSeconds = 300,
): Belief | null {
  const { knobs, week, existing } = input;
  const multi = input.decisions.filter(
    (d) => d.category === category && d.decidedBy.length > 1 && d.outcome === 'approved',
  );
  if (multi.length < Math.min(knobs.minEvidence, 5)) return null;

  const bypassed = multi.filter(
    (d) => d.latencySeconds !== null && d.latencySeconds <= rubberStampSeconds,
  );
  const rate = bypassed.length / multi.length;
  if (rate < 1 - knobs.driftTolerance) return null;

  const gaps = bypassed.map((d) => d.latencySeconds ?? 0).sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)] ?? 0;

  const key = `drift-${category}`;
  const { version, supersedes } = nextVersion(key, existing);
  return {
    dimension: 'drift',
    id: `${key}-v${version}`,
    version, supersedes, fromWeek: week,
    scope: { actor: '*', category },
    statedRule,
    medianGapSeconds: median,
    bypassed: [bypassed.length, multi.length],
    confidence: confidenceOf(bypassed.length, multi.length),
    evidenceCount: multi.length,
    evidenceIds: bypassed.map((d) => d.id),
    state: 'drifting',
    ratifiedTx: null,
    blobId: blobStub(key, version),
  };
}

/** `friction` — the one category the house actually argues about. */
export function friction(input: Input, category: Category, windowWeeks: number): Belief | null {
  const { week, existing } = input;
  const inCat = input.decisions.filter((d) => d.category === category);
  const rejections = inCat.filter((d) => d.outcome === 'rejected').length;
  if (rejections === 0) return null;

  const key = `friction-${category}`;
  const { version, supersedes } = nextVersion(key, existing);
  return {
    dimension: 'friction',
    id: `${key}-v${version}`,
    version, supersedes, fromWeek: week,
    scope: { actor: '*', category },
    rejections, windowWeeks,
    // Deliberately low: one rejection is a data point, not a pattern, and the UI shows the number.
    confidence: confidenceOf(rejections, inCat.length),
    evidenceCount: rejections,
    evidenceIds: inCat.filter((d) => d.outcome === 'rejected').map((d) => d.id),
    state: 'observed',
    ratifiedTx: null,
    blobId: blobStub(key, version),
  };
}

/**
 * `rhythm` — one dimension, two payloads, because the two cases are the same function.
 *
 * `isCommitment` (fixed amount, fixed interval) leaves the anomaly set and turns on price-creep
 * detection, which is what stops the Reality check flagging a subscription every month. Otherwise
 * it is a habit with a variable amount, and that is the only way to catch spend that sits BELOW
 * every approval threshold — a $71 pizza on a Tuesday.
 */
export function rhythm(input: Input, category: Category, weekdayName?: string): Belief | null {
  const { week, existing } = input;
  const events = input.decisions.filter((d) => d.category === category);
  if (events.length < 3) return null;

  const amounts = events.map((e) => e.amountCents).sort((a, b) => a - b);
  const median = amounts[Math.floor(amounts.length / 2)] ?? 0;
  const spread = median
    ? Math.round((Math.max(...amounts) - Math.min(...amounts)) / 2 / median * 100)
    : 0;

  // A fixed amount at a fixed interval is a commitment; anything that varies is a habit.
  const isCommitment = spread <= 2;
  const weeks = new Set(events.map((e) => e.week));

  const key = `rhythm-${category}`;
  const { version, supersedes } = nextVersion(key, existing);
  return {
    dimension: 'rhythm',
    id: `${key}-v${version}`,
    version, supersedes, fromWeek: week,
    scope: { actor: '*', category },
    cadence: isCommitment ? 'monthly' : 'weekly',
    weekday: isCommitment ? null : (weekdayName ?? null),
    medianCents: median,
    variancePct: spread,
    streak: [weeks.size, week],
    isCommitment,
    confidence: confidenceOf(weeks.size, week),
    evidenceCount: events.length,
    evidenceIds: events.map((e) => e.id),
    state: 'observed',
    ratifiedTx: null,
    blobId: blobStub(key, version),
  };
}

// ── reconciliation ──────────────────────────────────────────────────────────

export interface Transfer {
  digest: string;
  timestampMs: number;
  mist: number;
  to: string | null;
}

export interface Reconciled {
  digest: string;
  date: string;
  mist: number;
  to: string | null;
  /** The approval this transfer answers to, if the house ever took one. */
  approvalId: string | null;
}

/**
 * Money that moved, measured against decisions that were taken.
 *
 * This is the only place in the product where neither side can answer alone. The chain knows what
 * left the wallet and nothing about whether anybody agreed to it; the memory knows what was agreed
 * and nothing about whether it happened. An unmatched transfer exists in neither — it is produced
 * by the comparison, which is what makes reading the chain load-bearing rather than decorative.
 *
 * Matching is by day and recipient rather than by amount: a decision records what the house agreed
 * to, and what actually leaves the wallet includes gas and rounding. Insisting on equal amounts
 * would report every honest purchase as an anomaly.
 */
export function reconcile(
  transfers: Transfer[],
  decisions: DecisionEvent[],
  recipientCategory: Record<string, Category>,
): Reconciled[] {
  const used = new Set<string>();

  return transfers.map((t) => {
    const date = new Date(t.timestampMs).toISOString().slice(0, 10);
    const category = t.to ? recipientCategory[t.to] : undefined;

    const match = decisions.find(
      (d) =>
        !used.has(d.id) &&
        d.date === date &&
        (category === undefined || d.category === category) &&
        d.outcome !== 'rejected' &&
        d.outcome !== 'expired',
    );
    if (match) used.add(match.id);

    return {
      digest: t.digest,
      date,
      mist: t.mist,
      to: t.to,
      approvalId: match?.id ?? null,
    };
  });
}

/** What the Reality check asks for: money that moved with nobody agreeing to it. */
export const unapproved = (rows: Reconciled[]) => rows.filter((r) => r.approvalId === null);

/**
 * One pass over every dimension, in the order the seeder runs them.
 *
 * This exists so there is exactly ONE definition of 'derive the house's beliefs'. The seeder
 * calls it to write to Mainnet; `/proof` calls it in the browser to show that the rules on screen
 * are what these functions produce. If the two could drift apart, the claim that nothing is
 * hardcoded would be unverifiable — which is the entire point of the page.
 *
 * `probes` is not the learning. It is the list of places to look, which belongs to a house, not
 * to an algorithm.
 */
export interface Probes {
  approvers: Ref[];
  bandCategories: Category[];
  authorityCategories: Category[];
  member: { ref: Ref; category: Category; capCents: number };
  drift: { category: Category; claim: string };
  frictionCategories: Category[];
  /** `[category, weekdayName?]` — a weekday makes it a day-of-week rhythm. */
  rhythms: Array<readonly [Category, string?]>;
}

export function deriveAll(input: Omit<Input, 'existing'>, probes: Probes): Belief[] {
  const out: Belief[] = [];
  // Each call sees what the pass has already derived, so a new version can name what it
  // supersedes. Order therefore matters and must match the seeder's.
  const add = (b: Belief | null) => {
    if (b) out.push(b);
  };
  const ctx = () => ({ ...input, existing: out });

  for (const ref of probes.approvers) {
    for (const c of probes.bandCategories) add(valueBand(ctx(), ref, c));
  }
  add(silence(ctx()));
  for (const c of probes.authorityCategories) add(authority(ctx(), c));
  add(memberPattern(ctx(), probes.member.ref, probes.member.category, probes.member.capCents));
  add(drift(ctx(), probes.drift.category, probes.drift.claim));
  for (const c of probes.frictionCategories) add(friction(ctx(), c, input.week));
  for (const [c, day] of probes.rhythms) add(rhythm(ctx(), c, day));
  return out;
}

/**
 * Does the engine agree with the screens?
 *
 * Compares each derived belief against the live version of the fixture the prototype validated.
 * Only the HEADLINE claim is compared: ids, versions, blob ids and confidence are expected to
 * differ between a hand-written fixture and a freshly derived belief, and asserting on them would
 * make the check fail for reasons that mean nothing.
 */
export function agreement(
  derived: Belief[],
  shown: Belief[],
  say: (b: Belief) => string,
): Array<{ dimension: string; id: string; fixture: string; derived: string; agrees: boolean }> {
  const headline = (x: Belief) =>
    say(x)
      .replace(/· \d+ of \d+.*/, '')
      .trim();
  const live = shown.filter((s) => !shown.some((o) => o.supersedes === s.id));
  return derived.flatMap((b) => {
    const f = live.find(
      (s) =>
        s.dimension === b.dimension &&
        s.scope.actor === b.scope.actor &&
        s.scope.category === b.scope.category,
    );
    if (!f) return [];
    return [
      {
        dimension: b.dimension,
        id: f.id,
        fixture: headline(f),
        derived: headline(b),
        agrees: headline(f) === headline(b),
      },
    ];
  });
}
