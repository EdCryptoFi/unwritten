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

export async function GET() {
  const h = await health();
  return NextResponse.json(h);
}
