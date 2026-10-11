# Spec — Policy Learning

Status: draft
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
| `minEvidence` | 8 | events required before a belief can form |
| `recencyHalfLifeDays` | 21 | passed to `recall` as `scoringWeights.recency`; recent behaviour outweighs old |
| `driftTolerance` | 0.30 | how far behaviour may diverge from a ratified rule before drift is raised |
| `rejectedCooldownDays` | 45 | silence after a proposal is rejected |

`recall` is called with recency weighting deliberately: rule derivation must weigh recent
behaviour above old. This is a protocol-native mechanism, not a workaround.

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

**Given** 7 qualifying events and `minEvidence: 8`
**When** the derive pass runs
**Then** no belief is written and the empty state reports one event still needed

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
