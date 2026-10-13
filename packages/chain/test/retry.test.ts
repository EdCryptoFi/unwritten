/**
 * The gateway intermittently answers `No healthy upstream available` — two failures in three
 * consecutive attempts, measured 13 Oct 2026. The retry that absorbs it was added after observing
 * the failure, and could only be confirmed by correlation: the failures stopped. That is not
 * evidence. These tests exercise the path directly.
 *
 * What matters most is the negative case. Retrying a real error — a rejected key, a malformed
 * call — buys nothing and hides the cause, and on the signing side retrying is how you send twice.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tatumRpc } from '../src/index.js';

const original = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = original;
  vi.restoreAllMocks();
});

process.env.TATUM_API_KEY ??= 'test-key';

/** A JSON-RPC reply, or a thrown/errored one, per call in order. */
function fetchReturning(...replies: Array<{ status?: number; body: unknown } | Error>) {
  const calls: number[] = [];
  globalThis.fetch = vi.fn(async () => {
    const i = calls.length;
    calls.push(i);
    const r = replies[Math.min(i, replies.length - 1)]!;
    if (r instanceof Error) throw r;
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200 });
  }) as unknown as typeof fetch;
  return () => calls.length;
}

const ok = { body: { jsonrpc: '2.0', id: 1, result: '42' } };
const unhealthy = { body: { jsonrpc: '2.0', id: 1, error: { message: 'No healthy upstream available' } } };

describe('tatumRpc retry', () => {
  it('succeeds on the first attempt without retrying', async () => {
    const count = fetchReturning(ok);
    await expect(tatumRpc('sui', 'sui_getLatestCheckpointSequenceNumber')).resolves.toBe('42');
    expect(count()).toBe(1);
  });

  it('absorbs an unhealthy upstream and returns the eventual result', async () => {
    const count = fetchReturning(unhealthy, unhealthy, ok);
    await expect(tatumRpc('sui', 'sui_getLatestCheckpointSequenceNumber')).resolves.toBe('42');
    expect(count()).toBe(3);
  });

  it('gives up after three attempts and says so', async () => {
    const count = fetchReturning(unhealthy);
    await expect(tatumRpc('sui', 'anything')).rejects.toThrow(/after 3 attempts/);
    expect(count()).toBe(3);
  });

  it('does NOT retry a rejected key — three tries at the wrong answer is just latency', async () => {
    const count = fetchReturning({ status: 401, body: { message: 'Unauthorized' } });
    await expect(tatumRpc('sui', 'anything')).rejects.toThrow(/401/);
    expect(count()).toBe(1);
  });

  it('does NOT retry a malformed call', async () => {
    const count = fetchReturning({ body: { error: { message: 'Invalid params' } } });
    await expect(tatumRpc('sui', 'anything')).rejects.toThrow(/Invalid params/);
    expect(count()).toBe(1);
  });

  it('retries a network fault', async () => {
    const count = fetchReturning(new TypeError('fetch failed'), ok);
    await expect(tatumRpc('sui', 'anything')).resolves.toBe('42');
    expect(count()).toBe(2);
  });

  it('still refuses a 200 that carries no result, and does not retry it', async () => {
    const count = fetchReturning({ body: { jsonrpc: '2.0', id: 1 } });
    await expect(tatumRpc('sui', 'anything')).rejects.toThrow(/200 with no result/);
    expect(count()).toBe(1);
  });
});
