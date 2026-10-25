# Unwritten — build plan

Anti-drift file. If this and the code disagree, this wins — update it in the same commit that
changes a convention.

> Named **Unwritten** on 11 Oct 2026. During the design phase the project was called *House Money*;
> that name was dropped because `housemoney.vercel.app` was already taken and because "playing with
> house money" is an idiom about spending recklessly — the inverse of this product. Earlier entries
> in the private planning notes use the old name.
>
> `github.com/EdCryptoFi/unwritten` · deployed at `unwritten-house.vercel.app` — the exact
> `unwritten.vercel.app` was already taken by another Vercel account, confirmed by three
> independent checks (alias rejection, domain inspect, and the project-level allocation model)
> rather than assumed from a 404. No npm package was published; `revealed-policy` was a
> placeholder name from before the decision to keep policy as an internal workspace package.



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
   week scrubber shared across pages. (Its colours were first the AI Builder's tokens and were
   later replaced by the claymorphism system in `templates/`; the token *names* remain.) Verified: zero hashes in the 13 product routes, hashes only on /proof, /observer and
   /schema. Visual review and adjustment pending.
   The first version of page 1 was generated on ai.tatum.io — see EdCryptoFi/unwritten-ai-builder.
5. `packages/policy` — the seven dimensions as pure functions, asserted against the fixtures
6. `packages/memory` — DONE (wrapper, encode/decode, key pool, namespaces; roundtrip proven
   byte-identical on Mainnet). Remaining:
   a. DONE — the Wilson house reads real memories from Mainnet. All seven screens go through
      `useHouse()`, so the source is swapped in one place, and the sidebar shows which it is.
      Fixtures remain as a labelled fallback, never a silent one.
   b. "Try it yourself" — a sandbox namespace where a visitor's taps write real memories and a
      rule is derived from their own decisions. See `try-it-yourself.md`.
   Self-serve house creation is explicitly OUT: it needs Postgres, sessions, invites and the whole
   onboarding, costs days, and moves none of the four criteria. The README says it is the
   production path.
7. the seeder — DONE. `pnpm seed --commit` wrote 50 memories to Mainnet as `wilson-v2`, with all seven beliefs derived by packages/policy rather than copied (7/7 agree with the screens)
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
- **Counting memories is `listNamespaces`, never `recall`.** Recall is a semantic search with a
  limit and a relevance threshold: it answers "what is like this", never "how many are there".
  Using it to count is how a verify script reports 7 of 11 and calls it proof.
- A seed is **versioned, never repaired.** Memory has no delete, so a half-written namespace is
  abandoned and the version bumped. `wilson-v1` died that way — a backgrounded run was killed with
  its parent process. Run the seed in the foreground; it takes about four minutes.
- The relayer **indexes asynchronously**: counts lag the last writes by roughly a minute. A verify
  run immediately after a seed under-reports, and that is not a failure.
- Anything that reaches Mainnet is permanent, so the write path is validated as hostile: fields
  are checked at runtime rather than cast, the account's hourly budget is counted across every
  `sandbox-*` namespace before a write, and validation runs before the budget call so junk costs
  nothing. A per-session cap bounds nothing on its own — a new id makes a new namespace.
- **Public Sui fullnodes deprecated JSON-RPC in July 2026** and answer "migrate to gRPC or
  GraphQL". Tatum's gateway served it until 22 Oct 2026, then moved Sui to GraphQL (same host, `/graphql`;
  JSON-RPC now 404s, docs.tatum.io still lists it). The gateway is the path that exists, for
  reads and for signing both.
- **Tatum's Data API does not cover Sui.** `/v4/data/...` replies with the chains it accepts and
  Sui is not among them. Wallet history comes from `transactions · sentAddress` over the gateway's GraphQL.
- Building one transfer costs several RPC calls, and the plan allows three a second. The SDK 429s
  before it can sign unless the transport is queued.
- Reconciliation matches by **day and recipient, never by amount**: a decision records what was
  agreed and what leaves the wallet includes gas, so matching on amounts would report every honest
  purchase as an anomaly.
- The daily spend script leaves roughly one transfer in five with no decision behind it. A
  household where everything reconciles gives the Reality check nothing to find, and one where
  nothing does is not a household.
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
  not link to it from product screens. A provenance drawer was designed as the one deliberate leak,
  phrased in human terms; it is not built.
- Each role gets a different nav. A spender gets a short menu and no digest, reality check, keys or oversight screens.
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
- A proof that only exists in terminal output is not a proof. The derivation check printed during
  `seed --commit`, which can never be re-run — Memory has no delete — so no reviewer could ever
  see the single strongest claim in the project. Anything load-bearing runs in the browser.
- There is exactly ONE definition of "derive the house's beliefs" (`policy.deriveAll`). The seeder
  and `/proof` call it. If they could drift, the claim that nothing is hardcoded is unverifiable.
- The rubric and the submission checklist are different documents. Build for both: `/judge` is the
  tour, and `/proof` opens by answering the checklist in the organisers' own words.
- Links published after the code freezes (blog post, video) live in `lib/links.ts` as nullable. A
  null renders as "not published yet". A 404 in front of a reviewer is worse than an absence.
- Every claim in the README, the description and the blog post has a call site in the code, named.
  Five documents once said Tatum's Data API reads the house wallet while `packages/chain` carried
  a comment explaining it does not cover Sui. Docs drift; the code is the source of truth.
- A capability claimed in the architecture table exists, or it is in "What is honest about it".
  The Move package was listed for weeks and never written.
- A Tatum read that nothing branches on is decoration.
- Uncommitted work is unverified work. A full design-system port (globals.css, primitives.tsx)
  sat in the working tree across a session boundary, never built or typechecked, and carried a
  real bug (`BadgeTone` renamed `gray`→`neutral` with five call sites left on the old name).
  `git status` before trusting "this already looks done"; commit or stash at the end of a session.
- A page wrapped in the shared `Shell` inherits its styling for free through `Card`/`Page`/`Badge`
  from `primitives.tsx` — upgrade the primitive once rather than each page. The home page is the
  one screen that doesn't use them, which is why it was the one that needed a real rewrite.
- A demo claim is clicked on the DEPLOYED site, not asserted from the code. "Drag the weeks and watch
  the rules form" was promised in the README, the home page, the judge page and the video script,
  and on production the control showed nothing for weeks 1–5 — Mainnet held one derivation, the
  fixtures held a hand-written story, and only the fixtures had been tested. Dragging it on the live
  URL took ten seconds. Rules for each week now come from `policy.replay` over the decisions on
  Mainnet.
- A simulation never writes a log line that claims a write. The digest said "memory write: belief
  v+1 appended" and wrote nothing; three documents repeated it. Anything simulated says SIMULATED
  where it runs.
- Do the arithmetic twice, from the constant. "$1.00 = 0.0003 SUI" was off by ten times, in three
  places, one of them in a comment explaining why the scale was declared.
- One MemWal account per application. A delegate key reads every namespace on its account, so the
  server holding it can read everything else the account has ever stored. This account is shared
  with earlier projects, which is a known gap: the plan is a dedicated account for this app.
- A storage claim is read from the chain, not from the SDK's docs. /proof said "50 epochs ≈ 2 years";
  Walruscan shows the relayer paid for 15. Link the record instead of restating it.
- Every outward link is opened in a real browser before it ships. A 200 title from a single-page
  app proves nothing (Walruscan answers 200 for a blob that does not exist), and an explorer behind
  a bot challenge (SuiVision) fails a reviewer's link checker.
- Scale and time are declared once and shared. The daily job divided MIST by 1000 inline and
  stamped every decision week 1; both now come from fixtures (`MIST_PER_CENT`, `weekOf`).
- A check must be able to fail. The derivation comparator cut sentences at "· n of m", so it could
  not see the numbers after the count — and reported 7 of 7 while the screen and Mainnet disagreed.
  Every comparator gets a test that tampers with the input and expects a failure.
- Same function AND same input. Re-deriving from today's decisions and comparing with beliefs
  derived from the seed is a different question; ask it separately, and label the answer.
- Every list endpoint is paginated until proven otherwise. Two were single calls — transfers (50)
  and namespaces (100) — and the namespace one had already crossed its boundary when found.
- A number typed into a page drifts. The home page showcase is read from the same beliefs the
  rule screen renders.
- A guided path is tested by walking it the way a visitor arrives. The judge door set the role to
  "judge" and stop two of the judge's own path was gated to household adults — no page was broken
  on its own, only the sequence was. Each tour stop now names the role it needs (`lib/tours.ts`).
- A simulation is disclosed on the screen that runs it. `/keys` rehearses revocation locally, for a
  good reason, and said nothing about it until the judge copy was checked against the code.
- Screenshot mobile, don't reason about it. The sidebar's full nav list pushed all home-page
  content below the fold on a phone — invisible in a desktop-only review, obvious in one shot.
 The balance was claimed, exported, and
  never called, while the UI showed a hardcoded constant.
- A cast is where a bug hides. `['games', 'apparel'] as Category[]` compiled for weeks against a
  category that does not exist, and the probe silently derived nothing. Annotate the type; do not
  cast the value.
- An exported function nothing calls is a claim about behaviour the code does not have. Two were
  found in one day (`chain.readObject`, `policy.recencyWeight`). Delete, or call it.
- A spec is audited against the code, not trusted. Four were written from the plan and three had
  drifted; one of them asserted a universal gate the code never implemented.
- Never run `biome format --write` on this repo. The formatter's defaults disagree with the
  hand-written style, and a lint fix once became a 2400-line reformat of untouched files eight
  days from the deadline. `biome check` for lint; fix what it reports by hand.

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

