'use client';

import { type Tour, type Viewer, useApp } from '@/lib/state';
import { type Stop, TOURS, VIEWER_LABEL } from '@/lib/tours';
import { usePathname, useRouter } from 'next/navigation';

/** Navigate as someone: sets the role a screen needs before the screen renders. */
export function useGo() {
  const { setViewer, setWeek, setTour } = useApp();
  const router = useRouter();
  return (href: string, as: Viewer, tour?: Tour) => {
    setViewer(as);
    setWeek(6);
    if (tour !== undefined) setTour(tour);
    router.push(href);
  };
}

/**
 * The guided path's control, shown above every stop while a tour is on.
 *
 * It says which stop this is, who you are on it, and what to look for — and it fixes the role if
 * you arrived some other way, rather than letting a screen answer "Not your screen".
 */
export function TourBar() {
  const { tour, setTour, viewer, setViewer } = useApp();
  const path = usePathname();
  const go = useGo();
  if (!tour) return null;

  const t = TOURS[tour];
  const i = t.stops.findIndex((s) => s.href === path);
  if (i < 0) return null;
  const stop = t.stops[i] as Stop;
  const prev = t.stops[i - 1];
  const next = t.stops[i + 1];
  const accent = tour === 'judge' ? 'text-tertiary' : 'text-primary';
  const fill = tour === 'judge' ? 'bg-tertiary' : 'bg-primary';

  return (
    <div className="clay-card mb-6 rounded-xl p-4 lg:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-label-caps font-bold tracking-wider uppercase ${accent}`}>
              {t.name} · stop {i + 1} of {t.stops.length}
            </span>
            <span className="clay-badge clay-badge-neutral normal-case tracking-normal">
              you are {VIEWER_LABEL[stop.as] ?? stop.as}
            </span>
          </div>
          <p className="text-on-surface mt-1 text-sm font-semibold">{stop.title}</p>
          <p className="text-on-surface-variant text-body-sm">{stop.look}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {viewer !== stop.as && (
            <button type="button" onClick={() => setViewer(stop.as)}
              className="clay-pill clay-pill-secondary px-4 py-2 text-sm font-semibold">
              View as {VIEWER_LABEL[stop.as]}
            </button>
          )}
          {stop.also && viewer === stop.as && (
            <button type="button" onClick={() => stop.also && setViewer(stop.also.as)}
              className="clay-pill clay-pill-secondary px-4 py-2 text-sm font-semibold">
              {stop.also.label}
            </button>
          )}
          {prev && (
            <button type="button" onClick={() => go(prev.href, prev.as)}
              className="clay-pill clay-pill-secondary inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
          )}
          {next ? (
            <button type="button" onClick={() => go(next.href, next.as)}
              className={`clay-pill ${tour === 'judge' ? 'clay-pill-tertiary' : 'clay-pill-primary'} inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold`}>
              Next · {next.title}
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          ) : (
            <button type="button" onClick={() => go(t.end.href, 'm1', null)}
              className={`clay-pill ${tour === 'judge' ? 'clay-pill-tertiary' : 'clay-pill-primary'} inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold`}>
              {t.end.label}
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          )}
          <button type="button" onClick={() => setTour(null)}
            className="text-on-surface-variant hover:text-on-surface px-2 text-xs underline decoration-dotted underline-offset-2">
            exit tour
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-1.5" aria-hidden>
        {t.stops.map((s, k) => (
          <span key={s.href} className={`h-1.5 flex-1 rounded-full ${k <= i ? fill : 'bg-surface-container-high'}`} />
        ))}
      </div>
    </div>
  );
}
