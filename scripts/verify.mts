/**
 * `pnpm verify` — the proof, as a thing a reader runs rather than a page they have to believe.
 *
 * Queries the live relayer and chain and prints what is actually there: the memory count per
 * namespace, blob ids, and the onchain state. A reviewer should be able to run this on a clean
 * clone and see the same numbers the product shows.
 */
import { readFileSync } from 'node:fs';
import { health as chainHealth } from '@unwritten/chain';
import { type Namespace, NAMESPACES, health, recall } from '@unwritten/memory';

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m?.[1] && m[2] !== undefined) process.env[m[1]] ??= m[2];
}

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const ok = (s: string) => `\x1b[32m${s}\x1b[0m`;

console.log('\n\x1b[1mUNWRITTEN · verify\x1b[0m');
console.log(dim(`  account   ${process.env.MEMWAL_ACCOUNT_ID}`));
console.log(dim(`  relayer   ${process.env.MEMWAL_SERVER_URL}`));
console.log(dim(`  namespace ${process.env.MEMWAL_NAMESPACE}`));

const h = await health();
console.log(`\n  relayer   ${ok(JSON.stringify(h).slice(0, 72))}`);

const c = await chainHealth();
console.log(`  tatum     ${c.ok ? ok(`sui checkpoint ${c.checkpoint}`) : `\x1b[31m${c.error}\x1b[0m`}`);

console.log('\n  memories on Mainnet, by namespace');
let total = 0;
for (const ns of NAMESPACES) {
  try {
    const rows = await recall(ns as Namespace, 'anything stored here', 50);
    total += rows.length;
    console.log(`    ${ns.padEnd(10)} ${String(rows.length).padStart(3)}`);
    for (const r of rows.slice(0, 2)) {
      console.log(dim(`       ${r.text.split('\n')[0]?.slice(0, 84)}`));
    }
  } catch (e) {
    console.log(`    ${ns.padEnd(10)} ${(e as Error).message.slice(0, 60)}`);
  }
}
console.log(`\n  total ${ok(String(total))}  ${total >= 10 ? ok('≥ 10, requirement met') : dim('fewer than 10')}\n`);
