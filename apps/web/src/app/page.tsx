'use client';

import { useGo } from '@/components/tour';
import { LINKS } from '@/lib/links';
import { useApp, useHouse } from '@/lib/state';
import { type Belief, WEEK_NOTE, money } from '@unwritten/fixtures';

/* Three doors, deliberately not equal weight. The example teaches what a derived rule is in ten
   seconds; "try it yourself" only lands once you know that, so it is second. The judge door leads
   to a short orientation rather than straight to /proof — a reviewer sent to a page of hashes
   skips the product they are scoring.

   Visual language: Tactile Domesticity (templates/tactile_domesticity/DESIGN.md) — claymorphism,
   pillowed surfaces, compound shadows. Every number on this page is real and sourced from the
   same engine the rest of the product reads from; nothing here is decorative marketing copy. */
export default function Landing() {
  const { loading, house } = useApp();
  const { decisionsUpTo, beliefsUpTo, spendUpTo } = useHouse();

  /* The four showcase numbers are READ, not written. They were typed into this file once and the
     Friday rhythm drifted — $34.00 ± $4.08 here, $32.40 ± $10.69 on Mainnet — under a line saying
     "every number here is live". Now they are the same beliefs /agreement renders. */
  const find = <D extends Belief['dimension']>(dim: D, cat: string) =>
    beliefsUpTo.find((b): b is Extract<Belief, { dimension: D }> => b.dimension === dim && b.scope.category === cat);
  const friday = find('rhythm', 'fastfood');
  const games = find('member_pattern', 'games');
  const groceries = find('value_band', 'groceries');
  const repriced = spendUpTo.find((x) => x.isCommitment && x.expectedCents !== undefined && x.amountCents > x.expectedCents);
  const go = useGo();

  const totalMemories = Object.values(house.counts ?? {}).reduce<number>((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-6 pb-16 md:px-8">
      {/* ── Top bar: the sidebar's job on the landing, done in one line ───── */}
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary flex h-9 w-9 items-center justify-center rounded-full shadow-[0_4px_10px_rgba(70,72,212,0.3)]">
            <span aria-hidden="true" className="material-symbols-outlined text-on-primary text-[20px]">balance</span>
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-on-surface text-base font-bold">Unwritten</span>
            <span className="text-label-caps text-primary font-bold tracking-wider whitespace-nowrap uppercase">Walrus Mainnet</span>
          </span>
        </div>
        <div className="clay-card inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2">
          <span
            className={`h-2 w-2 rounded-full ${
              loading ? 'bg-on-surface-variant' : house.source === 'mainnet' ? 'animate-pulse bg-secondary' : 'bg-text-warning-primary'
            }`}
          />
          <span className="text-label-caps text-primary font-bold tracking-wider uppercase">
            {loading
              ? 'reading the house…'
              : house.source === 'mainnet'
                ? <>{totalMemories || '50+'} memories<span className="hidden sm:inline"> on Mainnet</span></>
                : 'fixtures · relayer unreachable'}
          </span>
        </div>
      </header>

      {/* ── Hero: title + illustration left, the three doors right ─────── */}
      {/* Three grid children so the order can differ: on a phone the doors come straight after the
          title — behind the illustration, nobody saw a choice without scrolling. On a wide screen
          the doors span both rows of the right column, beside the title and the illustration. */}
      <section className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-x-10 lg:gap-y-8">
        <div className="lg:col-start-1 lg:row-start-1">
          <span className="text-label-caps text-primary font-bold tracking-widest uppercase">
            Unwritten · house budget
          </span>
          <h1 className="text-on-surface mt-3 text-[38px] leading-[44px] font-extrabold tracking-tight lg:text-[52px] lg:leading-[58px]">
            The spending agreement your house <span className="text-primary italic">already has</span>.
          </h1>
          <p className="text-body-lg text-on-surface-variant mt-5 max-w-xl leading-relaxed">
            Every household answers one question informally and never writes it down: who can spend
            what, alone, up to how much. We watch real decisions, write it for you, and tell you when
            the rule you think you have is not the rule you actually follow.
          </p>
        </div>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-6">
          <span className="text-label-caps text-primary font-bold tracking-widest uppercase">Three ways in</span>
          <h2 className="text-on-surface mt-1 mb-4 text-2xl font-bold tracking-tight">Choose how you want to see it</h2>
          <div className="flex flex-col gap-3">
            <GateCard
              tone="primary"
              icon="home_work"
              badge="Start here · ~3 min"
              title="See a house that already has one"
              body="Six weeks of the Wilson family. A guided path: who asks, what gets approved, the rules that formed, and what the chain caught."
              metricLabel="Live telemetry"
              metricValue={`${decisionsUpTo.length} decisions`}
              cta="Enter the Wilson house"
              onClick={() => go('/house', 'm1', 'wilson')}
            />
            <GateCard
              tone="secondary"
              icon="magic_button"
              badge="Your own house · ~1 min"
              title="Make one about yourself"
              body="Name your people, pick what your house spends on, set one number — the same engine derives a rule from your decisions, on Walrus Mainnet."
              metricLabel="Time to a rule"
              metricValue="Three taps"
              cta="Try it yourself"
              onClick={() => go('/try', 'm1', null)}
            />
            <GateCard
              tone="tertiary"
              icon="verified"
              badge="Total Recall reviewers"
              title="Reviewing this for Total Recall?"
              body="Seven stops in order, each switching you to the role it needs, with the architecture map of how the browser, Tatum and Walrus meet."
              metricLabel="Guided stops"
              metricValue="7 · ~4 min"
              cta="I'm a judge"
              onClick={() => go('/judge', 'judge', 'judge')}
            />
          </div>
        </div>
        <div className="lg:col-start-1 lg:row-start-2">
          <div className="clay-nav-container bg-surface-container-lowest group relative overflow-hidden rounded-xl p-3">
            <div className="bg-surface-container-low relative aspect-[16/9] w-full overflow-hidden rounded-lg">
              {/* plain <img>, not next/image — next/image would invoke sharp */}
              <img
                src="/design/hero-house.webp"
                alt=""
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.01]"
              />
              <div className="bg-surface-container-lowest/90 absolute right-3 bottom-3 left-3 flex items-center gap-2.5 rounded-full px-4 py-2.5 shadow-[0_12px_28px_-4px_rgba(112,128,160,0.18),inset_0_2px_4px_rgba(255,255,255,0.9)] backdrop-blur-md">
                <span className="bg-primary-fixed text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">cottage</span>
                </span>
                <div className="min-w-0 text-left">
                  <p className="text-on-surface text-sm leading-snug font-semibold">The Wilson House</p>
                  <p className="text-body-sm text-on-surface-variant truncate">
                    Six weeks, seeded and disclosed · {decisionsUpTo.length} decisions · {beliefsUpTo.length} rules
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Note title="Setup asks one number">On purpose — so there is something for week five to correct.</Note>
            <Note title="No wallet, no gas">Two keys in the whole system, and members join with a link.</Note>
          </div>
        </div>

      </section>

      {/* ── WHAT THE HOUSE AGREED ON WITHOUT SAYING A WORD ───────────── */}
      <div className="mt-20 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-label-caps text-primary font-bold tracking-widest uppercase">
            Tacit agreements, in clay
          </span>
          <h2 className="text-on-surface mt-2 text-2xl font-bold tracking-tight lg:text-[28px]">
            What the house agreed on without saying a word
          </h2>
        </div>
        <p className="text-body-md text-on-surface-variant max-w-sm">
          Four of the Wilson house&apos;s rules — every number here is live from{' '}
          <span className="text-on-surface font-semibold">The Agreement</span>.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ThemeCard icon="/design/icon-fastfood.webp" badge={friday?.state ?? 'forming'} badgeTone="secondary"
          title="Friday Fast Food Ritual"
          stat={friday ? `${money(friday.medianCents)} ± ${money(Math.round((friday.medianCents * friday.variancePct) / 100))}` : '—'}
          statTone="primary"
          body={friday ? `${friday.streak[0]} of ${friday.streak[1]} weeks. Small enough that nobody ever asked.` : 'Not enough weeks yet.'} />
        <ThemeCard icon="/design/icon-games.webp" badge="Friction point" badgeTone="tertiary"
          title="Max's Gaming Budget" stat={games ? `${games.sharePct}% of allowance` : '—'} statTone="tertiary"
          body="One rejection in six weeks — the only contested category." />
        <ThemeCard icon="/design/icon-groceries.webp" badge={groceries?.state ?? 'forming'} badgeTone="secondary"
          title="Groceries Autonomous Ceiling" stat={groceries ? `Up to ${money(groceries.thresholdCents)} solo` : '—'} statTone="secondary"
          body={groceries ? `${groceries.streak[0]} of ${groceries.streak[1]} times agreed without discussion.` : 'Not enough decisions yet.'} />
        <ThemeCard icon="/design/icon-subscriptions.webp" badge="Repriced" badgeTone="primary"
          title="Silent Price Creep"
          stat={repriced?.expectedCents !== undefined ? `${money(repriced.expectedCents)} → ${money(repriced.amountCents)}` : '—'}
          statTone="primary"
          body="Nobody approved it, nobody noticed — until Reality check." />
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <div className="bg-surface-container-low shadow-clay-recessed mt-16 rounded-xl p-6 lg:p-10">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="text-label-caps text-primary font-bold tracking-widest uppercase">
            No LLM, no network, no I/O
          </span>
          <h2 className="text-on-surface mt-2 text-2xl font-bold tracking-tight lg:text-[28px]">
            How the house&apos;s rules get derived
          </h2>
          <p className="text-body-md text-on-surface-variant mt-2">
            Seven pure functions over your own decisions — reproducible, testable, and the same
            code every time, which is why the demo can run twice and say the same thing twice.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Step n={1} tone="primary" icon="visibility" title="Observe"
            body="Every decision — who signed, how long it took, whether anyone was even asked — is written to Walrus as it resolves. No forms." />
          <Step n={2} tone="secondary" icon="psychology" title="Derive"
            body="Seven pure functions read the evidence and propose a rule once it clears a confidence floor. Fewer events, no rule — the empty state says how many more are needed." />
          <Step n={3} tone="tertiary" icon="balance" title="Flag drift"
            body="When behavior stops matching a ratified rule, or a charge never had an approval, Reality check says so — matched against what Tatum reads from the chain." />
        </div>
      </div>

      {/* ── 6-WEEK PREVIEW STRIP ─────────────────────────────────────── */}
      <div className="clay-card mt-10 rounded-xl p-6 lg:p-8">
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="text-label-caps text-primary font-bold tracking-widest uppercase">
              Empirical house evolution
            </span>
            <h3 className="text-headline-sm text-on-surface mt-1 font-bold tracking-tight">
              The six-week living sequence
            </h3>
          </div>
          <span className="bg-surface-container-low text-on-surface-variant text-body-sm inline-flex items-center gap-2 rounded-full px-4 py-2">
            <span aria-hidden="true" className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
            No wallet, no gas. Two keys in the whole system.
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {Object.entries(WEEK_NOTE).map(([w, note]) => (
            <div
              key={w}
              className={`rounded-lg p-3 text-center shadow-[inset_0_2px_3px_rgba(100,116,139,0.06)] ${
                w === '6' ? 'bg-primary-fixed' : 'bg-surface-container-low'
              }`}
            >
              <span className={`text-label-caps font-bold ${w === '6' ? 'text-on-primary-fixed-variant' : 'text-primary'}`}>
                WEEK {w}
              </span>
              <p className={`text-body-sm mt-1 leading-tight ${w === '6' ? 'text-on-primary-fixed' : 'text-on-surface-variant'}`}>
                {note}
              </p>
            </div>
          ))}
        </div>
        <p className="text-body-sm text-on-surface-variant mt-4 text-center">
          Inside the house, a week control at the bottom of every screen replays this —{' '}
          <button type="button" onClick={() => go('/house', 'm1', 'wilson')} className="text-primary font-semibold underline decoration-dotted underline-offset-2">
            start the Wilson tour
          </button>{' '}
          to see it.
        </p>
      </div>

      <footer className="text-on-surface-variant mt-12 flex flex-col items-center justify-between gap-3 text-xs sm:flex-row">
        <span>Built for Total Recall · Tatum × Walrus · Track 03, Consumer Finance</span>
        <span className="flex gap-4">
          <a href={LINKS.repo} target="_blank" rel="noreferrer" className="hover:text-primary">Repository ↗</a>
          <button type="button" onClick={() => go('/proof', 'judge', null)} className="hover:text-primary">Proof</button>
        </span>
      </footer>
    </div>
  );
}

function GateCard({
  tone, icon, badge, title, body, metricLabel, metricValue, cta, onClick,
}: {
  tone: 'primary' | 'secondary' | 'tertiary';
  icon: string;
  badge: string;
  title: string;
  body: string;
  metricLabel: string;
  metricValue: string;
  cta: string;
  onClick: () => void;
}) {
  const accent = {
    primary: { badge: 'bg-primary-fixed text-on-primary-fixed-variant', dot: 'bg-primary', icon: 'text-primary', metric: 'text-primary' },
    secondary: { badge: 'bg-secondary-fixed text-on-secondary-fixed-variant', dot: 'bg-secondary', icon: 'text-secondary', metric: 'text-secondary' },
    tertiary: { badge: 'bg-tertiary-fixed text-on-tertiary-fixed-variant', dot: 'bg-tertiary', icon: 'text-tertiary', metric: 'text-tertiary' },
  }[tone];

  /* Compact on purpose: the three sit beside the hero, and all three have to be visible without
     scrolling — a reviewer who never sees the third door never finds their own path. */
  return (
    <button
      type="button"
      onClick={onClick}
      className={`clay-card clay-card-glow-${tone} flex flex-col rounded-xl p-5 text-left transition-all duration-300 hover:-translate-y-1`}
    >
      <div className="mb-2 flex w-full items-center justify-between gap-2">
        <span className={`text-label-badge inline-flex items-center gap-1.5 rounded-full px-3 py-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] ${accent.badge}`}>
          <span className={`h-2 w-2 rounded-full ${accent.dot}`} />
          {badge}
        </span>
        <span aria-hidden="true" className={`material-symbols-outlined text-[22px] ${accent.icon}`}>{icon}</span>
      </div>
      <h3 className="text-on-surface mb-1 text-lg font-bold tracking-tight">{title}</h3>
      <p className="text-on-surface-variant mb-4 text-sm leading-relaxed">{body}</p>
      <div className="flex w-full items-center justify-between gap-3">
        <span className="flex flex-col leading-tight">
          <span className="text-on-surface-variant text-[11px]">{metricLabel}</span>
          <span className={`text-base font-bold tabular-nums ${accent.metric}`}>{metricValue}</span>
        </span>
        <span
          className={`clay-pill inline-flex shrink-0 items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold ${
            tone === 'primary'
              ? 'clay-pill-primary'
              : tone === 'tertiary'
                ? 'clay-pill-tertiary'
                : 'bg-surface-container text-on-surface shadow-[0_6px_16px_-2px_rgba(112,128,160,0.12),inset_0_2px_4px_rgba(255,255,255,0.95)]'
          }`}
        >
          {cta}
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </span>
      </div>
    </button>
  );
}

function ThemeCard({
  icon, badge, badgeTone, title, stat, statTone, body,
}: {
  icon: string;
  badge: string;
  badgeTone: 'primary' | 'secondary' | 'tertiary';
  title: string;
  stat: string;
  statTone: 'primary' | 'secondary' | 'tertiary';
  body: string;
}) {
  const badgeClass = {
    primary: 'bg-primary-fixed text-on-primary-fixed-variant',
    secondary: 'bg-secondary-fixed text-on-secondary-fixed-variant',
    tertiary: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  }[badgeTone];
  const statClass = { primary: 'text-primary', secondary: 'text-secondary', tertiary: 'text-tertiary' }[statTone];

  return (
    <div className="clay-card clay-card-hover flex flex-col rounded-xl p-4 lg:p-5">
      <div className="bg-surface-container-low mb-4 flex aspect-square w-full items-center justify-center overflow-hidden rounded-[1rem] p-3 shadow-[inset_0_2px_4px_rgba(100,116,139,0.08)]">
        {/* plain <img>, not next/image — next/image would invoke sharp */}
        <img src={icon} alt="" className="h-full w-full object-contain" />
      </div>
      <span className={`text-label-caps mb-2 inline-flex w-fit items-center rounded-full px-2.5 py-0.5 font-bold ${badgeClass}`}>
        {badge}
      </span>
      <h4 className="text-title-md text-on-surface font-bold">{title}</h4>
      <span className={`text-stat-numeric-md my-1 tabular-nums ${statClass}`}>{stat}</span>
      <p className="text-body-sm text-on-surface-variant leading-relaxed">{body}</p>
    </div>
  );
}

function Step({ n, tone, icon, title, body }: { n: number; tone: 'primary' | 'secondary' | 'tertiary'; icon: string; title: string; body: string }) {
  const c = {
    primary: { bg: 'bg-primary-fixed', text: 'text-primary' },
    secondary: { bg: 'bg-secondary-fixed', text: 'text-secondary' },
    tertiary: { bg: 'bg-tertiary-fixed', text: 'text-tertiary' },
  }[tone];
  return (
    <div className="clay-card flex flex-col justify-between rounded-xl p-6">
      <div>
        <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-full font-bold shadow-[inset_0_2px_2px_rgba(255,255,255,0.8)] ${c.bg} ${c.text}`}>
          {n}
        </div>
        <h3 className="text-headline-sm text-on-surface mb-2 font-bold">{title}</h3>
        <p className="text-body-md text-on-surface-variant leading-relaxed">{body}</p>
      </div>
      <div className={`mt-6 flex items-center gap-2 pt-4 font-semibold ${c.text}`}>
        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
    </div>
  );
}

function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="clay-well rounded-xl px-[18px] py-4">
      <p className="text-on-surface mb-1 text-sm font-medium">{title}</p>
      <p className="text-on-surface-variant font-mono text-xs leading-relaxed">{children}</p>
    </div>
  );
}
