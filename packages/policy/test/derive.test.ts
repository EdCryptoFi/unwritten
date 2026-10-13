/**
 * The project's loudest claim is that the rules on screen were derived, not written. `/proof` now
 * makes that claim in the browser, which means a regression here would put a false "agrees" in
 * front of a reviewer. These tests are the only thing standing between those two facts.
 */
import {
  BELIEFS,
  DECISIONS,
  HOUSE,
  SPEND,
  TOPUPS,
  say,
  upTo,
  wilsonProbes,
} from "@unwritten/fixtures";
import { describe, expect, it } from "vitest";
import { agreement, deriveAll } from "../src/index.js";

const WEEK = 6;
const input = {
  decisions: upTo(DECISIONS, WEEK),
  spend: upTo(SPEND, WEEK),
  topups: upTo(TOPUPS, WEEK),
  knobs: HOUSE.learning,
  policy: HOUSE.policy,
  week: WEEK,
};
const derived = deriveAll(input, wilsonProbes(WEEK));

describe("deriveAll", () => {
  it("derives one belief per dimension", () => {
    expect(derived.map((b) => b.dimension)).toEqual([
      "value_band",
      "silence",
      "authority",
      "member_pattern",
      "drift",
      "friction",
      "rhythm",
    ]);
  });

  it("is deterministic — the demo has to reproduce identically twice", () => {
    expect(deriveAll(input, wilsonProbes(WEEK)).map(say)).toEqual(derived.map(say));
  });

  it("feeds each dimension what the pass has already derived, so versions can supersede", () => {
    // A belief that names a predecessor could only have seen it through `existing`.
    expect(derived.some((b) => b.supersedes !== undefined)).toBe(true);
  });
});

describe("agreement", () => {
  const rows = agreement(derived, BELIEFS, say);

  it("every derived belief matches the screen it is shown on", () => {
    expect(rows.filter((r) => !r.agrees)).toEqual([]);
    expect(rows).toHaveLength(7);
  });

  it("compares against the live version, never a superseded one", () => {
    const vb = rows.find((r) => r.dimension === "value_band");
    const superseded = BELIEFS.map((b) => b.supersedes).filter(Boolean);
    expect(superseded).not.toContain(vb?.id);
  });

  it("ignores the confidence tail, which is expected to differ", () => {
    // If the headline were compared with its "· n of m" suffix nothing would ever agree.
    expect(rows.every((r) => !/· \d+ of \d+/.test(r.derived))).toBe(true);
  });

  it("reports differs when a screen drifts from the engine", () => {
    const tampered = BELIEFS.map((b) =>
      b.dimension === "silence" && "thresholdCents" in b ? { ...b, thresholdCents: 999_99 } : b,
    );
    expect(agreement(derived, tampered, say).find((r) => r.dimension === "silence")?.agrees).toBe(
      false,
    );
  });
});
