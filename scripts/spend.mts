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

for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m?.[1] && m[2] !== undefined) process.env[m[1]] ??= m[2];
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

class ThrottledTransport extends JsonRpcHTTPTransport {
  override request<T>(input: Parameters<JsonRpcHTTPTransport['request']>[0]): Promise<T> {
    return spaced(() => super.request<T>(input));
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

/** Same day, same transfers. A second run on one date adds nothing. */
function seeded(date: string) {
  let h = 0;
  for (const c of date) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return () => ((h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

const today = new Date().toISOString().slice(0, 10);
const rand = seeded(today);
const weekday = new Date(today).getUTCDay();

/* A household does not spend uniformly. Groceries most days, fast food on Friday, the
   subscription once a month — which is what gives the rhythm dimension something to find. */
const plan: Array<{ to: string; mist: number; label: string; category: Category; approved: boolean }> = [];
for (const m of MERCHANTS) {
  const fires =
    m.name === 'grocer' ? rand() < 0.75
    : m.name === 'fastfood' ? weekday === 5 || rand() < 0.15
    : new Date(today).getUTCDate() === 12;
  if (!fires) continue;
  const [lo, hi] = m.mist;
  const amount = Math.round(lo + rand() * (hi - lo));
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
