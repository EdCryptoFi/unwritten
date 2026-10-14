'use client';

import { Mermaid } from '@/components/mermaid';
import { ClayButton } from '@/components/primitives';
import { useGo } from '@/components/tour';
import { ARCHITECTURE, RECONCILE, WRITE_PATH } from '@/lib/diagrams';
import { LINKS } from '@/lib/links';
import { type Viewer, useApp } from '@/lib/state';
import { TOURS, VIEWER_LABEL } from '@/lib/tours';

/* A reviewer has three to five minutes and spends most of it deciding whether to keep going.
   Sending them straight to a page of hashes means they score the evidence and skip the product.

   The path used to break at stop two: the judge door set the viewer to "judge", and Reality check
   is a household-adult screen. Every stop now carries the role it needs and switches to it. */

const PROVES: Record<string, { icon: string; proves: string; tag: string; tone: 'primary' | 'secondary' | 'tertiary' }> = {
  '/agreement': { icon: 'gavel', tone: 'primary', tag: 'Walrus · learned over time',
    proves: 'Beliefs derived from decisions on Walrus Mainnet, versioned. Drag weeks 1→6: nothing for two weeks, the first rules in week 3, and a rule that moves is superseded by a new version rather than edited.' },
  '/reality': { icon: 'travel_explore', tone: 'secondary', tag: 'Tatum · onchain data',
    proves: 'Tatum reads the house wallet, Walrus holds the approvals. The unapproved rows exist in neither source alone — plus a repriced subscription, an off-rhythm pizza, a split purchase.' },
  '/digest': { icon: 'draw', tone: 'primary', tag: 'Memory evolution',
    proves: 'Sam can accept, only Alex can sign. A failed signature supersedes nothing. Disclosed: ratification is simulated end to end — no transaction and no memory write.' },
  '/keys': { icon: 'key_off', tone: 'tertiary', tag: 'Walrus · delegate keys',
    proves: 'Revoke the delegate and press remember(): the rotation counter moves and the write fails. Disclosed: a local rehearsal — revoking the real key would lock every visitor out.' },
  '/try': { icon: 'magic_button', tone: 'secondary', tag: 'Writing on Mainnet',
    proves: 'Your own decisions written to Walrus Mainnet in a sandbox namespace, and a rule derived by the production function. Come back by link — it is recalled, not cached.' },
  '/proof': { icon: 'verified', tone: 'tertiary', tag: 'The checklist',
    proves: 'Each submission requirement answered with evidence: memory count, resolvable blob ids, the four Tatum calls with call sites, and the derivation re-run in your browser.' },
};

/* The hackathon's rubric, in its own words and weights, each point pointing at the screen that
   shows it. A reviewer scores against this; the tour is the same material in story order. */
const RUBRIC: Array<{ title: string; weight: number; points: Array<[string, string | null, Viewer?]> }> = [
  { title: 'Walrus and Tatum integration', weight: 30, points: [
    ['Walrus Memory on Mainnet: decisions, spend, top-ups and versioned rules, each a blob you can open on Walruscan', '/proof#walrus', 'judge'],
    ['Tatum is the only way the app reads Sui — public fullnodes dropped JSON-RPC — and the daily transfers are signed through it', '/proof#tatum', 'judge'],
    ['The two meet in Reality check: spend nobody agreed to exists in neither source alone', '/reality', 'm1'],
    ['Run both integrations live from the proof page', '/proof#live', 'judge'],
  ] },
  { title: 'Technical quality', weight: 30, points: [
    ['Seven pure learning functions with no network or LLM, tested in CI on every push — and re-derived in your browser on /proof', '/proof', 'judge'],
    ['Append-only discipline: nothing pending ever reaches memory; a rule is superseded, never edited', '/agreement', 'm1'],
    ['Hostile-input validation and an hourly budget on the only public write path', '/try', 'm1'],
    ['Paginated, retried Tatum reads; a daily job made idempotent by asking the chain', null],
  ] },
  { title: 'Creativity', weight: 20, points: [
    ['The agreement is discovered, not configured — setup asks one number so the first month has something to correct', '/house', 'm1'],
    ['Memory that learns across two kinds of actor: who the house defers to, and what an allowance is really for', '/agreement', 'm1'],
  ] },
  { title: 'Presentation', weight: 20, points: [
    ['This guided path, three architecture diagrams, and a flowchart of the house', '/house', 'm1'],
    ['Your own house in a minute, written to Walrus Mainnet', '/try', 'm1'],
    ['Every simulation disclosed where it runs — the onchain signature and the key revocation', '/keys', 'm1'],
  ] },
];

const CHECKLIST: Array<[string, string, string | null]> = [
  ['Walrus Memory integrated and writing on Mainnet', 'Five namespaces on the MemWal relayer; the seed, the daily job and every visitor’s sandbox write to it', '/proof#walrus'],
  ['At least 10 memories stored on Mainnet', 'Counted with listNamespaces on /proof — the seeded house alone holds 50', '/proof'],
  ['Tatum RPC used for onchain data', 'Four calls through sui-mainnet.gateway.tatum.io, each with its call site', '/proof#tatum'],
  ['Working demo', 'This site, live on Mainnet', '/'],
  ['Public repository', 'EdCryptoFi/unwritten — specs, tests, and pnpm verify', LINKS.repo],
  ['Blog post: what it does, how it uses Tatum + Walrus, how it learned over time', LINKS.writeup ? 'The write-up' : 'Written; link added on publish', LINKS.writeup],
  ['Optional · built with Tatum AI Builder', 'The generated first version, kept in its own repository', LINKS.aiBuilder],
];

export default function Judge() {
  const go = useGo();
  const { tour } = useApp();
  const stops = TOURS.judge.stops.slice(1);

  return (
    <>
      <span className="text-label-caps text-tertiary font-bold tracking-widest uppercase">Total Recall · reviewer path</span>
      <h1 className="text-on-surface mt-1 mb-2 text-[34px] leading-tight font-extrabold tracking-tight">For reviewers</h1>
      <p className="text-body-md text-on-surface-variant mb-6 max-w-2xl">
        Six stops, about four minutes. Each one switches you to the person that screen was built
        for, and the bar at the top of every stop says who you are and what to look for. If you
        only have a minute, go straight to Proof — it answers the checklist on its own.
      </p>

      <div className="mb-10 flex flex-col gap-3 sm:flex-row">
        <ClayButton variant="tertiary" size="lg" onClick={() => go('/agreement', 'm1', 'judge')}>
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">play_arrow</span>
          {tour === 'judge' ? 'Continue the tour' : 'Start the tour'}
        </ClayButton>
        <ClayButton variant="secondary" size="lg" onClick={() => go('/proof', 'judge', 'judge')}>
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">fact_check</span>
          Straight to Proof
        </ClayButton>
      </div>

      {/* ── The hackathon's own terms ───────────────────────────────── */}
      <span className="text-label-caps text-tertiary font-bold tracking-widest uppercase">How to score it</span>
      <h2 className="text-on-surface mt-1 mb-4 text-2xl font-bold tracking-tight">The rubric, and where each part is</h2>
      <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2">
        {RUBRIC.map((r) => (
          <div key={r.title} className="clay-card rounded-xl p-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-on-surface text-base font-bold">{r.title}</span>
              <span className="bg-tertiary-fixed text-tertiary rounded-full px-3 py-0.5 text-sm font-extrabold tabular-nums">{r.weight}%</span>
            </div>
            <ul className="space-y-1.5">
              {r.points.map(([text, href, as]) => (
                <li key={text} className="text-body-sm text-on-surface-variant flex gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                  <span>
                    {text}{' '}
                    {href && (
                      <button type="button" onClick={() => go(href, as ?? 'm1', 'judge')} className="text-tertiary font-semibold">
                        see it →
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <span className="text-label-caps text-tertiary font-bold tracking-widest uppercase">The submission checklist</span>
      <h2 className="text-on-surface mt-1 mb-4 text-2xl font-bold tracking-tight">Every required item, with its evidence</h2>
      <div className="clay-card mb-8 rounded-xl p-2">
        {CHECKLIST.map(([req, evidence, href]) => (
          <div key={req} className="flex items-start gap-3 rounded-lg px-3 py-2.5 odd:bg-surface-container-low/60">
            <span aria-hidden="true" className={`material-symbols-outlined text-[20px] ${href ? 'text-secondary' : 'text-outline'}`}>
              {href ? 'task_alt' : 'radio_button_unchecked'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-on-surface text-sm font-semibold">{req}</p>
              <p className="text-body-sm text-on-surface-variant">{evidence}</p>
            </div>
            {href && (
              href.startsWith('http') ? (
                <a href={href} target="_blank" rel="noreferrer" className="text-tertiary shrink-0 text-sm font-semibold">open ↗</a>
              ) : (
                <button type="button" onClick={() => go(href, 'judge', 'judge')} className="text-tertiary shrink-0 text-sm font-semibold">open →</button>
              )
            )}
          </div>
        ))}
      </div>

      {/* ── The stops, illustrated ─────────────────────────────────── */}
      <span className="text-label-caps text-tertiary font-bold tracking-widest uppercase">The tour</span>
      <h2 className="text-on-surface mt-1 mb-4 text-2xl font-bold tracking-tight">Six stops, in order</h2>
      <ol className="relative mb-12 space-y-4">
        <span aria-hidden className="bg-outline-variant absolute top-6 bottom-6 left-[27px] w-0.5 rounded-full" />
        {stops.map((s, i) => {
          const p = PROVES[s.href];
          if (!p) return null;
          const chip = { primary: 'bg-primary-fixed text-primary', secondary: 'bg-secondary-fixed text-secondary', tertiary: 'bg-tertiary-fixed text-tertiary' }[p.tone];
          return (
            <li key={s.href} className="relative flex gap-4">
              <span className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-[0_6px_14px_-2px_rgba(112,128,160,0.25),inset_0_2px_3px_rgba(255,255,255,0.9)] ${chip}`}>
                <span aria-hidden="true" className="material-symbols-outlined text-[26px]">{p.icon}</span>
              </span>
              <button type="button" onClick={() => go(s.href, s.as, 'judge')}
                className="clay-card clay-card-hover flex-1 rounded-xl p-5 text-left">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-on-surface-variant font-mono text-xs">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-on-surface text-base font-bold">{s.title}</span>
                  <span className={`clay-badge normal-case tracking-normal ${chip}`}>{p.tag}</span>
                  <span className="clay-badge clay-badge-neutral normal-case tracking-normal">as {VIEWER_LABEL[s.as]}</span>
                </div>
                <p className="text-body-sm text-on-surface-variant leading-relaxed">{p.proves}</p>
                <span className="text-tertiary mt-2 inline-flex items-center gap-1 text-sm font-semibold">
                  Open
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* ── How the browser, Tatum and Walrus meet ─────────────────── */}
      <span className="text-label-caps text-tertiary font-bold tracking-widest uppercase">Architecture</span>
      <h2 className="text-on-surface mt-1 mb-2 text-2xl font-bold tracking-tight">How the browser, Tatum and Walrus meet</h2>
      <p className="text-body-md text-on-surface-variant mb-5 max-w-2xl">
        Every edge below is a call the code makes, checked against the route that makes it. The
        owner key never reaches the server; only the delegate does. The same diagrams are in the
        README, where GitHub renders them.
      </p>
      <div className="space-y-5">
        <Mermaid title="The whole system" code={ARCHITECTURE} />
        <Mermaid title="Reality check · one request, both networks" code={RECONCILE} />
        <Mermaid title="The daily history · why the chain has six weeks in it" code={WRITE_PATH} />
      </div>

      <div className="clay-well mt-8 rounded-xl p-5">
        <p className="text-on-surface mb-1 text-sm font-semibold">Two things worth knowing</p>
        <p className="text-body-sm text-on-surface-variant leading-relaxed">
          The role switcher at the top left changes the whole application — a spender gets three
          screens and no oversight surfaces, which is the point. And no hash appears anywhere in
          the product: every blob id and transaction digest lives on Proof, which the app itself
          never links to.
        </p>
        <p className="text-body-sm mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <a href={LINKS.repo} target="_blank" rel="noreferrer" className="text-primary font-semibold">Repository ↗</a>
          <a href={LINKS.aiBuilder} target="_blank" rel="noreferrer" className="text-primary font-semibold">AI Builder first version ↗</a>
          {LINKS.writeup && <a href={LINKS.writeup} target="_blank" rel="noreferrer" className="text-primary font-semibold">Write-up ↗</a>}
        </p>
      </div>
    </>
  );
}
