/**
 * `pnpm verify` — the proof, as a thing a reader runs rather than a page they have to believe.
 *
 * Queries the live relayer and chain and prints what is actually there: the memory count per
 * namespace, blob ids, and the onchain state. A reviewer should be able to run this on a clean
 * clone and see the same numbers the product shows.
 */
import { readFileSync } from 'node:fs';
import { health as chainHealth } from '@unwritten/chain';
import { NAMESPACES, health, listNamespaces, recall } from '@unwritten/memory';

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m?.[1] && m[2] !== undefined) process.env[m[1]] ??= m[2];
}

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const ok = (s: string) => `\x1b[32m${s}\x1b[0m`;

console.log('\n\x1b[1mUNWRITTEN · verify\x1b[0m');
console.log(dim(`  account   ${process.env.MEMWAL_ACCOUNT_ID}`));
console.log(dim(`  relayer   ${process.env.MEMWAL_SERVER_URL}`));
const SEED = process.env.SEED_VERSION ?? 'wilson-v1';
console.log(dim(`  seed      ${SEED}`));

const h = await health();
console.log(`\n  relayer   ${ok(JSON.stringify(h).slice(0, 72))}`);

const c = await chainHealth();
console.log(`  tatum     ${c.ok ? ok(`sui checkpoint ${c.checkpoint}`) : `\x1b[31m${c.error}\x1b[0m`}`);

console.log('\n  memories on Mainnet, by namespace');

/* Counts come from listNamespaces, not from recall. Recall is a semantic search with a limit and
   a relevance threshold — it answers "what is like this", never "how many are there". Using it to
   count is how a verify script reports 7 of 11 and calls it proof. */
const all = (await listNamespaces()) as { namespaces: Array<{ name: string; memory_count: number }> };
const mine = new Map(all.namespaces.map((n) => [n.name, n.memory_count]));
let total = 0;

for (const kind of [...NAMESPACES, 'marker']) {
  const ns = `${SEED}-${kind}`;
  const count = mine.get(ns) ?? 0;
  total += count;
  console.log(`    ${kind.padEnd(10)} ${String(count).padStart(3)}`);
  if (count) {
    const rows = await recall(ns as never, 'anything stored here', 2).catch(() => []);
    for (const r of rows.slice(0, 1)) console.log(dim(`       ${r.text.split('\n')[0]?.slice(0, 84)}`));
  }
}
console.log(`\n  total ${ok(String(total))}  ${total >= 10 ? ok('≥ 10, requirement met') : dim('fewer than 10')}\n`);
