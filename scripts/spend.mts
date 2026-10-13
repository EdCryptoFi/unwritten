/**
 * Generates real household spending on Sui mainnet, a few transfers a day.
 *
 * This exists because of a calendar problem, not a technical one. Sixty transfers made in one
 * session all carry today's timestamp, and the product tells a six-week story — the chain would
 * contradict the narrative it is meant to corroborate. Run daily from now until submission and
 * the Reality check reads transfers that genuinely happened on different days.
 *
 * The value circulates between addresses we control, so the only real cost is gas. Deterministic
 * per date: the same day always produces the same transfers, so a re-run cannot double-spend the
 * history.
 */
import { readFileSync } from 'node:fs';
import type { Category, DecisionEvent } from '@unwritten/fixtures';
import { writeDecision } from '@unwritten/memory';
import { JsonRpcHTTPTransport, SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

/* Local runs read .env.local; CI has no such file and supplies real environment variables. Either
   is fine, neither is required to exist. */
try {
  for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
    const m = l.match(/^([A-Z_]+)=(.*)$/);
    if (m?.[1] && m[2] !== undefined) process.env[m[1]] ??= m[2];
  }
} catch {
  // no .env.local — expected in CI
}

for (const k of ['TATUM_API_KEY', 'SUI_HOUSE_KEY', 'SUI_HOUSE_ADDRESS', 'MEMWAL_PRIVATE_KEY']) {
  if (!process.env[k]) {
    console.error(`\x1b[31mmissing ${k}\x1b[0m — set it in .env.local or the runner's secrets`);
    process.exit(2);
  }
}

const COMMIT = process.argv.includes('--commit');
const g = (s: string) => `\x1b[32m${s}\x1b[0m`;
const d = (s: string) => `\x1b[2m${s}\x1b[0m`;

/**
 * Through Tatum, not a public fullnode — and not by preference.
 *
 * Public Sui fullnodes have deprecated JSON-RPC ("Please migrate to gRPC or GraphQL"), which is
 * the July 2026 sunset the Walrus relayer docs also warn about. Tatum's gateway still serves it,
 * so the gateway is not a convenience here: it is the path that exists.
 */
/* Throttled, because building one transfer costs several RPC calls (resolve coins, gas, dry run)
   and the plan allows three a second. Unthrottled, the SDK 429s before it can sign anything. */
let queue: Promise<unknown> = Promise.resolve();
const spaced = <T>(fn: () => Promise<T>): Promise<T> => {
  const next = queue.then(() => new Promise((r) => setTimeout(r, 400))).then(fn);
  queue = next.catch(() => undefined);
  return next as Promise<T>;
};

/**
 * Throttled AND retried.
 *
 * The gateway intermittently answers `No healthy upstream available`: two failures in three
 * consecutive attempts, measured 13 Oct 2026. Unretried, that is a day of history gone, and the
 * history is the one thing this script cannot recreate tomorrow.
 *
 * Retries only transient faults. A `signAndExecuteTransaction` that failed for a real reason —
 * insufficient gas, a stale object — must surface, because retrying a signature is how you send
 * twice.
 */
const TRANSIENT = /no healthy upstream|502|503|504|timeout|fetch failed|ECONNRESET|socket hang up/i;

class ThrottledTransport extends JsonRpcHTTPTransport {
  override async request<T>(input: Parameters<JsonRpcHTTPTransport['request']>[0]): Promise<T> {
    let last: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await spaced(() => super.request<T>(input));
      } catch (e) {
        last = e;
        const msg = e instanceof Error ? e.message : String(e);
        if (!TRANSIENT.test(msg)) throw e;
        process.stdout.write(d(`    gateway unhealthy, retry ${attempt + 1}/3\n`));
        await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
      }
    }
    throw last;
  }
}

const client = new SuiJsonRpcClient({
  transport: new ThrottledTransport({
    url: 'https://sui-mainnet.gateway.tatum.io',
    rpc: { headers: { 'x-api-key': process.env.TATUM_API_KEY as string } },
  }),
});
const house = Ed25519Keypair.fromSecretKey(process.env.SUI_HOUSE_KEY as string);

const MERCHANTS = [
  { name: 'grocer', to: process.env.SUI_GROCER_ADDRESS!, category: 'groceries', mist: [9_000_000, 16_000_000] },
  { name: 'subs', to: process.env.SUI_SUBS_ADDRESS!, category: 'subscriptions', mist: [4_000_000, 4_000_000] },
  { name: 'fastfood', to: process.env.SUI_FASTFOOD_ADDRESS!, category: 'fastfood', mist: [6_000_000, 11_000_000] },
] as const;

/**
 * Same day, same transfers. A second run on one date adds nothing.
 *
 * The first version hashed with `h * 31 + char` and fed an LCG directly. Consecutive dates differ
 * by one character, so `h` was near-consecutive and the LCG's FIRST output — the one that decides
 * whether groceries happen — came out correlated across neighbouring days. Projecting it showed a
 * run of seven days with no groceries followed by three weeks with groceries almost daily, which
 * reads as a script someone switched on rather than as a household.
 *
 * xmur3 to avalanche the string, then mulberry32. Consecutive dates now decorrelate.
 *
 * Measured over 730 dates, on the first draw — the one that gates groceries. The old generator
 * passed every aggregate check and was broken in the only way that mattered:
 *
 *            mean   fires (want 75%)   longest run   lag-1 agreement (want 62.5%)
 *   old      0.499        74.2%            195              97.8%
 *   new      0.506        75.6%             14              62.4%
 *
 * A correct mean and a correct marginal rate hid a 98% chance of repeating yesterday's decision.
 * If this is ever touched, re-measure the last two columns, not the first two.
 */
function seeded(date: string) {
  let h = 1779033703 ^ date.length;
  for (let i = 0; i < date.length; i++) {
    h = Math.imul(h ^ date.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = (h ^ (h >>> 16)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The subscription has to actually recur, and inside the window.
 *
 * It used to fire on day-of-month 12, which meant that after 12 October it never fired again
 * before submission — so `rhythm` with `isCommitment: true`, and the price-creep detection built
 * on it, would have had no onchain evidence at all. The Spotify story is one of the product's
 * sharpest claims and the chain would not have backed it.
 *
 * Every 14 days from an anchor instead, so it recurs at least twice, and the second billing is
 * dearer than the first. That repricing is the thing to notice, and now it is a real pair of
 * transactions a reviewer can open.
 */
const SUBS_ANCHOR = Date.UTC(2026, 9, 16); // 16 Oct 2026
const SUBS_PERIOD_DAYS = 14;
const subsCycle = (date: string) => {
  const days = Math.round((new Date(date).getTime() - SUBS_ANCHOR) / 86_400_000);
  return days >= 0 && days % SUBS_PERIOD_DAYS === 0 ? days / SUBS_PERIOD_DAYS : null;
};

const today = new Date().toISOString().slice(0, 10);
const rand = seeded(today);
const weekday = new Date(today).getUTCDay();

/* A household does not spend uniformly. Groceries most days, fast food on Friday, the
   subscription once a month — which is what gives the rhythm dimension something to find. */
const plan: Array<{ to: string; mist: number; label: string; category: Category; approved: boolean }> = [];
for (const m of MERCHANTS) {
  const cycle = m.name === 'subs' ? subsCycle(today) : null;
  const fires =
    m.name === 'grocer' ? rand() < 0.75
    : m.name === 'fastfood' ? weekday === 5 || rand() < 0.15
    : cycle !== null;
  if (!fires) continue;
  const [lo, hi] = m.mist;
  /* A commitment is a fixed amount by definition, so it does not get the random band — it gets
     its list price, and 12% more from the second billing on. That step IS the price creep. */
  const amount = m.name === 'subs'
    ? Math.round(lo * (cycle && cycle > 0 ? 1.12 : 1))
    : Math.round(lo + rand() * (hi - lo));
  /* Most spending is agreed to; some is not. A household where everything reconciles has nothing
     for the Reality check to find, and one where nothing does is not a household. Roughly one in
     five goes through without a decision — which is what the product exists to notice. */
  const approved = rand() > 0.2;
  plan.push({
    to: m.to, mist: amount, approved, category: m.category as Category,
    label: `${m.category} → ${m.name}${approved ? '' : '  (no approval — deliberate)'}`,
  });
}

console.log(`\n\x1b[1mSPEND\x1b[0m  ${today}  ${COMMIT ? '\x1b[31mSENDING\x1b[0m' : d('dry run — pass --commit')}`);
if (!plan.length) { console.log(d('  nothing scheduled for today\n')); process.exit(0); }

const bal = await client.getBalance({ owner: house.toSuiAddress() });
console.log(d(`  house balance ${Number(bal.totalBalance) / 1e9} SUI`));

/**
 * Has today already been sent?
 *
 * This used to be a file on one machine, which meant the job could only ever run from that
 * machine: a second runner cannot see another's stamp, so two of them would send the same
 * deterministic transfers twice. The chain is the one place every runner can agree on, and it is
 * also the thing being asserted — so ask it.
 *
 * Refuses rather than guesses if the read fails. Sending twice is unfixable; skipping a day is
 * merely bad.
 */
if (COMMIT) {
  const { outgoingTransfers } = await import('@unwritten/chain');
  let sentToday: number;
  try {
    const prior = await outgoingTransfers(process.env.SUI_HOUSE_ADDRESS as string);
    sentToday = prior.filter(
      (t) => new Date(t.timestampMs).toISOString().slice(0, 10) === today,
    ).length;
  } catch (e) {
    console.error(`\x1b[31m  cannot read today's transfers — refusing to send blind\x1b[0m`);
    console.error(d(`  ${(e as Error).message.slice(0, 160)}`));
    process.exit(3);
  }
  if (sentToday >= plan.length) {
    console.log(d(`  ${today} already has ${sentToday} transfer(s) on chain — nothing to do\n`));
    process.exit(0);
  }
  if (sentToday > 0) {
    /* A partial day: the run died between transfers. Resuming would re-send the ones that already
       landed, because the plan is positional and the chain cannot tell us WHICH merchant was paid
       without matching addresses. Stop and let a human look. */
    console.log(`  \x1b[33m${today} has ${sentToday} of ${plan.length} already sent — partial day, stopping\x1b[0m`);
    console.log(d('  re-running would duplicate. Inspect the wallet and send the remainder by hand.\n'));
    process.exit(4);
  }
}

for (const p of plan) {
  console.log(`  ${(p.mist / 1e9).toFixed(4)} SUI  ${p.label}`);
  if (!COMMIT) continue;
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [p.mist]);
  tx.transferObjects([coin!], p.to);
  const res = await client.signAndExecuteTransaction({ signer: house, transaction: tx });
  await client.waitForTransaction({ digest: res.digest });
  console.log(d(`     ${g('✓')} ${res.digest}`));

  /* The decision is written AFTER the transfer confirms, and only when the household agreed. An
     unapproved transfer leaves no trace in memory — which is precisely why reconciliation finds
     it, and why neither side could have found it alone. */
  if (!p.approved) { console.log(d('       no decision written — this one is the anomaly')); continue; }
  const event: DecisionEvent = {
    id: `s-${today}-${p.category}`, kind: 'decision', week: 1, date: today,
    category: p.category, amountCents: Math.round(p.mist / 1000),
    quorumRequired: 'auto', decidedBy: [], outcome: 'auto',
    latencySeconds: null, escalated: false, initiatedBy: 'routine', blobId: 'pending',
  };
  await writeDecision(event, `${process.env.SEED_VERSION ?? 'wilson-v2'}-decisions` as never);
  console.log(d(`       decision written to memory`));
}
console.log('');
