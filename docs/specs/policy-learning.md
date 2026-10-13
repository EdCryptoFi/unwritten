# Spec — Policy Learning

Status: audited against the code on 12 Oct 2026. Claims the code does not support are
marked **Not built** inline rather than quietly removed, because the gap is the useful information
Depends on: `memory-schema.md`, `decision-flow.md`

## Context

The product's thesis: every house already has an unwritten spending agreement. This spec defines
how it is discovered, when it is said out loud, and when the agent keeps quiet.

**The learning is a set of pure functions, never an LLM call.** Reasons: it must be unit-testable
without mocks, a reviewer must be able to read it, and a demo must reproduce identically twice. An
LLM choosing a threshold on stage is not reproducible.

`packages/policy` may not import network, LLM or infrastructure code. Same dependency rule as
`packages/core` in Rosie.

## 1. The seven dimensions

Each is a pure function `(events, knobs) → Belief | null`.

| Dimension | Reads | Asserts | Payload |
|---|---|---|---|
| `value_band` | decisions, per actor+category | the amount one person approves alone | `thresholdCents`, `streak` |
| `silence` | auto-outcome decisions | the amount that never gets discussed | `thresholdCents`, `streak` |
| `authority` | `decidedBy` **order** | who the house defers to, per category | `signsFirst` |
| `friction` | latency, rejections, escalations | which category is contested | `rejections`, `windowWeeks` |
| `drift` | ratified rule vs. behaviour | that a rule is not real | `statedRule`, `medianGapSeconds`, `bypassed` |
| `member_pattern` | dependent wallet in/out | a share **of allowance** | `sharePct` |
| `rhythm` | recipient + amount + cadence | a standing commitment or a weekly habit | `cadence`, `weekday?`, `medianCents`, `variancePct`, `streak`, `isCommitment` |

`member_pattern` requires `topup` events. Without the inbound denominator the claim degrades to
"share of what was spent", and saving is indistinguishable from spending.

`rhythm` with `isCommitment: true` removes matching spend from the anomaly set and enables
price-creep detection. With `isCommitment: false` it enables off-rhythm detection, which is the
only way to catch spend that sits below every approval threshold.

## 2. Knobs

No precedent in Rosie — this spec defines them.

| Knob | Default | Governs |
|---|---|---|
| `confidenceFloor` | 0.65 | below this, no belief is written at all |
| `minEvidence` | 8 | the ceiling on the evidence a dimension may demand — **not a universal gate** |
| `recencyHalfLifeDays` | 21 | passed to `recall` as `scoringWeights.recency`; recent behaviour outweighs old |
| `driftTolerance` | 0.30 | how far behaviour may diverge from a ratified rule before drift is raised |
| `rejectedCooldownDays` | 45 | silence after a proposal is rejected |

`recall` is called with recency weighting deliberately: rule derivation must weigh recent
behaviour above old. This is a protocol-native mechanism, not a workaround. Note where it applies —
`packages/memory` passes `scoringWeights: { semantic: 0.6, recency: 0.4, recencyHalfLifeDays }`, so
recency shapes **retrieval**. Inside a dimension every retrieved event counts equally. Weighting
within the window is a stated gap, not a thing the code does.

### Evidence floors are per dimension

`minEvidence: 8` is the house's appetite, not a single gate, because the dimensions do not see
comparable amounts of evidence. A 2-of-2 decision is rarer than a solo approval, so demanding
eight of them would mean `authority` never forms at all.

| Dimension | Floor in code | Why |
|---|---|---|
| `value_band` | `minEvidence` (8) | solo approvals are the most common event; full appetite applies |
| `silence` | `minEvidence` (8) | same — auto-outcomes are plentiful |
| `authority` | `min(minEvidence, 5)` | reads multi-signature decisions only, which are rarer |
| `drift` | `min(minEvidence, 5)` | same population as `authority` |
| `member_pattern` | `min(minEvidence, 4)` | one top-up per week caps the evidence at the week count |
| `rhythm` | 3 occurrences | three points is the minimum that can establish a cadence |
| `friction` | 1 rejection | deliberate: a rejection is rare and informative. Confidence is
  correspondingly low and the UI always shows the raw count, so the reader can discount it |

The consequence is visible in the product and should be: of the Wilson house's seven rules, two
rest on eight or more events and five rest on fewer. Every card shows its own count.

### Confidence is Laplace-smoothed

`confidenceOf(hits, total) = (hits + 1) / (total + 2)`.

Never the raw ratio. Eleven approvals out of eleven is 0.92, not 1.0, because certainty from a
small sample is the thing a learning system most needs to avoid claiming. It also means a single
observation yields 0.67 — above the 0.65 floor by a hair, which is the intended edge.

## 3. When a belief does NOT form

| Situation | Behaviour |
|---|---|
| Fewer than `minEvidence` events | nothing written; the empty state says how many more are needed |
| Confidence below the floor | nothing written |
| Contradictory evidence, behaviour oscillates | **say "no stable rule here"** rather than invent one |

The product is useless for roughly two weeks by construction. Empty states are therefore
first-class screens, not decoration, and must state what is still missing.

## 4. The derive pass

Runs **daily**, never per event.

**Not built as a scheduled job.** `policy.deriveAll` is the pass and it is real — `scripts/seed.mts`
and `/proof` both call it, which is why the page can show that the rules on screen are derived. What
does not exist is the schedule. `scripts/spend.mts` is the only daily script, and it writes events
rather than beliefs.

```
for each dimension:
  recall(ns 'decisions' | 'spend' | 'topup', recency-weighted)
  → run the pure function
  → if a belief crosses confidenceFloor AND minEvidence:
       write it (append), naming `supersedes` if a previous version exists
  → if a proposal is warranted AND not within cooldown:
       queue it for the weekly digest
```

Batch with `rememberBulk`. Budget: ~100 `remember` calls per hour per account.

## 5. Supersession

- A belief is **never mutated**. A new version appends with `supersedes` pointing at the previous id.
- `visibleBeliefs()` = all beliefs minus any id appearing as another's `supersedes`.
- Superseded versions stay readable. That is the memory-evolution timeline, not a leak.
- Because payloads are structured, v1→v2 is an arithmetic diff, not a string comparison.

## 6. Proposals

Live in the application database, **not memory** — they are mutable (`pending → accepted |
rejected`), and an append-only store cannot hold mutable state. Only the outcome reaches memory.

Two effects:

| `effect` | On accept |
|---|---|
| `supersede` | appends belief v+1 with the patch; the ratification is an onchain transaction |
| `policy` | changes policy only and **supersedes nothing** — the observation stays true |

Not every learning produces a belief. "72% of the allowance goes to games" remains true after you
add an approval requirement; the policy changed, the fact did not.

**Rejection is evidence.** It writes nothing to memory, sets `cooldownUntil`, and teaches the
agent that the house prefers the stated rule even though it does not follow it. Without this the
agent proposes the same change forever and the product is unbearable within two weeks.

**Drift never renders as its own card.** It is the rationale inside the proposal it produced. It
stands alone only when the evidence does not indicate which direction to propose, and then the
card says exactly that. A digest section that never clears teaches the admin to skip the digest.

## Acceptance criteria

**Given** 7 qualifying solo approvals and `minEvidence: 8`
**When** the derive pass runs
**Then** no `value_band` is written and the empty state reports one event still needed.
Dimensions with lower floors are unaffected — see *Evidence floors are per dimension*.

**Given** behaviour that oscillates between two bands
**When** the derive pass runs
**Then** no belief is written and the UI states there is no stable rule

**Given** an existing `value_band` belief at v1 and an accepted raise proposal
**When** ratification confirms
**Then** v2 is appended with `supersedes: v1`, v1 is byte-identical to before, and only v2 is visible

**Given** an accepted proposal with `effect: 'policy'`
**When** it is applied
**Then** policy changes and no belief is written

**Given** a rejected proposal
**When** the derive pass runs again inside the cooldown
**Then** the same proposal is not raised

**Given** a drift belief that produced a proposal
**When** the digest renders
**Then** drift appears only inside that proposal, not as a separate card

**Given** dependent spend but no `topup` events
**When** `member_pattern` runs
**Then** it returns null rather than asserting a share it cannot compute

## Open questions

- **Regime change.** A new baby, a job loss, a move invalidates every rule at once. The model would
  drift thresholds slowly when the truth is that everything changed on a Tuesday. A structural
  break needs an explicit boundary, not decay.
- **Cooldown override.** 45 days means a rejected proposal effectively never returns. It should
  probably be broken by a large change in evidence, not only by time. Same root as regime change.
- **Exception vs. drift.** An $800 repair at 23:00 bypasses the rule legitimately. Today that reads
  as drift.
- **Recency inside a dimension.** `recencyHalfLifeDays` shapes retrieval through `recall`, but once
  events are in hand every dimension counts them equally. A `recencyWeight` helper existed in
  `packages/policy`, exported and never called; it was removed rather than left to imply a
  behaviour the code does not have. Wiring it would change every derived threshold, and the beliefs
  it would contradict are already on Mainnet, where there is no delete. It belongs to a v2 with a
  fresh namespace.
