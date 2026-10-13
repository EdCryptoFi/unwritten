# Spec — Memory Schema

Status: audited against the code on 12 Oct 2026. Claims the code does not support are
marked **Not built** inline rather than quietly removed, because the gap is the useful
information.
Derived from `prototype/unwritten-prototype.html`.
Written in English: this document is read alongside the code by implementing agents.

## Context

Unwritten writes to Walrus Memory on Sui **Mainnet**. Three protocol facts drive every
decision below, and all three were verified in the Walrus Memory docs:

1. **There is no delete and no edit.** The SDK exposes `remember`, `rememberBulk`, `analyze`,
   `recall`, `restore`, `listNamespaces` — and nothing else. The Security Delete API is gated
   behind two server feature flags, scoped to legacy V1 blobs, and requires an owner-wallet
   signature. On the hosted relayer, assume deletion is unavailable.
2. **A namespace is not a privacy boundary.** "Delegate authorization is account-wide. A
   namespace changes the Seal identity, but it does not stop another delegate on the same
   account from requesting that key." Namespaces are organisation only.
3. **Namespaces are expensive to change.** "Choose namespaces before you write at scale."

Therefore this schema is the **only irreversible decision in the project**. A wrong screen costs
a day. A wrong memory schema costs the Mainnet seed and the provenance story with it.

## Goals

- Every belief the product shows is reconstructible from raw events held on Walrus.
- Nothing written can ever need deleting.
- Beliefs are comparable arithmetically, so supersession can be diffed rather than string-matched.

## Non-goals

- Storing pending state. Pending approvals and proposals live in the application database.
- Per-member privacy. The product's stated value is total transparency inside the house.

---

## 1. Namespaces (four)

| Namespace | Holds | Written by |
|---|---|---|
| `decisions` | terminal decision events | `house · server` delegate, on resolution |
| `spend` | onchain movements observed via Tatum | `house · server`, on reconciliation |
| `topup` | allowance distributions (the denominator) | `house · server`, on transfer |
| `beliefs` | derived rules, versioned | `house · server`, on the daily derive pass |
| `marker` | one seed marker carrying the counts | `scripts/seed.mts`, last write of a seed |

`marker` is not product data. It exists because Memory has no delete, so a second seed into the
same namespace version could not be undone — the marker is what lets a re-run refuse politely.
A seeded account therefore holds **five** namespaces; a real house would hold four.

A further namespace, `digest`, exists **on the Observer account**, never on the house account.

## 2. The never-write list

Writing any of these to memory is a defect, because it can never be withdrawn:

- item names or purchase descriptions
- member names, emails, handles, or device labels
- recipient addresses in clear
- any rendered English sentence containing a name
- any value that a "delete my data" request would have to reach

Identity lives in the application database, which is deletable. Memory stores `ref` + `role`.

## 3. Record types

### DecisionEvent — ns `decisions`

```
id              string
kind            'decision'
date            ISO date
category        enum: groceries|subscriptions|games|pets|fastfood|household|unclassified
                // CATEGORIES in packages/fixtures is the single source of truth
amountCents      int
quorumRequired  enum: auto|1-of-2|2-of-2|all
decidedBy       [{ ref, role }]     // ORDERED. The order is the data.
outcome         enum: auto|approved|rejected|expired
latencySeconds  int | null          // null when no human touched it
escalated       bool
initiatedBy     enum: member|routine|agent|reconciliation
blobId          string
```

`role` is captured **as of the decision**. A member who later changes role must not retroactively
change what the memory says about then.

`latencySeconds` is `null`, never `0`, for `outcome: auto`. Averaging zeros would corrupt the
friction dimension.

### SpendEvent — ns `spend`

```
id, kind:'spend', date, amountCents, category
recipientRef    string      // opaque ref; its label is a BELIEF, not a stored field
wallet          enum: house|dependent:<ref>
hasApproval     bool
approvalId      string | null
txDigest        string
```

An unmatched outbound transfer is a first-class event, not a gap. This namespace is how the
silence becomes data, and it is what the Reality check screen reads.

### TopUpEvent — ns `topup`

```
id, kind:'topup', week, amountCents, from:'house', to:<ref>, txDigest
```

Required, not optional. The `member_pattern` belief claims a share **of allowance**; without
inbound events the denominator is missing, the claim degrades to "share of what was spent", and
saving becomes indistinguishable from spending.

### Belief — ns `beliefs`

```
id              string      // '<key>-v<n>'
dimension       enum: value_band|silence|authority|friction|drift|member_pattern|rhythm
version         int
supersedes      string | null
fromWeek        int         // the week the pass that derived it ran in
scope           { actor: ref|'*', category: string|'*' }
confidence      0..1
evidenceCount   int
evidenceIds     [string]    // DecisionEvent ids or tx refs — the provenance drawer reads these
state           enum: observed|ratified|drifting
ratifiedTx      string | null
blobId          string
```

Plus one typed payload per dimension:

| dimension | payload |
|---|---|
| `value_band` | `thresholdCents`, `streak:[hit,total]` |
| `silence` | `thresholdCents`, `streak:[hit,total]` |
| `authority` | `signsFirst:[hit,total]` |
| `friction` | `rejections`, `windowWeeks` |
| `drift` | `statedRule`, `medianGapSeconds`, `bypassed:[hit,total]` |
| `member_pattern` | `sharePct` |
| `rhythm` | `cadence:weekly\|monthly`, `weekday?`, `medianCents`, `variancePct`, `streak`, `isCommitment` |

### The `rhythm` dimension

One dimension, two payloads, because the two cases are the same function:

- **`isCommitment: true`** — fixed amount, fixed interval (subscriptions, pet food reorders).
  Such spend **leaves the anomaly set**: a recognised standing commitment is not a missing
  approval. Without this the Reality check flags every subscription renewal, every month.
  In exchange it gains **price-creep detection**: `amountCents > expectedCents` is its own alert
  ("Spotify went from $10.99 to $12.99 — nobody approved it, nobody noticed").
- **`isCommitment: false`** — recurring habit with variable amount (Friday fast food).
  Gains **off-rhythm detection**: a $71 pizza on a Tuesday sits *below* every approval threshold,
  so no `value_band` can ever catch it. Cadence is the only dimension that can.

Scope note: the covered categories are groceries, subscriptions, games, pets and fast food.
Rent, utilities, insurance and debt are explicitly out of scope — but subscriptions have the same
shape as rent, which is why `rhythm` is required rather than optional.

A calendar is **never an input**. No recurrence picker, no month grid: a configured cadence would
make this a config app. Cadence is derived like every other rule, and the only visual is a 7×N
spend-density strip.

**No rendered sentence is ever stored.** `say(belief)` generates English at render time and
resolves refs to names from the database. This also makes v1→v2 an arithmetic diff.

### Proposal — application database, NOT memory

Proposals are mutable (`pending → accepted | rejected`) and therefore cannot live in an
append-only store. Only the outcome reaches memory: an accepted proposal produces a superseding
Belief; a rejected one produces nothing but sets `cooldownUntil` in the database.

## 4. Supersession

- A belief is never edited. A new version is written with `supersedes` pointing at the previous id.
- `visibleBeliefs()` = all beliefs minus any id that appears as another's `supersedes`.
- The chain is the product's memory-evolution timeline and is rendered from `version` + `supersedes`.
- Superseded beliefs remain readable. That is the feature, not a leak.

## 5. Acceptance criteria

**Given** a decision resolves with no human involvement
**When** it is written to `decisions`
**Then** `latencySeconds` is `null` and `initiatedBy` is `routine` or `agent`

**Given** two approvers sign in the order Sam then Alex
**When** the event is written
**Then** `decidedBy` is `[{Sam},{Alex}]` in that order, and the `authority` dimension can read it

**Given** a member's role changes after a decision
**When** that decision is recalled
**Then** it still reports the role held at decision time

**Given** a belief crosses `confidenceFloor` and `minEvidence`
**When** the daily derive pass runs
**Then** a Belief is written, and if a previous version exists it is named in `supersedes`

**Given** an outbound transfer with no matching approval
**When** reconciliation runs
**Then** a SpendEvent with `hasApproval: false` is written to `spend`

**Given** a proposal is rejected
**When** the derive pass next runs
**Then** nothing is written to memory, and the same proposal is not raised again before
`cooldownUntil`

**Given** an approval is pending
**When** anything is written
**Then** nothing reaches Walrus; pending state is database-only

**Given** a member is removed from the house
**When** their past decisions are recalled
**Then** the events still resolve structurally and render as "a former <role>", with no name

## 6. Edge cases

| Case | Resolution |
|---|---|
| Contradictory evidence, no stable rule | no belief written; `confidence` stays below the floor |
| Fewer than `minEvidence` events | no belief; the empty state states how many are still needed |
| Quorum unsatisfiable (declared-but-inactive approvers) | block the band; never downgrade silently |
| Derive pass would exceed the rate limit | Three limits, and the tightest is per-key: **30 points/min per delegate key** ÷ 5 per `remember` = **6 writes/min**. The account limits (500 points/hour, 60/min burst) bind later, at 100 writes/hour. One server key therefore caps the whole system at six writes a minute; `scripts/seed.mts` paces at 5.5s for that reason, and the relayer's own `SERVER_SUI_PRIVATE_KEYS` pool is the documented fix. `rememberBulk` exists in `packages/memory` and is the right tool for a derive pass once one is scheduled |
| Blob expiry | `walrusEpochs` default 50 × ~2 weeks on Mainnet ≈ 2 years; renew rather than rewrite |
| Seeded history | the seeder runs the real engine and is disclosed in the README |

**Not built.** The daily derive pass this spec describes as the writer of `beliefs` does not exist
as a scheduled job. Beliefs reach Mainnet through `scripts/seed.mts`, which runs the same
`policy.deriveAll` a daily pass would call — so the derivation is real and the schedule is not.
`scripts/spend.mts` is the only thing that runs daily, and it writes decisions and spend.

## 7. Open questions

- Admin transfer: one address = one MemWalAccount, so transfer means re-keying the house.
- Owner-key loss: the app keeps working (the server delegate stays valid) but revoke and freeze
  become impossible. Accepted and warned for now.
