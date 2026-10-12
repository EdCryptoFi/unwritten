import { BELIEFS, DECISIONS, type DecisionEvent, HOUSE, MAXSPEND, TOPUPS, upTo } from '@unwritten/fixtures';
import { describe, expect, it } from 'vitest';
import type { Input } from '../src/index.js';
import {
  authority, confidenceOf, drift, friction, memberPattern, reconcile, rhythm, roundCap, silence,
  structuring, unapproved, valueBand,
} from '../src/index.js';

const base = (week = 6): Input => ({
  decisions: upTo(DECISIONS, week),
  topups: upTo(TOPUPS, week),
  knobs: HOUSE.learning,
  policy: HOUSE.policy,
  week,
});

describe('value_band', () => {
  it('finds the band Alex approves alone on groceries', () => {
    const b = valueBand(base(), 'm1', 'groceries');
    expect(b).not.toBeNull();
    expect(b?.dimension).toBe('value_band');
    if (b?.dimension !== 'value_band') throw new Error('wrong dimension');
    // The observed maximum is $44.90; a cap rounds up so it is not brittle against its own
    // history. The fixture the prototype validated says $45, and the function has to agree.
    expect(b.thresholdCents).toBe(4500);
    // Eleven clean out of eleven is strong, but a system reporting 1.0 from eleven events claims
    // a certainty it has not earned — and a family acts on that number.
    expect(b.confidence).toBeCloseTo(0.92, 2);
    expect(b.confidence).toBeLessThan(1);
    expect(b.scope).toEqual({ actor: 'm1', category: 'groceries' });
  });

  it('returns null below minEvidence rather than guessing', () => {
    expect(valueBand(base(2), 'm1', 'groceries')).toBeNull();
  });

  it('rounds the cap up so it is not brittle against its own history', () => {
    expect(roundCap(4490)).toBe(4500);
    expect(roundCap(4500)).toBe(4500);
    expect(roundCap(4501)).toBe(5000);
  });

  it('names the version it supersedes', () => {
    const v1 = valueBand(base(), 'm1', 'groceries');
    const v2 = valueBand({ ...base(), existing: v1 ? [v1] : [] }, 'm1', 'groceries');
    expect(v1?.supersedes).toBeNull();
    expect(v2?.version).toBe(2);
    expect(v2?.supersedes).toBe(v1?.id);
  });

  it('never mutates the version it supersedes', () => {
    const v1 = valueBand(base(), 'm1', 'groceries');
    const snapshot = JSON.stringify(v1);
    valueBand({ ...base(), existing: v1 ? [v1] : [] }, 'm1', 'groceries');
    expect(JSON.stringify(v1)).toBe(snapshot);
  });

  it('reads a spender as "what they spend without asking" — same function, different subject', () => {
    const asApprover = valueBand(base(), 'm1', 'groceries');
    const asSpender = valueBand(base(), 'm3', 'groceries');
    expect(asApprover?.dimension).toBe('value_band');
    // Carol never decided anything in the fixture, so there is nothing to derive about her.
    expect(asSpender).toBeNull();
  });
});

describe('silence', () => {
  it('derives a rule from the ABSENCE of decisions', () => {
    const b = silence(base());
    expect(b).not.toBeNull();
    if (b?.dimension !== 'silence') throw new Error('wrong dimension');
    // The line comes from policy — the belief asserts the line is real, not that it should move.
    expect(b.thresholdCents).toBe(HOUSE.policy.autoApproveCents);
    expect(b.scope).toEqual({ actor: '*', category: '*' });
  });

  it('cannot assert the line is real without knowing where the line is', () => {
    const { policy: _omitted, ...withoutPolicy } = base();
    expect(silence(withoutPolicy)).toBeNull();
  });
});

describe('authority', () => {
  it('reads the ORDER of decidedBy, not its membership', () => {
    const b = authority(base(), 'household');
    expect(b).not.toBeNull();
    if (b?.dimension !== 'authority') throw new Error('wrong dimension');
    // Sam signs first in four of the five multi-signature household decisions.
    expect(b.scope.actor).toBe('m2');
    expect(b.signsFirst).toEqual([4, 5]);
  });

  it('would reach a different conclusion if the order were reversed', () => {
    const flipped = base();
    flipped.decisions = flipped.decisions.map((d: DecisionEvent) =>
      d.decidedBy.length > 1 ? { ...d, decidedBy: [...d.decidedBy].reverse() } : d,
    );
    const b = authority(flipped, 'household');
    if (b?.dimension !== 'authority') throw new Error('wrong dimension');
    expect(b.scope.actor).not.toBe('m2');
  });
});

describe('member_pattern', () => {
  const games = MAXSPEND.reduce((a, w) => a + w.games, 0);

  it('computes the share of ALLOWANCE, not of spend', () => {
    const b = memberPattern(base(), 'm4', 'games', games);
    if (b?.dimension !== 'member_pattern') throw new Error('wrong dimension');
    // 17200 of 24000 given, not 17200 of what was spent.
    expect(b.sharePct).toBe(72);
  });

  it('returns null without top-ups rather than asserting a share it cannot compute', () => {
    const b = memberPattern({ ...base(), topups: [] }, 'm4', 'games', games);
    expect(b).toBeNull();
  });
});

describe('structuring', () => {
  it('catches a purchase split to stay inside a cap', () => {
    const hits = structuring(upTo(DECISIONS, 6), HOUSE.policy.bothFloorCents);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.parts).toBe(2);
    expect(hits[0]?.totalCents).toBe(3240);
  });

  it('does not fire on a single request over the floor', () => {
    const one = upTo(DECISIONS, 6).filter((d) => d.id === 'd07');
    expect(structuring(one, HOUSE.policy.bothFloorCents)).toHaveLength(0);
  });
});

describe('the function and the screen agree', () => {
  it('derives what the Agreement fixture shows, for every dimension it covers', () => {
    const shown = BELIEFS.find((b) => b.id === 'b1-v2');
    const derived = valueBand(base(), 'm1', 'groceries');
    if (shown?.dimension !== 'value_band' || derived?.dimension !== 'value_band') {
      throw new Error('wrong dimension');
    }
    expect(derived.thresholdCents).toBe(shown.thresholdCents);
  });
});

describe('confidence', () => {
  it('never reaches certainty, because a sample is not a proof', () => {
    expect(confidenceOf(11, 11)).toBeCloseTo(0.92, 2);
    expect(confidenceOf(3, 3)).toBeCloseTo(0.8, 2);
    expect(confidenceOf(1, 1)).toBeCloseTo(0.67, 2);
    expect(confidenceOf(100, 100)).toBeLessThan(1);
  });

  it('rises with sample size at the same purity', () => {
    expect(confidenceOf(20, 20)).toBeGreaterThan(confidenceOf(3, 3));
  });
});

describe('drift', () => {
  it('catches a quorum that is a quorum in name only', () => {
    const b = drift(base(), 'household', '2-of-2 above $100');
    expect(b).not.toBeNull();
    if (b?.dimension !== 'drift') throw new Error('wrong dimension');
    expect(b.state).toBe('drifting');
    expect(b.bypassed[0]).toBe(4);
    expect(b.bypassed[1]).toBe(5);
  });

  it('does not fire when the co-signer actually deliberates', () => {
    const slow = base();
    slow.decisions = slow.decisions.map((d) =>
      d.decidedBy.length > 1 ? { ...d, latencySeconds: 7200 } : d);
    expect(drift(slow, 'household', '2-of-2 above $100')).toBeNull();
  });
});

describe('friction', () => {
  it('finds the one contested category', () => {
    const b = friction(base(), 'games', 6);
    if (b?.dimension !== 'friction') throw new Error('wrong dimension');
    expect(b.rejections).toBe(1);
  });

  it('stays silent where nothing was ever rejected', () => {
    expect(friction(base(), 'pets', 6)).toBeNull();
  });
});

describe('rhythm', () => {
  it('reads a variable weekly habit as a habit, not a commitment', () => {
    const b = rhythm(base(), 'fastfood', 'Friday');
    if (b?.dimension !== 'rhythm') throw new Error('wrong dimension');
    expect(b.isCommitment).toBe(false);
    expect(b.weekday).toBe('Friday');
  });

  it('reads a fixed amount at a fixed interval as a standing commitment', () => {
    const fixed = base();
    fixed.decisions = [1, 2, 3].map((i) => ({
      ...(DECISIONS[0] as DecisionEvent), id: `sub${i}`, week: i,
      category: 'subscriptions' as const, amountCents: 1099,
    }));
    const b = rhythm(fixed, 'subscriptions');
    if (b?.dimension !== 'rhythm') throw new Error('wrong dimension');
    // A commitment leaves the anomaly set, which is what stops the Reality check flagging a
    // subscription renewal every single month.
    expect(b.isCommitment).toBe(true);
    expect(b.medianCents).toBe(1099);
  });

  it('needs three cycles before it will call anything a rhythm', () => {
    const two = base();
    two.decisions = two.decisions.filter((d: DecisionEvent) => d.category === 'fastfood').slice(0, 2);
    expect(rhythm(two, 'fastfood')).toBeNull();
  });
});

describe('reconcile', () => {
  const day = (n: number) => Date.UTC(2026, 8, n);
  const grocer = '0xgrocer';
  const cats = { [grocer]: 'groceries' as const };

  it('matches a transfer to the decision that agreed to it', () => {
    const rows = reconcile(
      [{ digest: 'd1', timestampMs: day(1), mist: 1_000_000, to: grocer }],
      upTo(DECISIONS, 6),
      cats,
    );
    expect(rows[0]?.approvalId).toBe('d01');
  });

  it('reports money that moved with nobody agreeing to it', () => {
    const rows = reconcile(
      [{ digest: 'ghost', timestampMs: Date.UTC(2030, 0, 1), mist: 9_000_000, to: grocer }],
      upTo(DECISIONS, 6),
      cats,
    );
    expect(unapproved(rows)).toHaveLength(1);
    expect(unapproved(rows)[0]?.digest).toBe('ghost');
  });

  it('does not let one decision cover two transfers', () => {
    const two = [
      { digest: 'a', timestampMs: day(1), mist: 1_000_000, to: grocer },
      { digest: 'b', timestampMs: day(1), mist: 1_000_000, to: grocer },
    ];
    const rows = reconcile(two, upTo(DECISIONS, 6), cats);
    // The house took one grocery decision that day, so the second transfer answers to nothing —
    // which is exactly how a purchase split in two to stay inside a cap surfaces.
    expect(rows.filter((r) => r.approvalId !== null)).toHaveLength(1);
    expect(unapproved(rows)).toHaveLength(1);
  });

  it('tolerates an amount that differs, because gas is not a disagreement', () => {
    const rows = reconcile(
      [{ digest: 'x', timestampMs: day(1), mist: 999_999_999, to: grocer }],
      upTo(DECISIONS, 6),
      cats,
    );
    // Matching on the amount would report every honest purchase as an anomaly.
    expect(rows[0]?.approvalId).toBe('d01');
  });

  it('refuses a rejected decision as cover for a transfer', () => {
    const rejected = DECISIONS.filter((d) => d.outcome === 'rejected');
    expect(rejected.length).toBeGreaterThan(0);
    const rows = reconcile(
      [{ digest: 'y', timestampMs: Date.parse(rejected[0]!.date), mist: 1_000, to: '0xgames' }],
      rejected,
      { '0xgames': 'games' },
    );
    expect(rows[0]?.approvalId).toBeNull();
  });
});
