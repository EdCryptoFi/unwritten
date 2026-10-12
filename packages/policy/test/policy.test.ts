import {
  BELIEFS, DECISIONS, HOUSE, type Input, MAXSPEND, TOPUPS, upTo,
} from '@unwritten/fixtures';
import { describe, expect, it } from 'vitest';
import { authority, memberPattern, roundCap, silence, structuring, valueBand } from '../src/index.js';

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
    expect(silence({ ...base(), policy: undefined })).toBeNull();
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
    flipped.decisions = flipped.decisions.map((d) =>
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
