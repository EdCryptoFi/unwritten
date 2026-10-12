# Spec — Try it yourself

Status: draft
Depends on: `memory-schema.md`, `policy-learning.md`

## Context

The Wilson house is seeded and read-only. A visitor who can only look at someone else's data has
to take our word for it. "Try it yourself" closes the loop on them: a handful of taps, real writes
to Walrus Mainnet, and a rule derived from **their** decisions.

The weak version of this feature is a single Approve button that writes one blob. That proves a
write happened; it does not demonstrate the product. The thesis is that the app discovers a rule,
so the sandbox has to produce a rule.

## The loop (under a minute)

1. The visitor is shown three grocery requests, each already in the ambiguous band.
2. Each tap writes a real `DecisionEvent` to Mainnet, into `sandbox-<sessionId>`.
3. After the third, the derive pass runs and writes a `Belief` — the same pure function that runs
   in production, with a lower `minEvidence`.
4. The screen says, about them:

   > *You approve alone up to $41 on groceries · 3 of 3*

5. The blob ids appear with a link to verify, and the same data is reachable from `/proof`.

Four real memories, one loop, and the uncanny moment happens to the visitor rather than to a
fictional family.

## Why a separate namespace

Writes never touch the Wilson house:

- the seed stays clean, so the demo video and the screenshots keep matching
- the account's rate budget is not spent by curious visitors on the eve of judging
- a visitor's data is theirs and is not mixed into the narrative house

## Different knobs, stated out loud

The sandbox runs with `minEvidence: 3` instead of 8, because nobody will tap eight times. The
screen says so:

> *The sandbox forms a rule after three decisions instead of eight, so you don't have to tap all
> day. Everything else is the production path.*

This is not a shortcut hidden from the reader — it also demonstrates that the learning knobs are
configuration rather than hardcoded constants.

## Rate limits

`remember` costs 5 points; the account budget is 500 points/hour and 60/minute, and a single
delegate key is capped at 30 points/minute.

- a session writes 4 memories = **20 points**
- the account therefore sustains **~25 sessions/hour**
- a session is capped at **5 writes**, after which the buttons disable

With a pool of 2+ server delegate keys the account limit binds rather than the key limit.

**Degrade, never error.** If the relayer rate-limits, the screen shows the rule the session had
already derived and says the write is queued — it must not show a stack trace to a reviewer.

## Acceptance criteria

**Given** a first-time visitor
**When** they open Try it yourself
**Then** a fresh `sandbox-<sessionId>` namespace is used and no Wilson house data is visible

**Given** two decisions recorded
**When** the derive pass runs
**Then** no rule is written and the screen states how many more are needed

**Given** a third decision
**When** the derive pass runs
**Then** a `value_band` belief is written to Mainnet, scoped to the visitor, and its blob id is shown

**Given** a session that has written five memories
**When** the visitor taps again
**Then** the action is refused with an explanation, not an error

**Given** the relayer returns a rate-limit response
**When** a write is attempted
**Then** the derived rule is still displayed and the write is reported as queued

**Given** any sandbox session
**When** the Wilson house is opened
**Then** its data is unchanged
