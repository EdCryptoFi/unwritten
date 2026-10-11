'use client';

import { WEEK_NOTE } from '@unwritten/fixtures';

/**
 * The single most important interaction in the product, and the first 30 seconds of the demo:
 * drag it and the agreement forms, then gets rewritten. Everything else is downstream of this.
 */
export function WeekScrubber({
  week, onChange,
}: { week: number; onChange: (w: number) => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-line bg-panel px-4 py-[11px] sm:px-8">
      <span className="font-mono text-[11.5px] text-dimmer">Week</span>
      <input
        type="range"
        min={1}
        max={6}
        value={week}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Week"
        className="min-w-40 max-w-[340px] flex-1"
      />
      <b className="font-mono text-xs font-medium text-accent">
        week {week} · {WEEK_NOTE[week]}
      </b>
      <span className="hidden font-mono text-[11.5px] text-dimmer sm:inline">
        — drag to watch the rules form and supersede
      </span>
    </div>
  );
}
