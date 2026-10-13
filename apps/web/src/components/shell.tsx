'use client';

import { ClayAvatar } from '@/components/primitives';
import { TourBar } from '@/components/tour';
import { useApp } from '@/lib/state';
import { HOUSE, WEEK_NOTE } from '@unwritten/fixtures';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Shell({ children }: { children: React.ReactNode }) {
  const { nav, viewer, setViewer, role, house, loading } = useApp();
  const path = usePathname();
  const active = HOUSE.members.filter((m) => m.state === 'active');

  /* The home page is the door, not a room: no sidebar, no week control. Both only mean something
     once you are inside the house, and on the landing they pushed the three choices off-screen. */
  if (path === '/') {
    return <div className="bg-background min-h-screen">{children}</div>;
  }

  /* The full viewer-switcher + page nav, shared between two renders: open by default on desktop
     (a `<details>` with no `md:` affordance to collapse it), collapsed behind a tap on mobile. A
     phone showing the entire member list and every nav link before any page content is the kind
     of thing a judge notices in the first three seconds. */
  const links = (
    <>
      <div className="text-label-caps text-on-surface-variant mx-3 mb-2">Viewing as</div>
      {active.map((m) => (
        <button
          type="button"
          key={m.ref}
          onClick={() => setViewer(m.ref)}
          className={`w-full text-left px-3 py-2.5 rounded-lg text-body-md transition-all ${
            viewer === m.ref
              ? 'bg-primary-fixed text-on-primary-fixed-variant shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          <div className="flex items-center gap-2">
            <ClayAvatar label={m.label.charAt(0) || '?'} color={m.role === 'owner' ? 'primary' : m.role === 'approver' ? 'secondary' : 'neutral'} size="sm" />
            <span>{m.label} · {m.role}</span>
          </div>
        </button>
      ))}
      <button
        type="button"
        onClick={() => setViewer('judge')}
        className={`w-full text-left px-3 py-2.5 rounded-lg text-body-md transition-all ${
          viewer === 'judge'
            ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant shadow-sm'
            : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base">gavel</span>
          <span>a judge</span>
        </div>
      </button>

      <div className="text-label-caps text-on-surface-variant mx-3 mt-6 mb-2">
        {role === 'judge'
          ? 'Exposed · never linked from the app'
          : role === 'spender'
            ? 'Spender · 3 screens'
            : 'Product'}
      </div>
      <nav className="mt-2 flex flex-col gap-1">
        {nav.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className={`px-3 py-2.5 rounded-lg text-body-md transition-all ${
              path === href
                ? 'bg-primary-fixed text-on-primary-fixed-variant shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </>
  );

  const sourceBadge = (
    <div className="mx-3 mb-4 flex items-center gap-2 p-2 clay-well rounded-lg">
      <span className={`inline-block h-2 w-2 rounded-full ${
        loading ? 'bg-on-surface-variant'
        : house.source === 'mainnet' ? 'bg-secondary' : 'bg-warning'
      }`} />
      <span className="text-label-caps text-on-surface-variant">
        {loading ? 'reading…' : house.source === 'mainnet'
          ? 'live · walrus mainnet' : 'fixtures · relayer unreachable'}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <nav className="w-full md:w-72 flex-shrink-0 bg-surface-container-low border-r border-outline-variant/50 p-4 md:sticky md:h-screen md:border-b-0">
        <Link href="/" className="clay-card flex items-center gap-2.5 rounded-xl px-3 py-2.5 mb-4">
          <span className="bg-primary flex h-8 w-8 items-center justify-center rounded-full shadow-[0_4px_10px_rgba(70,72,212,0.3)]">
            <span className="material-symbols-outlined text-on-primary text-[18px]">balance</span>
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-on-surface text-sm font-bold">Unwritten</span>
            <span className="text-label-caps text-primary font-bold tracking-wider uppercase">Walrus Mainnet</span>
          </span>
        </Link>

        {/* Source indicator — shown, not claimed */}
        {sourceBadge}

        {/* Mobile: collapsed behind a tap. Desktop: always expanded, no triangle, no tap. */}
        <details className="md:hidden group">
          <summary className="clay-pill clay-pill-secondary mx-3 mb-3 flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-semibold text-on-surface [&::-webkit-details-marker]:hidden">
            <span>Menu · viewer &amp; navigation</span>
            <span className="material-symbols-outlined text-[18px] transition-transform group-open:rotate-180">expand_more</span>
          </summary>
          <div className="pt-1">{links}</div>
        </details>
        <div className="hidden md:block">{links}</div>
      </nav>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 py-8 pb-32">
        <TourBar />
        {children}
      </main>

      <WeekScrubber />
    </div>
  );
}

/** The most important control in the product — clay pill slider */
function WeekScrubber() {
  const { week, setWeek } = useApp();
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-surface-container-low/95 backdrop-blur-sm border-t border-outline-variant/50 px-4 md:px-8 py-3 md:py-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <span className="text-label-caps text-on-surface-variant">Week</span>
          <input
            type="range"
            min={1}
            max={6}
            value={week}
            onChange={(e) => setWeek(Number(e.target.value))}
            aria-label="Week"
            className="flex-1 max-w-xs h-2 appearance-none bg-surface-container-high rounded-full cursor-pointer accent-primary"
            style={{
              WebkitAppearance: 'none',
              background: 'var(--color-surface-container-high)',
            }}
          />
          <span className="text-stat-numeric-md text-primary font-extrabold tabular-nums whitespace-nowrap">
            {week}
          </span>
        </div>
        <span className="text-body-sm text-on-surface-variant hidden sm:block">
          — drag to watch the rules form and supersede
        </span>
        <span className="text-label-caps text-on-surface-variant whitespace-nowrap">
          {WEEK_NOTE[week]}
        </span>
      </div>
    </div>
  );
}