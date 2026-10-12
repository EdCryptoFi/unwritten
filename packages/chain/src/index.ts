/**
 * The ONLY caller of Tatum in this codebase. One file answers "where is every Tatum read".
 *
 * Built on the reference client Tatum's own AI Builder generated for this project
 * (EdCryptoFi/unwritten-ai-builder, server/tatum-client.mjs). Its comments document traps that
 * would each have cost hours, and they are preserved here because they are not obvious:
 *
 *  - a key works against api.tatum.io OR api.tatum.dev, never both, and the wrong one returns a
 *    401 that reads as a bad key
 *  - `new Headers()`, never a spread: spreading a Headers instance or an array of pairs yields {}
 *    and silently drops them. Setting the key last also stops a caller overriding it
 *  - read env per call, not at import, so a key can be rotated without a restart
 *  - derive the gateway host from the API base, so the gateway follows the API's environment
 *  - no @tatumio/tatum SDK; plain fetch
 */

export class MissingApiKeyError extends Error {
  constructor() {
    super('TATUM_API_KEY is not set');
    this.name = 'MissingApiKeyError';
  }
}

const TIMEOUT_MS = 20_000;

export const apiBase = () =>
  (process.env.TATUM_API_BASE || 'https://api.tatum.io').replace(/\/+$/, '');

/** api.tatum.io -> tatum.io, so the gateway follows the API base's environment. */
const domain = () => new URL(apiBase()).hostname.replace(/^api\./, '');

export const gatewayUrl = (chain: string, network = process.env.SUI_NETWORK || 'testnet') =>
  `https://${chain}-${network}.gateway.${domain()}`;

function apiKey(): string {
  const key = process.env.TATUM_API_KEY;
  if (!key) throw new MissingApiKeyError();
  return key;
}

function withKey(headers?: HeadersInit): Headers {
  const h = new Headers(headers);
  h.set('x-api-key', apiKey());
  return h;
}

/** REST / Data API. `path` is everything after the origin. */
export async function tatumFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${apiBase()}${path.startsWith('/') ? path : `/${path}`}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    ...init,
    headers: withKey(init.headers),
  });
}

/** JSON-RPC against a chain's gateway. */
export async function tatumRpc<T = unknown>(
  chain: string,
  method: string,
  params: unknown[] = [],
  network?: string,
): Promise<T> {
  const res = await fetch(gatewayUrl(chain, network), {
    method: 'POST',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: withKey({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) {
    throw new Error(`${method}: HTTP ${res.status} ${(await res.text()).slice(0, 160)}`);
  }
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(`${method}: ${json.error.message}`);
  // A 200 that carries no result is a failure the caller cannot act on. Treating it as success is
  // how `health()` reported four passes against a host that rejects every one of our keys.
  if (json.result === undefined) throw new Error(`${method}: 200 with no result`);
  return json.result;
}

/**
 * A present key says nothing about egress, so make a real request. Also resolves which host the
 * key belongs to, since the wrong one is indistinguishable from a bad key.
 */
export async function health(): Promise<{
  base: string; ok: boolean; status: number; checkpoint?: string; error?: string;
}> {
  const base = apiBase();
  try {
    const checkpoint = await tatumRpc<string>('sui', 'sui_getLatestCheckpointSequenceNumber');
    return { base, ok: true, status: 200, checkpoint };
  } catch (e) {
    return { base, ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── the four reads the product needs ────────────────────────────────────────

/** Sui RPC · the ratified policy object. */
export const readObject = (id: string) =>
  tatumRpc('sui', 'sui_getObject', [id, { showContent: true, showOwner: true }]);

/**
 * Data API · a wallet's transaction history → spend with no matching approval.
 *
 * The plan allows 3 requests a second, so anything that polls this has to be throttled; the
 * reconciliation pass is scheduled rather than reactive for that reason as well as the Walrus one.
 */
export async function walletTransactions(address: string, pageSize = 50) {
  const chain = `sui-${process.env.SUI_NETWORK || 'mainnet'}`;
  const res = await tatumFetch(
    `/v4/data/transaction/history?chain=${chain}&addresses=${address}&pageSize=${pageSize}`,
  );
  if (!res.ok) {
    throw new Error(`walletTransactions: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}

/** Sui RPC · balances, used for the low-treasury nudge. */
export const balance = (address: string) => tatumRpc('sui', 'suix_getAllBalances', [address]);
