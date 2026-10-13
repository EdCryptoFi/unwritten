/**
 * Seeds the Wilson house into Walrus Mainnet.
 *
 * This is the script the README discloses. It runs THE REAL ENGINE: decisions are written from
 * the fixtures, and every belief is then derived by `packages/policy` rather than copied from a
 * hand-written list. Nothing downstream of this script is faked, which is the only reason the
 * claim is worth making.
 *
 * Irreversible, so:
 *  - `--commit` is required; without it this is a dry run
 *  - the namespace is VERSIONED. Memory has no delete, so re-seeding cannot overwrite; it writes
 *    into a fresh version and the old one is simply unreferenced
 *  - a marker memory is written last, carrying the counts, so a later run can refuse politely
 *
 * Paced for the relayer: 5 points per remember against 60/minute per account.
 */
import { readFileSync } from 'node:fs';
import {
  BELIEFS, DECISIONS, HOUSE, SPEND, TOPUPS, say, upTo, wilsonProbes,
} from '@unwritten/fixtures';
import type { Belief } from '@unwritten/fixtures';
import { client, recall, writeBelief, writeDecision, writeSpend, writeTopUp } from '@unwritten/memory';
import { agreement, deriveAll } from '@unwritten/policy';

for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m?.[1] && m[2] !== undefined) process.env[m[1]] ??= m[2];
}

const COMMIT = process.argv.includes('--commit');
const VERSION = process.env.SEED_VERSION ?? 'wilson-v1';
const PACE_MS = 5_500; // 5 points each against 60/minute leaves comfortable headroom
const WEEK = 6;

const g = (s: string) => `\x1b[32m${s}\x1b[0m`;
const d = (s: string) => `\x1b[2m${s}\x1b[0m`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ns = (kind: string) => `${VERSION}-${kind}`;
let written = 0;

async function put(label: string, fn: () => Promise<unknown>) {
  if (!COMMIT) { console.log(d(`    would write · ${label}`)); written++; return; }
  await fn();
  written++;
  process.stdout.write(`\r    ${g('✓')} ${String(written).padStart(3)} written · ${label.slice(0, 58)}      `);
  await sleep(PACE_MS);
}

// ── guard ───────────────────────────────────────────────────────────────────
console.log(`\n\x1b[1mSEED\x1b[0m  ${VERSION}  ${COMMIT ? '\x1b[31mCOMMITTING\x1b[0m' : d('dry run — pass --commit to write')}`);
const prior = await recall(ns('marker') as never, 'seed marker', 5).catch(() => []);
if (prior.length && COMMIT) {
  console.log(`\n  \x1b[31m✗\x1b[0m ${VERSION} is already seeded (${prior.length} marker).`);
  console.log(d('    Memory has no delete. Bump SEED_VERSION to seed a fresh namespace.\n'));
  process.exit(1);
}

// ── 1 · the raw events ──────────────────────────────────────────────────────
console.log('\n  1 · raw events');
for (const e of upTo(DECISIONS, WEEK)) await put(`${e.id} ${e.category}`, () => writeDecision(e, ns('decisions') as never));
for (const e of upTo(SPEND, WEEK)) await put(`${e.id} spend`, () => writeSpend(e, ns('spend') as never));
for (const e of upTo(TOPUPS, WEEK)) await put(`${e.id} top-up`, () => writeTopUp(e, ns('topup') as never));

// ── 2 · beliefs, DERIVED rather than copied ─────────────────────────────────
console.log('\n\n  2 · beliefs, derived by packages/policy');
const input = {
  decisions: upTo(DECISIONS, WEEK),
  spend: upTo(SPEND, WEEK),
  topups: upTo(TOPUPS, WEEK),
  knobs: HOUSE.learning,
  policy: HOUSE.policy,
  week: WEEK,
};
const derived: Belief[] = deriveAll(input, wilsonProbes(WEEK));

for (const b of derived) {
  console.log(d(`      ${b.dimension.padEnd(15)} ${say(b).slice(0, 72)}`));
}
console.log('');
for (const b of derived) await put(`${b.id}`, () => writeBelief(b, say(b), ns('beliefs') as never));

// ── 3 · the marker, last, carrying the counts ───────────────────────────────
const counts = {
  version: VERSION, seededAt: new Date().toISOString(),
  decisions: upTo(DECISIONS, WEEK).length, spend: upTo(SPEND, WEEK).length,
  topups: upTo(TOPUPS, WEEK).length, beliefs: derived.length, total: written + 1,
};
if (COMMIT) {
  await client(ns('marker')).remember(
    `Seed marker for ${VERSION}. The Wilson house, six weeks, written by scripts/seed.mts. ` +
    `Beliefs were derived by packages/policy from the events above, not copied.\n${JSON.stringify(counts)}`,
  );
  written++;
}

console.log(`\n\n  ${g(String(written))} memories ${COMMIT ? 'written to Mainnet' : 'would be written'}`);
console.log(d(`    ${counts.decisions} decisions · ${counts.spend} spend · ${counts.topups} top-ups · ${counts.beliefs} beliefs · 1 marker`));
console.log(d(`    namespaces: ${['decisions','spend','topup','beliefs','marker'].map(ns).join(', ')}`));

// ── does the engine agree with the screens? ─────────────────────────────────
console.log('\n  derived vs. the fixtures the prototype validated');
const rows = agreement(derived, BELIEFS, say);
for (const r of rows) {
  console.log(`    ${r.agrees ? g('agrees') : '\x1b[33mdiffers\x1b[0m'}  ${r.dimension.padEnd(15)} ${r.id}`);
  if (!r.agrees) {
    console.log(d(`        fixture  ${r.fixture}`));
    console.log(d(`        derived  ${r.derived}`));
  }
}
console.log(d(`    ${rows.filter((r) => r.agrees).length}/${rows.length} match what the screens show\n`));
