# Spec — Decision Flow

Status: draft · derived from the clickable prototype, every path below was exercised there
Depends on: `memory-schema.md`

## Context

The path from "someone wants to spend" to "memory written". This is the loop that produces the
evidence every belief is derived from, so its correctness bounds the whole product: a decision
recorded wrong is evidence that can never be withdrawn.

## 1. Entry points (three)

| Source | Produces | Note |
|---|---|---|
| A member asks in the app | an intent | the ordinary path |
| A routine fires | an intent | seam with Rosie: `RoutineItem → intent`. A routine describes intent, never a product |
| **A charge already happened** | a reconciliation event | detected by reading the chain. This is the anomaly path and it has no approval to wait for |

## 2. Classify

Category + amount. The category is resolved from the recipient, and the recipient's identity is
itself a `rhythm`/belief lookup, not a stored field.

**No item name passes this step into memory, ever.** Item descriptions stay in the application
database.

## 3. Resolve quorum

Read the **currently ratified policy** from chain via Tatum RPC. Then:

```
active        = members where approver AND state == 'active'
needed        = quorumRequired == '2-of-2' ? active.length : 1
unsatisfiable = needed > active.length
```

`declared` and `invited` approvers **do not count**. If the quorum is unsatisfiable the band is
**blocked** — never silently downgraded to one signature. This is what closes the identity hole
(declare three approvers, satisfy 2-of-2 alone).

## 4. The gate — four outcomes

| Condition | Outcome |
|---|---|
| `amount < autoApproveCents` | auto-approved, no human touched it → **this is a silence event** |
| solo band | one active approver |
| both band | all active approvers |
| critical category | all active approvers; **blocked** if fewer than 2 exist |

## 5. Await, escalate, expire

`deadlineHours` is stored **on the approval**, not read from policy at check time, so escalation
reuses the same value the approval was created with. A house that configures 1h must not get a
4h extension by accident.

At `deadlineHours`, escalate. **Two paths, and the second one is where the bug was:**

| Situation | Resolution |
|---|---|
| Someone already approved | **resolves immediately as approved.** Their signature *is* the single signature now required. Asking them to tap again is theatre, and waiting holds the cart hostage to the approver who went quiet |
| Nobody approved | sole authority goes to the owner, who must tap once |

Priority for sole authority: whoever already approved > owner > another approver.

At `deadlineHours × 2` while escalated: **expired**. The cart is saved and nothing was bought.
"Nothing is ever purchased without approval" is an invariant, not a setting.

A tap from anyone other than the sole authority while escalated is ignored and logged.

## 6. Decide

`decidedBy` is appended **in order**. The order is the data — the `authority` dimension reads it
to learn who the house defers to. A second tap from a ref that already decided is ignored.

`latencySeconds` is recorded per decision, and is `null` when no human was involved.

Rejection records **who** rejected.

## 7. Execute

A testnet transfer. Approved-but-never-executed expires; the approval does not stay open.

## 8. Write memory

`rememberBulk` into `decisions`. **Only terminal states.**

> **Invariant.** Nothing reaches Walrus before the decision resolves. Pending approvals live in
> the application database. Memory is append-only, so a pending state written is a state that can
> never be corrected.

## 9. Reconcile (background)

Read the house wallet's transaction history via Tatum Data API. Every outbound transfer must match
an approval. Unmatched transfers are classified before alerting:

| Classification | Handling |
|---|---|
| matches a recognised `rhythm` with `isCommitment: true` | **not an anomaly.** If `amount > expected`, raise a price-creep alert instead |
| matches a `rhythm` habit but off its cadence | off-rhythm alert (catches spend *below* every approval threshold) |
| neither | plain unapproved-spend event in `spend` |

Without the first row, the Reality check screen flags every subscription renewal, every month.

## 10. Derive (scheduled, daily — never per event)

See `policy-learning.md`. Scheduled rather than event-driven because: the relayer allows ~100
writes/hour (500 points ÷ 5 per `remember`); per-event derivation depends on arrival order and
makes the demo non-deterministic; and learning in cadence is the honest model.

## 11. Ratification — two-phase commit

Accepting a proposal writes to **two systems**, and Walrus has no delete.

```
signing → pending → confirmed → (then, and only then) memory write
                  → failed    → nothing superseded, NO memory write
```

**Chain first, memory second, always.** A memory write before confirmation can leave an immortal
belief marked `ratified` with no transaction behind it. The reverse order is recoverable: retry
the write, keyed by belief id.

On failure the proposal returns to pending and is safe to retry.

## Acceptance criteria

**Given** two active approvers and a both-band amount
**When** the first approves and the deadline passes
**Then** the approval resolves as `approved` with `escalated: true`, without a second tap

**Given** no one has approved
**When** the deadline passes
**Then** sole authority is the owner, taps from other approvers are ignored, and one tap from the
owner approves it

**Given** an escalated approval and no further action
**When** `deadlineHours × 2` passes
**Then** the outcome is `expired` and nothing was purchased

**Given** one active approver and a critical category
**When** an intent is classified
**Then** it is blocked, and the UI states that it stays blocked until a second approver joins

**Given** an approver taps twice
**When** the second tap lands
**Then** it is ignored and `decidedBy` still has one entry

**Given** a ratification transaction fails
**When** the failure is observed
**Then** no belief was superseded and nothing was written to Walrus

**Given** an outbound transfer matching a standing commitment at its expected amount
**When** reconciliation runs
**Then** no anomaly is raised

**Given** the same commitment at a higher amount
**When** reconciliation runs
**Then** a price-creep alert is raised naming both amounts

## Edge cases

| Case | Resolution |
|---|---|
| Two approvers tap simultaneously | first write wins; the second sees the resolved state |
| Role changes after a decision | the decision keeps the role held at decision time |
| Policy changes while an approval is open | the approval keeps the quorum it was created with |
| Emergency spend that bypasses the rule | currently read as drift. **Open question** — exception and drift are not the same thing |
