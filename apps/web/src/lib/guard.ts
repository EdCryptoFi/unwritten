import { CATEGORIES, type Category } from '@unwritten/fixtures';
import { listNamespaces } from '@unwritten/memory';

/**
 * Everything that reaches Walrus Mainnet is PERMANENT and unremovable, so the write path is
 * validated as if it were hostile — because it is reachable by anyone with curl.
 *
 * Four things this guards, each found by auditing the route rather than by imagining it:
 *
 *  1. Unvalidated fields. `category` and `cents` went from the request body into the sentence and
 *     the JSON with only a TypeScript cast, which does not exist at runtime. Arbitrary text could
 *     be written to our account forever.
 *  2. A session cap that resets. The per-session limit was real, but a new session id made a new
 *     namespace and a fresh allowance — so the cap bounded nothing. The global budget below is
 *     what actually protects the account.
 *  3. No per-caller limit at all.
 *  4. An unthrottled read path that spends the Tatum quota (3 requests a second).
 */

export const MAX_PER_SESSION = 5;
/** The relayer allows 500 points an hour and a `remember` costs 5. Leave room for the product. */
export const MAX_SANDBOX_TOTAL_PER_HOUR = 60;
export const MAX_PER_IP_PER_HOUR = 10;

const CENTS_MIN = 100;
const CENTS_MAX = 2_000_00;

export type Valid = { ok: true; session: string; taps: Tap[]; cap: number };
export type Invalid = { ok: false; status: number; error: string };
export interface Tap { cents: number; category: Category; from: string }

const isCategory = (v: unknown): v is Category =>
  typeof v === 'string' && (CATEGORIES as readonly string[]).includes(v);

const isCents = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= CENTS_MIN && v <= CENTS_MAX;

/** Validated, not cast. A cast is a comment that the compiler deletes. */
export function parseBody(body: unknown): Valid | Invalid {
  if (typeof body !== 'object' || body === null) return { ok: false, status: 400, error: 'bad body' };
  const b = body as Record<string, unknown>;

  const session = typeof b.session === 'string' ? b.session.replace(/[^a-z0-9]/gi, '').slice(0, 12) : '';
  if (session.length < 4) return { ok: false, status: 400, error: 'bad session' };

  if (!isCents(b.cap)) return { ok: false, status: 400, error: 'cap out of range' };

  if (!Array.isArray(b.taps) || b.taps.length === 0 || b.taps.length > MAX_PER_SESSION) {
    return { ok: false, status: 400, error: 'taps out of range' };
  }
  const taps: Tap[] = [];
  for (const raw of b.taps) {
    if (typeof raw !== 'object' || raw === null) return { ok: false, status: 400, error: 'bad tap' };
    const t = raw as Record<string, unknown>;
    if (!isCents(t.cents)) return { ok: false, status: 400, error: 'amount out of range' };
    if (!isCategory(t.category)) return { ok: false, status: 400, error: 'unknown category' };
    // `from` only ever picks a label on screen; it never reaches memory, which stores the role.
    const from = typeof t.from === 'string' && t.from.length <= 24 ? t.from : 'member';
    taps.push({ cents: t.cents, category: t.category, from });
  }
  return { ok: true, session, taps, cap: b.cap };
}

/**
 * The real protection. A per-session cap resets with a new id; the account's hourly budget does
 * not. Counting every `sandbox-*` namespace is accurate because `memory_count` is a counter
 * rather than a search — the mistake that has already cost this project twice.
 */
export async function sandboxBudget(session: string) {
  try {
    const all = (await listNamespaces()) as {
      namespaces: Array<{ name: string; memory_count: number; updated_at?: string }>;
    };
    const sandboxes = all.namespaces.filter((n) => n.name.startsWith('sandbox-'));
    const hourAgo = Date.now() - 3_600_000;
    const recent = sandboxes.filter(
      (n) => !n.updated_at || new Date(n.updated_at).getTime() > hourAgo,
    );
    return {
      thisSession: sandboxes.find((n) => n.name === `sandbox-${session}`)?.memory_count ?? 0,
      lastHour: recent.reduce((a, n) => a + n.memory_count, 0),
    };
  } catch {
    // If the budget cannot be read, refuse rather than write blind into a permanent store.
    return { thisSession: MAX_PER_SESSION, lastHour: MAX_SANDBOX_TOTAL_PER_HOUR };
  }
}

/** In-memory and therefore per-instance — a speed bump for the naive case, not a wall. */
const seen = new Map<string, number[]>();
export function ipAllowed(ip: string): boolean {
  const now = Date.now();
  const hits = (seen.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (hits.length >= MAX_PER_IP_PER_HOUR) { seen.set(ip, hits); return false; }
  hits.push(now);
  seen.set(ip, hits);
  if (seen.size > 5_000) seen.clear();
  return true;
}

export const callerIp = (h: Headers) =>
  h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
