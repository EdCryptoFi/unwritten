import { health } from '@unwritten/chain';
import { NextResponse } from 'next/server';

/**
 * A live Sui checkpoint, read through Tatum, used to anchor a sandbox session in time.
 *
 * Honest about its weight: this is a minor use. Tatum carries real load on /reality, where it
 * reads wallet history and surfaces spend that no approval ever covered. Here it timestamps a
 * write against a chain height a reader can verify, and nothing more.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* Cached: every call spends part of a 3-requests-a-second quota shared with the product's own
   reads, and a page that polls it would starve /reality of the budget it actually needs. */
let cached: { at: number; value: unknown } | null = null;
const TTL_MS = 15_000;

export async function GET() {
  if (cached && Date.now() - cached.at < TTL_MS) {
    return NextResponse.json(cached.value, { headers: { 'x-cache': 'hit' } });
  }
  const value = await health();
  cached = { at: Date.now(), value };
  return NextResponse.json(value, { headers: { 'x-cache': 'miss' } });
}
