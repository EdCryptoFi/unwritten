# Unwritten — build plan

Anti-drift file. If this and the code disagree, this wins — update it in the same commit that
changes a convention.

> Named **Unwritten** on 11 Oct 2026. During the design phase the project was called *House Money*;
> that name was dropped because `housemoney.vercel.app` was already taken and because "playing with
> house money" is an idiom about spending recklessly — the inverse of this product. Earlier entries
> in `AVALIACAO-unwritten.md` use the old name.
>
> `github.com/<user>/unwritten` · `unwritten.vercel.app` · npm package will be `revealed-policy`,
> since the `unwritten` package name is taken and that name describes the mechanism better anyway.



## Artifacts

| Artifact | State |
|---|---|
| `prototype/unwritten-prototype.html` | 15 screens, role-based, clickable, fixture-driven. The field-discovery instrument |
| `docs/specs/memory-schema.md` | DONE |
| `docs/specs/onboarding.md` | TODO |
| `docs/specs/decision-flow.md` | DONE |
| `docs/specs/policy-learning.md` | DONE |
| `docs/specs/tatum-reads.md` | TODO |
| `docs/specs/observer-digest.md` | TODO |
| `docs/specs/try-it-yourself.md` | DONE |
| `docs/specs/seeding.md` | TODO — must include: every rule needs a fixture that fires it and one that does not |

| `README.md` | DONE — try-it, verify-it, seed disclosure, three protocol facts, honest limitations |
| `PLAN.md` | this file |

## The seven learning dimensions

value_band · silence · authority · friction · drift · member_pattern · rhythm

## Admin surfaces

| When | Surface | State |
|---|---|---|
| Once | create house, save key, one number, invite | designed · prototype `#onboarding` |
| Interrupting | pending approval (D1) | designed · prototype `#pending` |
| Interrupting | unapproved spend / repriced / off-rhythm (D6) | designed · prototype `#reality` |
| **Weekly** | the digest — batched proposals, drift, rhythm | designed · prototype `#digest`, interactive |
| On accept | ratification (writes policy onchain) | designed · full state machine, two-phase commit |
| Rare | revoke delegate, freeze account | designed · full flow with confirm step and live consequence |
| Audit | history (clean, no hashes) + `/proof` for judges | designed · prototype `#history` and `#proof` |

## Build order (corrected 11 Oct — frontend first)

The original order put `packages/policy` before `apps/web`, which was an architecture instinct
rather than a risk one. `packages/policy` is seven pure functions over arrays — the least risky
part of the project. **The frontend existing at all is the biggest risk**, it can be built
entirely against fixtures, and visual judgement is a serial dependency that does not parallelise.
Building it first also makes the policy easier: the fixtures define the exact shapes those
functions must produce.

1. prototype screens (fixtures) — DONE
2. `memory-schema.md`, `decision-flow.md`, `policy-learning.md`, `demo-script.md` — DONE
3. **fixtures ported to a typed module** — DONE (`packages/fixtures`, Belief is a discriminated union)
4. `apps/web` — DONE. 16 routes, all against fixtures, no backend. Role-based navigation, the
   week scrubber shared across pages, and Tatum's own design tokens (adopted from the AI Builder
   output). Verified: zero hashes in the 13 product routes, hashes only on /proof, /observer and
   /schema. Visual review and adjustment pending.
   The first version of page 1 was generated on ai.tatum.io — see EdCryptoFi/unwritten-ai-builder.
5. `packages/policy` — the seven dimensions as pure functions, asserted against the fixtures
6. `packages/memory` — DONE (wrapper, encode/decode, key pool, namespaces; roundtrip proven
   byte-identical on Mainnet). Remaining:
   a. the Wilson house reads **real memories from Mainnet** instead of fixtures. Same screens,
      same components, different source. This is what separates a working demo from a showcase.
   b. "Try it yourself" — a sandbox namespace where a visitor's taps write real memories and a
      rule is derived from their own decisions. See `try-it-yourself.md`.
   Self-serve house creation is explicitly OUT: it needs Postgres, sessions, invites and the whole
   onboarding, costs days, and moves none of the four criteria. The README says it is the
   production path.
7. testnet: mock coin, one wallet per actor, deterministic 6-week seeder
8. `packages/chain` — the four Tatum reads + Smart Wallets as gas station
9. Move: policy package + approval records (testnet)
10. `onboarding.md`, `tatum-reads.md`, `seeding.md` — written during the build, they block nothing
11. **Mainnet seed (irreversible, last)** + blog post + video

Never cut the screens.

## Invariants (violating any of these is a defect)

- Nothing reaches Walrus before a decision resolves. Pending state is database-only.
- Memory stores `ref` + `role`, never labels, names, item descriptions or clear addresses.
- Beliefs store structured scope; English sentences are generated at render time.
- The learning loop is a tested pure function, never an LLM call.
- Two keys in the whole system: house owner (client-side only) and `house · server` delegate.
- Quorum counts only `active` approvers. Unsatisfiable quorum blocks; it never downgrades.
- One env var switches network. No `if (testnet)` branches with different logic.
- Derivation runs on a daily schedule, never per event. Limits: 500 pts/hour per account
  (= 100 `remember`), 60 pts/min burst per account, and **30 pts/min per delegate key** — the
  tightest of the three. Use a POOL of 2–4 server delegate keys, round-robin, as the relayer
  itself does with `SERVER_SUI_PRIVATE_KEYS`. One key caps the system at 6 writes/min.
- No LLM in the backend. The learning is pure functions, so there is no provider to wire.
- Walrus storage needs no sponsor — the hosted relayer's server wallet pays. Sui gas does need
  one, because the family never sees a wallet: use Tatum Smart Wallets as the gas station (and
  that is the fifth Tatum use).
- A notification is a RECORD; the channel is an adapter. Only `pending_approval`,
  `unapproved_spend` and `request_resolved` interrupt — everything else waits for the digest.
  The approval deadline runs from the NOTIFICATION, never from creation: escalating someone who
  was never told is not an escalation.
- The live app must open on a landing page with a one-click entry into the seeded Wilson house.
  A first-time visitor who lands on empty onboarding sees the one screen that says "I have nothing".
- `packages/chain` is built on `server/tatum-client.mjs` from the AI Builder output, which
  documents traps worth keeping: a key works against `api.tatum.io` OR `api.tatum.dev` and the
  wrong one returns a 401 that reads as a bad key; `new Headers()` rather than spreading, because
  spreading a Headers instance yields `{}` and silently drops them; read env per call, never at
  import; derive the gateway host from the API base; no `@tatumio/tatum` SDK.
- **Everything is on Mainnet, and that was not a choice.** The spike found `sui-testnet` and
  `sui-devnet` both return 404 on this key — only `sui-mainnet` is reachable — and the Walrus
  credentials are mainnet-only too, since staging returns 401 for an account that does not exist
  on that network. Developing against staging would need a second Walrus account. Namespaces keep
  development writes away from the seeded house instead.
- Tatum rate limit is **3 requests/second** (measured: 4 of 8 consecutive calls blocked). The
  reconciliation pass is scheduled rather than reactive for this reason as well as the Walrus one.
- The keys belong to `api.tatum.io`; `api.tatum.dev` returns 401 for both, exactly as the
  reference client warns — a 401 that reads as a bad key.
- An RPC call that returns 200 with no `result` is a failure, not a pass. Treating it as success
  is how the first health check reported four passes against a host rejecting every key.
- The proof must be runnable, not just readable: `/proof` page plus `pnpm verify`, which is
  written and works — it prints the relayer health, a live Sui checkpoint, and the memory count
  per namespace.
- A memory is **one sentence plus its payload**. The relayer embeds the text, so storing bare JSON
  would make semantic recall useless: the embedding of a brace-heavy string carries no meaning.
  The sentence drives retrieval and names amounts, categories and roles — never people. The JSON
  drives reconstruction.
- Ratification is a two-phase commit: **chain first, memory second, always.** Walrus has no delete,
  so a memory write before tx confirmation can leave an immortal belief marked `ratified` with no
  tx. The reverse order is recoverable: retry the write, keyed by belief id.
- A belief is never mutated. Accepting a proposal appends v+1 with `supersedes`; v1 is untouched.
- Not every learning produces a belief. `effect:'policy'` changes policy and supersedes nothing —
  the observation stays true.
- Escalation to someone who already approved **resolves immediately**. Their signature IS the single
  signature now required; asking again is theatre and waiting holds the cart hostage.
- Nothing is pre-registered but the category enum. Recipients are classified on first contact,
  one turn, and the answer is a belief. No catalogue, no merchant list.
- Permission is by consequence, not role: labelling is open to any active member; confirming a
  standing commitment needs an approver, because it removes spend from anomaly detection.
- `unclassified` is never a commitment. It stays in the anomaly set — fail safe.
- The product never renders a hash. `/proof` carries every blobId and txDigest, and the app does
  not link to it. The provenance drawer is the one deliberate leak, phrased in human terms.
- Each role gets a different nav. A spender has three screens and no digest, reality check or keys.
- Cap (per person) decides IF approval is needed; band (per amount) decides HOW MANY signatures.
  The house number is everyone's floor of autonomy; a personal cap is an actor-scoped `value_band`
  the agent proposes and an approver ratifies. Never configured at onboarding.
- Accepting a proposal and ratifying it are two steps. Only the owner can sign, which makes the
  owner a single point of failure for every policy change. Say it in the UI, do not hide it.
- Every rule needs a fixture that FIRES it and one that does not. This has bitten three times.
- The quorum ladder starts with TWO bands. The middle band is proposed by the agent, never
  configured at onboarding.
- Drift is the rationale inside a proposal, never a card of its own. It stands alone only when the
  evidence does not say which direction to propose — and then the card says so.

## Findings from the interaction test (prototype, clickable)

Static mockups hid all three of these:

1. **The digest never emptied.** Drift was double-counted — the drift belief AND the proposal
   derived from it both rendered as cards, linked by `beliefId` all along. A section that never
   clears teaches the admin to skip the digest.
2. **The prototype was lying about supersession.** It mutated `belief.state='ratified'` in place.
   The spec says append v+1. Now it appends, and the Agreement renders the v1→v2 chain.
3. **Escalation was a dead end — a real logic bug.** Escalation grants sole authority to whoever
   already approved, but the guard rejects a second tap from the same ref, so the approval sat in
   `escalated` until it expired. The grant was unusable. Same class of bug Rosie's own simulation
   found ("escalada de aprovação que não delegava autoridade nenhuma").
   Resolution: two escalation paths — someone already approved → resolves at escalation; nobody
   approved → escalate to the owner, who must tap once.

Verified paths: approve 2-of-2 · escalate-and-resolve · escalate-and-wait · escalate-and-expire ·
non-authority tap ignored · reject · ratify-confirm · ratify-fail · reject-with-cooldown.

