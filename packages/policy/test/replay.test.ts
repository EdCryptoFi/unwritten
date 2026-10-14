/**
 * The week control used to show nothing for weeks 1–5 and all seven rules at once in week 6,
 * because the Mainnet seed derived its beliefs in a single pass. The claim — "drag the weeks and
 * watch the rules form" — is the product, so the replay that makes it true is pinned here.
 */
import { DECISIONS, HOUSE, SPEND, TOPUPS, say, upTo, wilsonProbes } from '@unwritten/fixtures';
import { describe, expect, it } from 'vitest';
import { claimOf, deriveAll, replay } from '../src/index.js';

const inputAt = (w: number) => ({
  decisions: upTo(DECISIONS, w),
  spend: upTo(SPEND, w),
  topups: upTo(TOPUPS, w),
  knobs: HOUSE.learning,
  policy: HOUSE.policy,
});
const run = () => replay(inputAt, wilsonProbes, 6);
const find = (rules: ReturnType<typeof run>['live'][number], dim: string) =>
  rules.find((b) => b.dimension === dim);

describe('replay', () => {
  const r = run();

  it('has nothing to say until there is evidence, then forms rules over time', () => {
    const counts = r.live.map((w) => w.length);
    expect(counts[0]).toBe(0);
    expect(counts[1]).toBe(0);
    expect(counts[2]).toBeGreaterThan(0);
    expect(counts).toEqual([...counts].sort((a, b) => a - b)); // never loses a rule it had
    expect(counts[5]).toBe(7);
  });

  it('ends exactly where a single week-6 pass ends — sentence for sentence', () => {
    const once = deriveAll({ ...inputAt(6), week: 6 }, wilsonProbes(6));
    expect(r.live[5]?.map(say).sort()).toEqual(once.map(say).sort());
  });

  it('opens a new version when a rule\'s claim moves, and names the one it replaces', () => {
    const share = r.versions.filter((b) => b.dimension === 'member_pattern').sort((a, b) => a.version - b.version);
    expect(share.map((b) => b.version)).toEqual([1, 2, 3]);
    expect(share.map((b) => (b.dimension === 'member_pattern' ? b.sharePct : 0))).toEqual([67, 70, 72]);
    expect(share[0]?.supersedes).toBeNull();
    expect(share[1]?.supersedes).toBe(share[0]?.id);
    expect(share[2]?.supersedes).toBe(share[1]?.id);
  });

  it('does NOT open a version when a rule only gains evidence', () => {
    // "8 of 8" → "10 of 10" → "11 of 11" under the same $45 is one rule on firmer ground.
    const bands = r.versions.filter((b) => b.dimension === 'value_band');
    expect(bands).toHaveLength(1);
    expect(bands[0]?.version).toBe(1);
    expect(say(find(r.live[3] ?? [], 'value_band')!)).toContain('8 of 8');
    expect(say(find(r.live[5] ?? [], 'value_band')!)).toContain('11 of 11');
  });

  it('every supersedes pointer lands on a version that exists', () => {
    const ids = new Set(r.versions.map((b) => b.id));
    for (const b of r.versions) if (b.supersedes) expect(ids.has(b.supersedes)).toBe(true);
  });

  it('a version starts in the week its claim first held, not the week it was last seen', () => {
    const v1 = r.versions.find((b) => b.dimension === 'member_pattern' && b.version === 1);
    expect(v1?.fromWeek).toBe(4);
  });

  it('is deterministic', () => {
    expect(run().live.map((w) => w.map(say))).toEqual(r.live.map((w) => w.map(say)));
  });

  it('the live rule at an early week is NOT the later version', () => {
    expect(find(r.live[3] ?? [], 'member_pattern')?.version).toBe(1);
    expect(find(r.live[5] ?? [], 'member_pattern')?.version).toBe(3);
  });
});

describe('claimOf', () => {
  it('ignores evidence, not claims', () => {
    const a = find(run().live[3] ?? [], 'value_band')!;
    const b = find(run().live[5] ?? [], 'value_band')!;
    expect(claimOf(a)).toBe(claimOf(b));
    const p4 = find(run().live[3] ?? [], 'member_pattern')!;
    const p6 = find(run().live[5] ?? [], 'member_pattern')!;
    expect(claimOf(p4)).not.toBe(claimOf(p6));
  });
});
