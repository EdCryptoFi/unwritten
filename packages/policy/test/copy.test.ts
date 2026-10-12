import { BELIEFS, say, soWhat } from '@unwritten/fixtures';
import { describe, expect, it } from 'vitest';

/**
 * The consequence lines are written, not generated — so they can be tested, and so they are
 * identical on camera and in the product. A line that drifts between the film and the live app is
 * the kind of small lie that costs more than the feature was worth.
 */
describe('every rule says what it means', () => {
  it('covers all seven dimensions', () => {
    const covered = new Set(BELIEFS.map((b) => b.dimension));
    expect(covered.size).toBe(7);
    for (const b of BELIEFS) expect(soWhat(b).length).toBeGreaterThan(20);
  });

  it('never repeats the fact it follows', () => {
    for (const b of BELIEFS) {
      expect(soWhat(b)).not.toBe(say(b));
    }
  });

  it('addresses the reader rather than describing them', () => {
    const second = BELIEFS.filter((b) => /\byou\b|\byour\b|\bsomebody\b|\bnobody\b/i.test(soWhat(b)));
    expect(second.length).toBeGreaterThan(BELIEFS.length / 2);
  });

  it('tells the drifting rule to choose', () => {
    const d = BELIEFS.find((b) => b.dimension === 'drift');
    expect(soWhat(d!)).toMatch(/make it real|drop it/i);
  });
});
