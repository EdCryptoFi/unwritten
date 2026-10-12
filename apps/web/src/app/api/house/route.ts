import type { Belief, DecisionEvent, SpendEvent, TopUpEvent } from '@unwritten/fixtures';
import { listNamespaces, recall } from '@unwritten/memory';
import { NextResponse } from 'next/server';

/**
 * The Wilson house, read from Walrus Mainnet rather than from fixtures.
 *
 * This is what separates a working demo from a showcase: the screens render the same memories a
 * reviewer can count with `pnpm verify` and resolve by blob id on `/proof`.
 *
 * Cached in the module for a few minutes. A recall costs one point against 500 an hour, so the
 * cost is not the problem — latency is. A page that takes three seconds to show the agreement
 * ruins the one interaction the film depends on.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SEED = process.env.SEED_VERSION ?? 'wilson-v2';
const TTL_MS = 5 * 60_000;

interface House {
  source: 'mainnet';
  seed: string;
  counts: Record<string, number>;
  decisions: DecisionEvent[];
  spend: SpendEvent[];
  topups: TopUpEvent[];
  beliefs: Belief[];
}

let cache: { at: number; value: House } | null = null;

/** The stored payload carries a placeholder blob id; the REAL one comes back with the recall. A
    proof page showing the placeholder is a proof page showing a string that resolves to nothing. */
async function readAll<T>(kind: string, query: string): Promise<Array<T & { blobId: string; writtenAt?: string | undefined }>> {
  const rows = await recall<T>(`${SEED}-${kind}` as never, query, 100).catch(() => []);
  return rows
    .filter((r) => r.payload !== null)
    .map((r) => ({ ...(r.payload as T), blobId: r.blobId, writtenAt: r.writtenAt }));
}

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json(cache.value, { headers: { 'x-cache': 'hit' } });
  }

  const [decisions, spend, topups, beliefs] = await Promise.all([
    readAll<DecisionEvent>('decisions', 'an approved or auto-approved household decision'),
    readAll<SpendEvent>('spend', 'money that left a wallet'),
    readAll<TopUpEvent>('topup', 'allowance delivered'),
    readAll<Belief>('beliefs', 'a rule the house follows'),
  ]);

  // Counts come from listNamespaces, never from the recall above: recall is a semantic search
  // with a limit, so it answers "what is like this" rather than "how many are there".
  const all = (await listNamespaces().catch(() => ({ namespaces: [] }))) as {
    namespaces: Array<{ name: string; memory_count: number }>;
  };
  const counts = Object.fromEntries(
    all.namespaces.filter((n) => n.name.startsWith(SEED)).map((n) => [n.name.slice(SEED.length + 1), n.memory_count]),
  );

  const value: House = {
    source: 'mainnet', seed: SEED, counts,
    decisions: decisions.sort((a, b) => a.date.localeCompare(b.date)),
    spend, topups,
    beliefs: beliefs.sort((a, b) => a.fromWeek - b.fromWeek),
  };
  cache = { at: Date.now(), value };
  return NextResponse.json(value, { headers: { 'x-cache': 'miss' } });
}
