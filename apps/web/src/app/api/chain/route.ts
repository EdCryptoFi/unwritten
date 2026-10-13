import { outgoingTransfers, suiBalance } from '@unwritten/chain';
import type { Category, DecisionEvent } from '@unwritten/fixtures';
import { recall } from '@unwritten/memory';
import { reconcile } from '@unwritten/policy';
import { NextResponse } from 'next/server';

/**
 * What actually moved, measured against what was agreed.
 *
 * Neither side answers this alone: the chain knows money left and nothing about agreement, the
 * memory knows what was agreed and nothing about whether it happened. The unmatched rows exist
 * only in the comparison — which is the difference between reading the chain and decorating with
 * it.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOUSE = process.env.SUI_HOUSE_ADDRESS ?? '';
const SEED = process.env.SEED_VERSION ?? 'wilson-v2';
const TTL_MS = 60_000;

/** Which merchant is which. The chain gives an address; the category is ours to know. */
const CATEGORY: Record<string, Category> = {
  [process.env.SUI_GROCER_ADDRESS ?? '_']: 'groceries',
  [process.env.SUI_SUBS_ADDRESS ?? '_']: 'subscriptions',
  [process.env.SUI_FASTFOOD_ADDRESS ?? '_']: 'fastfood',
};

let cache: { at: number; value: unknown } | null = null;

export async function GET() {
  if (!HOUSE) return NextResponse.json({ error: 'no house wallet configured' }, { status: 503 });
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json(cache.value, { headers: { 'x-cache': 'hit' } });
  }

  let recallError: string | null = null;
  try {
    /* Three requests a second is the whole budget, so these run in sequence rather than in
       parallel — a burst here starves the reads the product needs on the next page load. */
    const transfers = await outgoingTransfers(HOUSE, 50);
    /* The treasury figure on /reality used to be a hardcoded constant while /proof claimed Tatum
       supplied it. Reading it is cheaper than the contradiction. Degrades to null, never throws:
       a missing balance costs a KPI, an exception costs the page. */
    const mist = await suiBalance(HOUSE).catch(() => null);
    const rows = await recall<DecisionEvent>(`${SEED}-decisions` as never, 'a household decision', 100)
      .catch((e: Error) => { recallError = e.message.slice(0, 160); return []; });
    const decisions = rows.map((r) => r.payload).filter((d): d is DecisionEvent => d !== null);

    const reconciled = reconcile(transfers, decisions, CATEGORY);
    const value = {
      wallet: HOUSE,
      ...(mist === null ? {} : { balanceMist: mist.toString() }),
      transfers: transfers.length,
      decisions: decisions.length,
      reconciled: reconciled.map((r) => ({
        ...r,
        category: r.to ? (CATEGORY[r.to] ?? 'unclassified') : 'unclassified',
      })),
      readAt: new Date().toISOString(),
      ...(recallError ? { recallError } : {}),
    };
    cache = { at: Date.now(), value };
    return NextResponse.json(value, { headers: { 'x-cache': 'miss' } });
  } catch (e) {
    // Degrade, never error: /reality still renders what memory knows, and says the chain is quiet.
    return NextResponse.json(
      { wallet: HOUSE, transfers: 0, decisions: 0, reconciled: [], error: (e as Error).message.slice(0, 140) },
      { status: 200 },
    );
  }
}
