# Spec — Try it yourself

Status: audited against the code on 12 Oct 2026. Claims the code does not support are
marked **Not built** inline rather than quietly removed, because the gap is the useful information
Depends on: `memory-schema.md`, `policy-learning.md`

## Context

The Wilson house is seeded and read-only. A visitor who can only look at someone else's data has
to take our word for it. "Try it yourself" closes the loop on them: a handful of taps, real writes
to Walrus Mainnet, and a rule derived from **their** decisions.

The weak version of this feature is a single Approve button that writes one blob. That proves a
write happened; it does not demonstrate the product. The thesis is that the app discovers a rule,
so the sandbox has to produce a rule.

## The loop (under a minute)

It follows the product's six-week arc, compressed. Skipping the first step was the mistake in the
first implementation: "you approve up to $41" only means something next to "you said $18".

0. **The visitor adds a household.** One tap adds Carol, who spends, and Sam, who approves. An
   agreement is between people, so the sandbox needs at least two of them present — without this
   the visitor approves three things alone and never feels that this is a household product.
1. **The visitor sets the one number** — the same question onboarding asks, and the same framing:
   you are meant to get it wrong, because the product is the app coming back to correct you.
2. Three grocery requests arrive **from Carol and Sam**, above that number, so approving them is
   a decision rather than a button.
3. Each tap writes a real `DecisionEvent` to Mainnet, into `sandbox-<sessionId>`.
4. After the third, the derive pass runs and writes a `Belief` — the same pure function that runs
   in production, with a lower `minEvidence`.
5. The screen says, about them:

   > *You approve alone up to $41 on groceries · 3 of 3*

6. **The payoff, stated plainly:** *You said $18.00. It is actually $41.00.* This is the week-five
   moment of the demo script, happening to the visitor.
7. The blob ids appear with a link to `/proof`.
8. **Quorum, taught by its limit.** A fourth request arrives in the both-signature band. The
   visitor taps approve and is told: *this needs Sam too, and Sam is not here.* The request is
   held, not refused, and nothing is bought.

   Rejected alternatives: making the visitor role-play all three members costs nine taps and
   leaves them confused; auto-approving as Sam a few seconds later is magic. Showing the product
   **refuse** is honest and costs one tap.
9. **An ending.** Without one the page simply stops. It hands off: *"That took three decisions.
   The Wilson house has twenty-six"* → the Agreement, or the Reality check.

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

## What is deliberately not in the sandbox

- **Treasury funding / claiming an amount.** Already decided: top-ups are a seeding script, not a
  product feature, and the only user-facing touch is the low-balance nudge. In a sandbox that
  lives on being short, it is a step that teaches nothing about the thesis.
- **Escalation and notification.** Described in words on the blocked card rather than played out.
  A visitor cannot wait four hours for a deadline.
- **Member invitation.** The two members appear in one tap. Invite links, sessions and roster
  states belong to the real onboarding, not to a sixty-second loop.

## Rate limits

`remember` costs 5 points; the account budget is 500 points/hour and 60/minute, and a single
delegate key is capped at 30 points/minute.

- a session writes 4 memories = **20 points**
- the account budget alone would sustain ~25 sessions/hour
- but the code caps sandbox writes at **60 memories/hour** across all visitors
  (`MAX_SANDBOX_TOTAL_PER_HOUR`), which is **15 sessions/hour** — deliberately stricter than the
  protocol limit, so a burst of curiosity on the eve of judging cannot spend the house's budget
- a session is capped at **5 writes** (`MAX_PER_SESSION`), after which the buttons disable

The per-session cap alone bounded nothing, because a new session id buys a fresh allowance. The
hourly total is the real protection, and it is measured by counting `memory_count` across every
`sandbox-*` namespace through `listNamespaces` — a counter the visitor cannot reset. If that read
fails the write is refused rather than attempted blind into a store with no delete.

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

**Given** a first-time visitor
**When** they open the page
**Then** they are asked to add a household before anything else

**Given** a visitor who has not chosen a number
**When** the household exists
**Then** they are asked for one before any request is shown

**Given** a derived rule and a request in the both-signature band
**When** the visitor approves it
**Then** it is held with an explanation naming the missing approver, and nothing is bought

**Given** a third decision
**When** the derive pass runs
**Then** a `value_band` belief is written to Mainnet, scoped to the visitor, and its blob id is shown

**Given** a derived rule
**When** it is displayed
**Then** it is shown against the number the visitor chose, not on its own

**Given** a completed session
**When** the visitor reaches the end
**Then** they are handed off to the Wilson house rather than left on a dead page

**Given** a session that has written five memories
**When** the visitor taps again
**Then** the action is refused with an explanation, not an error

**Given** the relayer returns a rate-limit response
**When** a write is attempted
**Then** the derived rule is still displayed and the write is reported as queued

**Given** any sandbox session
**When** the Wilson house is opened
**Then** its data is unchanged

## Status

Built. `apps/web/src/app/api/sandbox/route.ts` writes real `DecisionEvent` memories to Mainnet in
`sandbox-<session>` and derives with `policy.valueBand` — the production function, with
`minEvidence: 3` passed in as a knob rather than a branch in the code.

Remaining gaps:

- **Rate-limit degradation is coded but unproven.** The route refuses with an explanation when the
  hourly budget is spent, and the client shows the rule already derived. Nothing has driven the
  relayer to a real 429, so the path is reasoned rather than observed.
- **A visitor cannot return to a session.** The namespace is derived from a session id held in the
  browser; clearing it is losing it. The memories persist on Mainnet and are unreachable, which is
  honest but not useful.
