'use client';

import { HOUSE, WEEK_NOTE } from '@unwritten/fixtures';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/lib/state';

export function Shell({ children }: { children: React.ReactNode }) {
  const { nav, viewer, setViewer, role } = useApp();
  const path = usePathname();
  const active = HOUSE.members.filter((m) => m.state === 'active');

  return (
    <div className="grid min-h-dvh md:grid-cols-[232px_1fr]">
      <nav className="border-border-secondary bg-bg-secondary top-0 h-auto overflow-auto border-b py-5 md:sticky md:h-dvh md:border-r md:border-b-0">
        <Link href="/" className="text-text-tertiary hover:text-text-primary block px-5 pb-3 text-[13px] font-semibold">
          ← Unwritten
        </Link>

        <Group>Viewing as</Group>
        {active.map((m) => (
          <Item key={m.ref} on={viewer === m.ref} onClick={() => setViewer(m.ref)}>
            {m.label} · {m.role}
          </Item>
        ))}
        <Item on={viewer === 'judge'} onClick={() => setViewer('judge')}>
          a judge
        </Item>

        <Group>
          {role === 'judge'
            ? 'Exposed · never linked from the app'
            : role === 'spender'
              ? 'Spender · 3 screens'
              : 'Product'}
        </Group>
        {nav.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className={`block border-l-2 px-5 py-[9px] text-[13.5px] no-underline transition-colors ${
              path === href
                ? 'border-l-bg-brand-solid text-text-brand-primary bg-bg-tertiary'
                : 'text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary border-l-transparent'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <main className="mx-auto w-full max-w-[960px] px-4 pb-28 pt-7 sm:px-8">{children}</main>
      <Scrubber />
    </div>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-text-quaternary mx-5 mt-[22px] mb-1.5 text-[10px] font-semibold uppercase tracking-[0.9px]">
      {children}
    </div>
  );
}

function Item({ children, on, onClick }: { children: React.ReactNode; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full border-l-2 px-5 py-[9px] text-left text-[13.5px] transition-colors ${
        on
          ? 'border-l-bg-brand-solid text-text-brand-primary bg-bg-tertiary'
          : 'text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary border-l-transparent'
      }`}
    >
      {children}
    </button>
  );
}

/** The most important control in the product, and the first 30 seconds of the demo. */
function Scrubber() {
  const { week, setWeek } = useApp();
  return (
    <div className="border-border-secondary bg-bg-secondary fixed inset-x-0 bottom-0 z-10 flex flex-wrap items-center gap-3 border-t px-4 py-[11px] sm:px-8">
      <span className="text-text-quaternary font-mono text-[11.5px]">Week</span>
      <input
        type="range" min={1} max={6} value={week}
        onChange={(e) => setWeek(Number(e.target.value))}
        aria-label="Week" className="min-w-40 max-w-[340px] flex-1"
      />
      <b className="text-text-brand-primary font-mono text-xs font-medium">
        week {week} · {WEEK_NOTE[week]}
      </b>
      <span className="text-text-quaternary hidden font-mono text-[11.5px] sm:inline">
        — drag to watch the rules form and supersede
      </span>
    </div>
  );
}
