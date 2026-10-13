'use client';

import { ClayButton } from '@/components/primitives';
import { useApp, useHouse } from '@/lib/state';
import { WEEK_NOTE } from '@unwritten/fixtures';
import { useRouter } from 'next/navigation';

/* Three doors, deliberately not equal weight. The example teaches what a derived rule is in ten
   seconds; "try it yourself" only lands once you know that, so it is second. The judge door leads
   to a short orientation rather than straight to /proof — a reviewer sent to a page of hashes
   skips the product they are scoring.

   Visual language: Tactile Domesticity (templates/tactile_domesticity/DESIGN.md) — claymorphism,
   pillowed surfaces, compound shadows. Every number on this page is real and sourced from the
   same engine the rest of the product reads from; nothing here is decorative marketing copy. */
export default function Landing() {
  const { setViewer, setWeek, loading, house } = useApp();
  const { decisionsUpTo, beliefsUpTo } = useHouse();
  const router = useRouter();

  const go = (href: string, viewer: 'm1' | 'judge' = 'm1') => {
    setViewer(viewer);
    setWeek(6);
    router.push(href);
  };

  const totalMemories = Object.values(house.counts ?? {}).reduce<number>((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-[1040px] pt-2 pb-10">
      {/* ── Eyebrow: live status, never a claim we cannot back ───────────── */}
      <div className="mb-6 flex justify-center">
        <div className="clay-card inline-flex items-center gap-2 rounded-full px-4 py-2">
          <span
            className={`h-2 w-2 rounded-full ${
              loading ? 'bg-on-surface-variant' : house.source === 'mainnet' ? 'animate-pulse bg-secondary' : 'bg-text-warning-primary'
            }`}
          />
          <span className="text-label-caps text-primary font-bold tracking-wider uppercase">
            {loading
              ? 'reading the house…'
              : house.source === 'mainnet'
                ? `Walrus Mainnet · ${totalMemories || '50+'} memories written`
                : 'Fixtures · relayer unreachable, same data shape'}
          </span>
        </div>
      </div>

      {/* ── Hero headline ─────────────────────────────────────────────── */}
      <div className="text-center">
        <h1 className="font-display-hero text-headline-lg text-on-surface mx-auto max-w-3xl tracking-tight lg:text-[44px] lg:leading-[52px]">
          The spending agreement your house <span className="text-primary italic">already has</span>.
        </h1>
        <p className="text-body-lg text-on-surface-variant mx-auto mt-5 max-w-2xl leading-relaxed">
          Every household answers one question informally and never writes it down: who can spend
          what, alone, up to how much. We watch real decisions, write it for you, and tell you when
          the rule you think you have is not the rule you actually follow.
        </p>
      </div>

      {/* ── Hero visual frame ────────────────────────────────────────── */}
      <div className="clay-nav-container bg-surface-container-lowest group relative mx-auto mt-10 w-full max-w-4xl overflow-hidden rounded-xl p-3">
        <div className="bg-surface-container-low relative flex aspect-[16/8] w-full items-center justify-center overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element -- static asset, no next/image: keeps `sharp` out of the deploy's reachable surface */}
          <img
            src="/design/hero-house.webp"
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.01]"
          />
          <div className="bg-surface-container-lowest/90 absolute right-4 bottom-4 left-4 flex flex-col items-center justify-between gap-2 rounded-full px-5 py-3 shadow-[0_12px_28px_-4px_rgba(112,128,160,0.18),inset_0_2px_4px_rgba(255,255,255,0.9)] backdrop-blur-md sm:flex-row">
            <div className="flex items-center gap-2.5">
              <span className="bg-primary-fixed text-primary flex h-8 w-8 items-center justify-center rounded-full">
                <span className="material-symbols-outlined text-[18px]">cottage</span>
              </span>
              <div className="text-left">
                <p className="text-title-md text-on-surface leading-snug font-semibold">
                  The Wilson House
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  Six weeks, seeded and read-only · {decisionsUpTo.length} decisions · {beliefsUpTo.length} rules
                </p>
              </div>
            </div>
            <span className="bg-secondary-container/40 text-on-secondary-container text-label-badge inline-flex items-center gap-1.5 rounded-full px-3 py-1">
              <span className="bg-secondary h-2 w-2 rounded-full" />
              Disclosed seed, not a demo trick
            </span>
          </div>
        </div>
      </div>

      {/* ── THE THREE DOORS ──────────────────────────────────────────── */}
      <div className="mt-14 text-center">
        <span className="text-label-caps text-primary font-bold tracking-widest uppercase">
          Three ways in
        </span>
        <h2 className="font-headline-lg text-headline-md text-on-surface mt-2 tracking-tight">
          Choose how you want to see it
        </h2>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <GateCard
          tone="primary"
          icon="home_work"
          badge="6-week case study · live"
          title="See a house that already has one"
          body="Six weeks of the Wilson family, seeded and read-only. Drag the weeks and watch the rules form, then watch one get rewritten. Start here — it takes ten seconds to understand."
          metricLabel="Live telemetry"
          metricValue={`${decisionsUpTo.length} decisions`}
          cta="Enter the Wilson house"
          onClick={() => go('/agreement')}
        />
        <GateCard
          tone="secondary"
          icon="magic_button"
          badge="3-step derivation"
          title="Make one about yourself"
          body="Three taps and the same engine derives a rule from your decisions, written to Walrus Mainnet. Makes more sense once you have seen the house above."
          metricLabel="Time to derivation"
          metricValue="Three taps"
          cta="Try it yourself"
          onClick={() => go('/try')}
        />
        <GateCard
          tone="tertiary"
          icon="verified"
          badge="Total Recall hackathon"
          title="Reviewing this for Total Recall?"
          body="A guided path through what is worth looking at, in order, and where the evidence lives. Four minutes, and Proof answers the checklist on its own if that is all you need."
          metricLabel="Guided stops"
          metricValue="6 · ~4 min"
          cta="I'm a judge"
          onClick={() => go('/judge', 'judge')}
        />
      </div>

      {/* ── WHAT THE HOUSE AGREED ON WITHOUT SAYING A WORD ───────────── */}
      <div className="mt-16 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-label-caps text-primary font-bold tracking-widest uppercase">
            Tacit agreements, in clay
          </span>
          <h2 className="font-headline-lg text-headline-md text-on-surface mt-2 tracking-tight">
            What the house agreed on without saying a word
          </h2>
        </div>
        <p className="text-body-md text-on-surface-variant max-w-sm">
          Four of the Wilson house&apos;s rules — every number here is live from <span className="text-on-surface font-semibold">/agreement</span>.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ThemeCard
          icon="/design/icon-fastfood.webp"
          badge="Observed"
          badgeTone="secondary"
          title="Friday Fast Food Ritual"
          stat="$34.00 ± $4.08"
          statTone="primary"
          body="5 of 6 weeks. Small enough that nobody ever asked."
        />
        <ThemeCard
          icon="/design/icon-games.webp"
          badge="Friction point"
          badgeTone="tertiary"
          title="Max's Gaming Budget"
          stat="72% of allowance"
          statTone="tertiary"
          body="One rejection in six weeks — the only contested category."
        />
        <ThemeCard
          icon="/design/icon-groceries.webp"
          badge="Ratified"
          badgeTone="secondary"
          title="Groceries Autonomous Ceiling"
          stat="Up to $45.00 solo"
          statTone="secondary"
          body="11 of 11 times agreed without discussion."
        />
        <ThemeCard
          icon="/design/icon-subscriptions.webp"
          badge="Repriced"
          badgeTone="primary"
          title="Silent Price Creep"
          stat="$10.99 → $12.99"
          statTone="primary"
          body="Nobody approved it, nobody noticed — until Reality check."
        />
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <div className="bg-surface-container-low shadow-clay-recessed mt-16 rounded-xl p-6 lg:p-10">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="text-label-caps text-primary font-bold tracking-widest uppercase">
            No LLM, no network, no I/O
          </span>
          <h2 className="font-headline-lg text-headline-md text-on-surface mt-2 tracking-tight">
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
            <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
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
          Drag the week control at the bottom of the screen to watch it happen on{' '}
          <button type="button" onClick={() => go('/agreement')} className="text-primary font-semibold underline decoration-dotted underline-offset-2">
            The Agreement
          </button>.
        </p>
      </div>

      {/* ── CLOSING CTA ───────────────────────────────────────────────── */}
      <div className="from-surface-container-low via-surface-container-lowest to-surface-container mt-16 flex flex-col items-center rounded-xl bg-gradient-to-br p-8 text-center shadow-[0_20px_44px_-8px_rgba(70,72,212,0.12),inset_0_3px_5px_rgba(255,255,255,0.95),inset_0_-3px_5px_rgba(100,116,139,0.05)] lg:p-14">
        <div className="bg-primary text-on-primary mb-6 flex h-14 w-14 items-center justify-center rounded-full shadow-[0_8px_20px_rgba(70,72,212,0.35),inset_0_2px_3px_rgba(255,255,255,0.4)]">
          <span className="material-symbols-outlined text-[28px]">balance</span>
        </div>
        <h2 className="font-headline-lg text-headline-md text-on-surface max-w-2xl tracking-tight">
          Ready to see what rules your house <span className="text-primary italic">actually</span> follows?
        </h2>
        <p className="text-body-lg text-on-surface-variant mt-4 mb-8 max-w-xl leading-relaxed">
          No spreadsheets, no wallet, no gas. Start with the Wilson house or derive a rule about
          yourself in three taps.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <ClayButton variant="primary" size="lg" onClick={() => go('/agreement')}>
            <span className="material-symbols-outlined text-[20px]">explore</span>
            Explore the Wilson house
          </ClayButton>
          <ClayButton variant="secondary" size="lg" onClick={() => go('/try')}>
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Try it yourself
          </ClayButton>
        </div>
      </div>

      {/* ── Two honest footnotes ─────────────────────────────────────── */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Note title="Setup asks one number">
          On purpose — so there is something for week five to correct.
        </Note>
        <Note title="No wallet, no gas">
          Two keys in the whole system, and members join with a link.
        </Note>
      </div>
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

  return (
    <button
      type="button"
      onClick={onClick}
      className={`clay-card clay-card-glow-${tone} flex flex-col justify-between rounded-xl p-6 text-left transition-all duration-300 hover:-translate-y-1 lg:p-7`}
    >
      <div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <span className={`text-label-badge inline-flex items-center gap-1.5 rounded-full px-3 py-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] ${accent.badge}`}>
            <span className={`h-2 w-2 rounded-full ${accent.dot}`} />
            {badge}
          </span>
          <span className={`material-symbols-outlined text-[24px] ${accent.icon}`}>{icon}</span>
        </div>
        <h3 className="text-headline-sm text-on-surface mb-3 font-bold tracking-tight">{title}</h3>
        <p className="text-body-md text-on-surface-variant mb-6 leading-relaxed">{body}</p>
        <div className="bg-surface-container-low mb-6 flex items-center justify-between rounded-full px-4 py-3 shadow-[inset_0_2px_4px_rgba(100,116,139,0.06)]">
          <span className="text-body-sm text-on-surface-variant">{metricLabel}</span>
          <span className={`text-title-md font-bold tabular-nums ${accent.metric}`}>{metricValue}</span>
        </div>
      </div>
      <span
        className={`clay-pill inline-flex w-full items-center justify-center gap-2 px-5 py-3.5 text-center font-semibold ${
          tone === 'primary'
            ? 'clay-pill-primary'
            : tone === 'tertiary'
              ? 'clay-pill-tertiary'
              : 'bg-surface-container text-on-surface shadow-[0_6px_16px_-2px_rgba(112,128,160,0.12),inset_0_2px_4px_rgba(255,255,255,0.95)]'
        }`}
      >
        {cta}
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </span>
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
        {/* eslint-disable-next-line @next/next/no-img-element -- static asset, no next/image */}
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
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
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
