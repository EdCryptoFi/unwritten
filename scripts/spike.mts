/**
 * The smallest thing that proves the pipe works, end to end:
 *   1. a Tatum Sui RPC call that returns a real number
 *   2. a Walrus Memory write to STAGING
 *   3. the same memory read back
 *
 * None of this is product. It exists so that a failure is discovered now rather than on the
 * third of November, and so the two credentials are each proven independently.
 */
import { readFileSync } from 'node:fs';
import { health, tatumRpc } from '@unwritten/chain';

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m?.[1] && m[2] !== undefined) process.env[m[1]] ??= m[2];
}

const ok = (s: string) => console.log(`  \x1b[32m✓\x1b[0m ${s}`);
const bad = (s: string) => console.log(`  \x1b[31m✗\x1b[0m ${s}`);

async function tatum() {
  console.log(`\n── 1. Tatum · Sui RPC ${'─'.repeat(42)}`);
  // Which host does the key belong to? The wrong one 401s in a way that reads as a bad key.
  for (const base of ['https://api.tatum.io', 'https://api.tatum.dev']) {
    for (const [label, key] of [
      ['TATUM_API_KEY', process.env.TATUM_API_KEY],
      ['TATUM_API_KEY_ALT', process.env.TATUM_API_KEY_ALT],
    ] as const) {
      if (!key) continue;
      process.env.TATUM_API_BASE = base;
      process.env.TATUM_API_KEY = key;
      const h = await health();
      if (h.ok) ok(`${label} on ${base} → checkpoint ${h.checkpoint}`);
      else bad(`${label} on ${base} → ${h.error?.slice(0, 90)}`);
    }
  }
}

async function walrus() {
  console.log(`\n── 2. Walrus Memory · staging ${'─'.repeat(34)}`);
  const { MEMWAL_ACCOUNT_ID, MEMWAL_PRIVATE_KEY, MEMWAL_SERVER_URL } = process.env;
  if (!MEMWAL_ACCOUNT_ID || !MEMWAL_PRIVATE_KEY) return bad('credentials missing');

  const { MemWal } = await import('@mysten-incubation/memwal');
  const memwal = MemWal.create({
    key: MEMWAL_PRIVATE_KEY,
    accountId: MEMWAL_ACCOUNT_ID,
    serverUrl: MEMWAL_SERVER_URL,
    namespace: process.env.MEMWAL_NAMESPACE ?? 'unwritten-dev',
  });

  const h = await memwal.health();
  ok(`health → ${JSON.stringify(h).slice(0, 120)}`);

  const probe = `spike probe ${new Date().toISOString()}: the house approves alone up to $45 on groceries`;
  const job = await memwal.remember(probe);
  ok(`remember queued → ${JSON.stringify(job).slice(0, 100)}`);

  const done = await memwal.waitForRememberJob((job as { job_id: string }).job_id);
  ok(`stored → ${JSON.stringify(done).slice(0, 140)}`);

  const recalled = await memwal.recall({ query: 'what does the house approve alone?', limit: 3 });
  const hits = (recalled as { results?: Array<{ text: string; distance: number }> }).results ?? [];
  if (hits.length) ok(`recall → ${hits.length} hit(s), closest: "${hits[0]?.text.slice(0, 70)}…"`);
  else bad('recall returned nothing');
}

console.log('\n\x1b[1mSPIKE\x1b[0m — proving the pipe before the window opens');
await tatum().catch((e) => bad(`tatum threw: ${e.message}`));
await walrus().catch((e) => bad(`walrus threw: ${e.message}`));
console.log('');
