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

/**
 * Sui on Tatum's gateway is GraphQL now. Until 22 Oct 2026 the same host answered JSON-RPC; its
 * `/_methods` listing now offers only `sui-mainnet-graphql` and every JSON-RPC call returns 404
 * (while docs.tatum.io still lists JSON-RPC). The host, the key and the plan are unchanged.
 */
export const graphqlUrl = (network?: string) => `${gatewayUrl('sui', network)}/graphql`;

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

/**
 * Errors that mean "ask again", as opposed to "you are wrong".
 *
 * The gateway returns `No healthy upstream available` (JSON-RPC -16503) intermittently — measured
 * at two failures in three consecutive attempts on 13 Oct 2026. Without a retry that lands on the
 * reconciliation a reviewer is looking at, and on the daily spend run, where a failure costs a day
 * of history that cannot be recreated. A bad key or a malformed call must NOT be retried: three
 * attempts at the wrong answer is just three times the latency.
 */
const TRANSIENT = /no healthy upstream|502|503|504|timeout|fetch failed|ECONNRESET|socket hang up/i;
const RETRIES = 3;

/** GraphQL against Sui's gateway. Retries only what is worth retrying. */
export async function tatumGraphql<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
  network?: string,
): Promise<T> {
  let last: Error | undefined;

  for (let attempt = 0; attempt < RETRIES; attempt++) {
    if (attempt > 0) {
      // 400ms, 800ms. Also keeps three-a-second from being the thing that fails next.
      await new Promise((r) => setTimeout(r, 400 * 2 ** (attempt - 1)));
    }
    try {
      const res = await fetch(graphqlUrl(network), {
        method: 'POST',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: withKey({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ query, variables }),
      });
      if (!res.ok) {
        throw new Error(`graphql: HTTP ${res.status} ${(await res.text()).slice(0, 160)}`);
      }
      const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
      if (json.errors?.length) throw new Error(`graphql: ${json.errors.map((e) => e.message).join('; ')}`);
      // A 200 that carries no data is a failure the caller cannot act on. Treating it as success
      // is how `health()` reported four passes against a host that rejects every one of our keys.
      if (json.data === undefined || json.data === null) throw new Error('graphql: 200 with no data');
      return json.data;
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e));
      if (!TRANSIENT.test(last.message)) throw last;
    }
  }
  throw new Error(`${last?.message ?? 'graphql: failed'} (after ${RETRIES} attempts)`);
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
    const d = await tatumGraphql<{ checkpoint: { sequenceNumber: number } }>(
      '{ checkpoint { sequenceNumber } }',
    );
    return { base, ok: true, status: 200, checkpoint: String(d.checkpoint.sequenceNumber) };
  } catch (e) {
    return { base, ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── the four reads the product needs ────────────────────────────────────────

/** Sui RPC · the ratified policy object. */
export interface OutgoingTransfer {
  digest: string;
  /** Milliseconds since epoch, as the chain recorded it — not a date we chose. */
  timestampMs: number;
  /** Positive MIST that left the wallet, gas included. */
  mist: number;
  to: string | null;
}

/**
 * The wallet's outgoing transfers — the reconciliation's only source of truth about money.
 *
 * Read through Tatum's gateway, which serves Sui as GraphQL: the Data API does not cover Sui
 * (`/v4/data/...` answers with the list of chains it accepts and Sui is not among them), and
 * public fullnodes deprecated JSON-RPC in July 2026. Until 22 Oct this was `suix_queryTransactionBlocks`
 * over the same host; the gateway dropped JSON-RPC and the daily job and Reality check began to 404.
 *
 * The plan allows three requests a second, so anything polling this must be throttled. The
 * reconciliation pass is scheduled rather than reactive for that reason as well as the Walrus one.
 */
interface TxPage {
  transactions: {
    pageInfo: { hasPreviousPage: boolean; startCursor: string | null };
    nodes: Array<{
      digest: string;
      effects: {
        timestamp: string | null;
        balanceChanges: { nodes: Array<{ amount: string; owner: { address: string } | null }> };
      } | null;
    }>;
  };
}

const TRANSFERS = `query ($address: SuiAddress!, $n: Int!, $before: String) {
  transactions(last: $n, before: $before, filter: { sentAddress: $address }) {
    pageInfo { hasPreviousPage startCursor }
    nodes { digest effects { timestamp balanceChanges { nodes { amount owner { address } } } } }
  }
}`;

export async function outgoingTransfers(address: string, limit = 200): Promise<OutgoingTransfer[]> {
  /* Paginated, and that is not premature. A page is capped, and `last`/`before` walks newest-first
     (nodes inside a page are oldest-first, so each page is reversed). The daily spend script adds
     a couple of transfers a day, so one unpaginated page silently starts dropping the OLDEST days
     the moment the history passes the page size — which is precisely the six-week history the
     reconciliation exists to read. */
  const out: OutgoingTransfer[] = [];
  let before: string | null = null;

  for (let page = 0; page < 10 && out.length < limit; page++) {
    const res: TxPage = await tatumGraphql<TxPage>(TRANSFERS, {
      address, n: Math.min(50, limit - out.length), before,
    });
    const { nodes, pageInfo } = res.transactions;

    for (const t of [...nodes].reverse()) {
      const changes = t.effects?.balanceChanges.nodes ?? [];
      // The negative change is what left this address; the positive one is where it landed.
      const spent = changes.find((b) => b.amount.startsWith('-'));
      if (!spent) continue;
      const received = changes.find((b) => !b.amount.startsWith('-'));
      out.push({
        digest: t.digest,
        timestampMs: t.effects?.timestamp ? Date.parse(t.effects.timestamp) : 0,
        mist: Math.abs(Number(spent.amount)),
        to: received?.owner?.address ?? null,
      });
    }

    if (!pageInfo.hasPreviousPage || !pageInfo.startCursor) break;
    before = pageInfo.startCursor;
  }
  return out;
}

/** Sui GraphQL · every coin type the address holds. */
export async function balance(address: string) {
  const d = await tatumGraphql<{
    address: { balances: { nodes: Array<{ coinType: { repr: string }; totalBalance: string }> } } | null;
  }>(
    'query ($a: SuiAddress!) { address(address: $a) { balances { nodes { coinType { repr } totalBalance } } } }',
    { a: address },
  );
  return (d.address?.balances.nodes ?? []).map((n) => ({ coinType: n.coinType.repr, totalBalance: n.totalBalance }));
}

/**
 * The SUI balance in MIST, for the low-treasury nudge.
 *
 * All coin types in one call so an address that will eventually hold WAL is covered too. An
 * address with no coins returns an empty list, not a zero entry, so a missing coin type is 0n
 * rather than an error — a fresh wallet is not a failure.
 */
export async function suiBalance(address: string): Promise<bigint> {
  const all = await balance(address);
  // The gateway spells the type in full (0x000…02::sui::SUI); older readers wrote 0x2::sui::SUI.
  const sui = all.find((c) => /^0x0*2::sui::SUI$/.test(c.coinType));
  return sui ? BigInt(sui.totalBalance) : 0n;
}
