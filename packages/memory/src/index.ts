/**
 * The ONLY caller of the Walrus Memory SDK. One file answers "where is every Walrus write".
 *
 * Three rules this module exists to enforce, all of them structural rather than stylistic:
 *
 *  1. NOTHING IS WRITTEN BEFORE A DECISION RESOLVES. Memory is append-only with no delete, so a
 *     pending state written is a state that can never be corrected. Pending approvals live in the
 *     application database; only terminal states come through here.
 *  2. THE NEVER-WRITE LIST. No item names, no member names, no recipient addresses in clear, no
 *     rendered sentence containing a name. Identity lives in the database, which is deletable;
 *     memory stores a stable ref and the role held at the time.
 *  3. ONE DELEGATE KEY CAPS THE SYSTEM AT SIX WRITES A MINUTE. The relayer allows 30 points/min
 *     per delegate key and a `remember` costs 5, which is tighter than the 60/min account limit.
 *     A pool of keys, round-robin, is the documented fix — the relayer itself pools
 *     SERVER_SUI_PRIVATE_KEYS for exactly this reason.
 */
import { MemWal } from '@mysten-incubation/memwal';
import type { Belief, DecisionEvent, SpendEvent, TopUpEvent } from '@unwritten/fixtures';

export const NAMESPACES = ['decisions', 'spend', 'topup', 'beliefs'] as const;
export type Namespace = (typeof NAMESPACES)[number];

/** Env is read per call, never at import, so a key can be rotated without a restart. */
function keys(): string[] {
  const pool = process.env.MEMWAL_PRIVATE_KEYS?.split(',').map((k) => k.trim()).filter(Boolean);
  if (pool?.length) return pool;
  const single = process.env.MEMWAL_PRIVATE_KEY;
  if (!single) throw new Error('MEMWAL_PRIVATE_KEY (or MEMWAL_PRIVATE_KEYS) is not set');
  return [single];
}

let cursor = 0;
const cache = new Map<string, MemWal>();

/** Round-robin across the key pool so the per-key ceiling is not the system's ceiling. */
export function client(namespace: string): MemWal {
  const pool = keys();
  const key = pool[cursor++ % pool.length] as string;
  const accountId = process.env.MEMWAL_ACCOUNT_ID;
  if (!accountId) throw new Error('MEMWAL_ACCOUNT_ID is not set');
  const id = `${key.slice(0, 8)}:${namespace}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const made = MemWal.create({
    key,
    accountId,
    serverUrl: process.env.MEMWAL_SERVER_URL ?? 'https://relayer.memory.walrus.xyz',
    namespace,
  });
  cache.set(id, made);
  return made;
}

/**
 * A memory is one sentence plus its payload.
 *
 * The relayer embeds the TEXT, so storing bare JSON would make semantic recall useless — the
 * embedding of a brace-heavy string carries no meaning. The sentence drives retrieval; the JSON
 * drives reconstruction. The sentence names amounts, categories and roles, never people.
 */
function encode(sentence: string, payload: object): string {
  return `${sentence}\n${JSON.stringify(payload)}`;
}

export function decode<T>(text: string): T | null {
  const brace = text.indexOf('\n{');
  if (brace === -1) return null;
  try {
    return JSON.parse(text.slice(brace + 1)) as T;
  } catch {
    return null;
  }
}

const dollars = (c: number) => `$${(c / 100).toFixed(2)}`;

// ── writes · terminal states only ───────────────────────────────────────────

export async function writeDecision(e: DecisionEvent, ns: Namespace = 'decisions') {
  const who = e.decidedBy.length
    ? `${e.decidedBy.length} signature${e.decidedBy.length > 1 ? 's' : ''} from ${e.decidedBy.map((d) => d.role).join(' then ')}`
    : 'nobody was asked';
  const sentence =
    `${e.outcome} ${dollars(e.amountCents)} of ${e.category}, ${who}${e.latencySeconds !== null ? `, in ${e.latencySeconds} seconds` : ''}${e.escalated ? ', after escalating' : ''}.`;
  return client(ns).remember(encode(sentence, e));
}

export async function writeSpend(e: SpendEvent, ns: Namespace = 'spend') {
  const sentence =
    `${dollars(e.amountCents)} of ${e.category} left the ${e.wallet} wallet${e.hasApproval ? ' against an approval' : ' with no approval recorded'}${e.expectedCents !== undefined ? `, where ${dollars(e.expectedCents)} was expected` : ''}${e.offRhythm ? `, off its usual rhythm: ${e.offRhythm}` : ''}.`;
  return client(ns).remember(encode(sentence, e));
}

export async function writeTopUp(e: TopUpEvent, ns: Namespace = 'topup') {
  return client(ns).remember(
    encode(`${dollars(e.amountCents)} of allowance was delivered in week ${e.week}.`, e),
  );
}

/** A belief is never edited. A new version appends and names the one it replaces. */
export async function writeBelief(b: Belief, sentence: string, ns: Namespace = 'beliefs') {
  const prefix = b.supersedes ? `Revised (was ${b.supersedes}): ` : '';
  return client(ns).remember(encode(`${prefix}${sentence}`, b));
}

/** Batched, because the budget is ~100 writes an hour and a seed is dozens of them. */
export async function writeMany(
  items: Array<{ sentence: string; payload: object }>,
  ns: Namespace,
) {
  return client(ns).rememberBulk(items.map((i) => ({ text: encode(i.sentence, i.payload) })));
}

// ── reads ───────────────────────────────────────────────────────────────────

export interface Recalled<T> {
  text: string;
  distance: number;
  payload: T | null;
  /** The real Walrus blob id, resolvable on any public aggregator. */
  blobId: string;
  /** Write time as the relayer recorded it, not an event time parsed out of the text. */
  writtenAt?: string | undefined;
}

/** Any public aggregator serves it. The bytes are Seal-encrypted; that they EXIST is the proof. */
export const AGGREGATOR = 'https://aggregator.walrus-mainnet.walrus.space';
export const blobUrl = (blobId: string) => `${AGGREGATOR}/v1/blobs/${blobId}`;

/**
 * Recall weighted toward recent behaviour. Rule derivation has to weigh what the house does now
 * above what it did two months ago, and the relayer exposes that directly — a protocol-native
 * mechanism rather than a workaround.
 */
export async function recall<T>(
  ns: Namespace,
  query: string,
  limit = 20,
  recencyHalfLifeDays = 21,
): Promise<Array<Recalled<T>>> {
  const res = await client(ns).recall({
    query,
    limit,
    scoringWeights: { semantic: 0.6, recency: 0.4, recencyHalfLifeDays },
  });
  return res.results.map((r) => ({
    text: r.text,
    distance: r.distance,
    payload: decode<T>(r.text),
    blobId: r.blob_id,
    writtenAt: r.created_at,
  }));
}

export const health = (ns: Namespace = 'decisions') => client(ns).health();
/**
 * Every namespace on the account, walked to the end.
 *
 * The relayer pages this at 100 by default (500 max) and says to paginate on `has_more`, not on
 * page length. One call was enough while the account had fewer than 100 namespaces — and it had
 * exactly 100 when this was found. Every sandbox session is a new namespace, so each visitor
 * pushed the Wilson house closer to falling off page one: /proof's memory count would have dropped
 * and the sandbox's hourly budget would have stopped seeing sessions it was meant to count.
 * Same class of bug as the single page of 50 transfers in packages/chain.
 */
export async function listNamespaces(ns: Namespace = 'decisions') {
  const c = client(ns);
  const namespaces: Awaited<ReturnType<typeof c.listNamespaces>>['namespaces'] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 20; page++) {
    const r = await c.listNamespaces({ limit: 500, ...(cursor ? { cursor } : {}) });
    namespaces.push(...r.namespaces);
    if (!r.has_more || !r.next_cursor) break;
    cursor = r.next_cursor;
  }
  return { namespaces };
}
