# Unwritten

*The spending agreement your house already has.*

**[unwritten.vercel.app](https://unwritten.vercel.app)** · Track 03, Consumer Finance

Every household answers one question informally and never writes it down: **who can spend what,
alone, up to how much.** Unwritten watches real decisions, derives the agreement, and tells you
when the rule you think you have is not the rule you actually follow.

Built for **Total Recall** (Tatum × Walrus Foundation, 20 Oct – 10 Nov 2026) · Track 03, Consumer
Finance.

## Try it

**[Enter the Wilson house →](https://unwritten.vercel.app)** — a seeded six-week household, read-only. Use the week scrubber
at the bottom to watch rules form and get rewritten, and the role switcher to see what an
approver, a spender and a judge each get.

## Verify it

```bash
pnpm verify
```

Queries the live relayer and chain and prints: memory count per namespace, every blob id, the
two-account Observer comparison, and the onchain policy state. The `/proof` page carries the same
data with explorer links. **The app does not link to `/proof`** — the product is abstracted, the
evidence is findable.

### Seed disclosure

The Wilson house is seeded. A deterministic script runs **the real engine** over six weeks of
household decisions and writes them to Walrus Mainnet. Nothing is faked downstream of that script,
and every rule in the demo was derived by the same pure functions that run in production. We say
this out loud because an undisclosed seed is the kind of thing a reader is right to distrust.

## How it works

| Layer | What it does |
|---|---|
| **Walrus Memory** (Sui Mainnet) | every decision and every derived rule, append-only and versioned |
| **Tatum** Sui RPC + Data APIs | reads the household and dependent wallets; catches spend with no approval |
| **Move policy package** (Sui testnet) | the ratified agreement and approval records |
| `packages/policy` | the learning — seven dimensions, **pure functions, no LLM** |

### Two networks, on purpose

Memory is on **Mainnet**, as the hackathon requires and because it is the durable asset. The
treasury and policy contract run on **testnet**: this is a simulated family and we do not move
real funds for a demo. One environment variable switches it; there is no branching logic.

The memory is about *human decisions*, not about money. It does not need to live on the same
network as the payment rail, because the rail is swappable.

### Three protocol facts that shaped everything

1. **There is no delete and no edit.** So a rule is never mutated — a new version supersedes the
   old one and names it. The constraint became the feature: you get an honest timeline of how the
   agreement changed. And data minimisation is structural, not hygiene — we never write item
   names, member names, or anything a deletion request would have to reach. Identity lives in
   Postgres, which *is* deletable; memory stores a stable ref and the role held at the time.
2. **A namespace is not a privacy boundary.** Delegate authorization is account-wide. We use
   namespaces for organisation only, and the house's stated value is total transparency anyway.
   Differential visibility is solved by scoping the **write**: an aggregate-only digest written
   into a second, Observer-owned account.
3. **Ratification touches two systems.** Chain first, memory second, always. A memory write before
   the transaction confirms could leave an immortal rule marked `ratified` with nothing behind it.
   The reverse order is recoverable: retry the write, keyed by belief id.

## What is honest about it

- **It is useless for roughly two weeks**, by construction. Evidence has to accumulate before a
  rule can form. Empty states say how many events are still needed rather than showing nothing.
- **The owner is a single point of failure** for every policy change. An approver can accept a
  proposal; only the owner key can sign it onchain. One owner per MemWalAccount — inherent, so we
  modelled it instead of hiding it, and the UI says so.
- **A permissive first number kills the learning.** Set it to $500 and everything auto-approves,
  so there are no decisions and therefore no evidence. We cap the input; the deeper fix needs a
  regret signal we do not have.
- **Regime change is unhandled.** A new baby or a job loss invalidates every rule at once, and the
  model would drift slowly when the truth is that everything changed on a Tuesday.
- **Rent, utilities, insurance and debt are out of scope.** Subscriptions have the same shape as
  rent, which is why the `rhythm` dimension exists at all.

## Repo

```
docs/specs/      one spec per feature, Given/When/Then — code is built from these
packages/policy  the seven learning dimensions, pure functions, fully testable offline
packages/memory  the only caller of the Walrus Memory SDK
packages/chain   the only caller of Tatum
prototype/       the clickable field-discovery instrument the schema was derived from
PLAN.md          anti-drift: artifacts, build order, and 25 invariants
```

Two wrapper packages exist so that one file answers "where is every Walrus write" and one answers
"where is every Tatum read".

MIT.
