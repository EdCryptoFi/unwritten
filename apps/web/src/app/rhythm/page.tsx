'use client';

import { Gate, ROLES } from '@/components/gate';
import { Badge, Card, Empty, Meta, Page, Progress, Rule } from '@/components/primitives';
import { useApp, useHouse } from '@/lib/state';
import { dayISO, money, say } from '@unwritten/fixtures';

const DOW = [
  { id: 'sun', label: 'S' }, { id: 'mon', label: 'M' }, { id: 'tue', label: 'T' },
  { id: 'wed', label: 'W' }, { id: 'thu', label: 'T' }, { id: 'fri', label: 'F' },
  { id: 'sat', label: 'S' },
];

function RhythmInner() {
  const { week } = useApp();
  const { decisions, beliefsUpTo } = useHouse();
  const cells = [];
  for (let w = 1; w <= week; w++) {
    for (let d = 0; d < 7; d++) {
      const day = (w - 1) * 7 + d + 1;
      const hit = decisions.filter((x) => x.date === dayISO(day))
        .reduce((a, b) => a + b.amountCents, 0);
      cells.push({ key: `${w}-${d}`, w, hit });
    }
  }
  const max = Math.max(1, ...cells.map((c) => c.hit));
  const beliefs = beliefsUpTo.filter((b) => b.dimension === 'rhythm');

  return (
    <Page
      title="Rhythm"
      lede="Not a calendar. A calendar as input would make this a configuration app — cadence is derived, like every other rule."
    >
      <div className="mb-1.5 grid max-w-[300px] grid-cols-7 gap-[3px]">
        {DOW.map((d) => (
          <div key={d.id} className="text-text-quaternary text-center font-mono text-[11px]">
            {d.label}
          </div>
        ))}
        {cells.map((c) => (
          <div
            key={c.key}
            title={`wk${c.w} ${money(c.hit)}`}
            className="aspect-square rounded-[3px]"
            style={{
              background: c.hit
                ? `color-mix(in srgb, var(--color-utility-success-700) ${15 + (85 * c.hit) / max}%, transparent)`
                : 'var(--color-bg-tertiary)',
            }}
          />
        ))}
      </div>
      <p className="text-text-quaternary mb-[22px] font-mono text-[11.5px]">
        {week} week{week > 1 ? 's' : ''} · spend density · 40px of signal instead of a month grid
      </p>

      {beliefs.length ? beliefs.map((b) => (
        <Card key={b.id}>
          <div className="flex items-start justify-between gap-3.5">
            <Rule>{say(b)}</Rule>
            <Badge tone={b.dimension === 'rhythm' && b.isCommitment ? 'success' : 'brand'}>
              {b.dimension === 'rhythm' && b.isCommitment ? 'commitment' : 'habit'}
            </Badge>
          </div>
          <Meta>
            {b.dimension === 'rhythm' && `${b.cadence}${b.weekday ? ` · ${b.weekday}` : ''} · variance ${b.variancePct}%`}
            {' · confidence '}{(b.confidence * 100).toFixed(0)}%
          </Meta>
          <Progress value={b.confidence} />
        </Card>
      )) : <Empty>No rhythm yet — it needs at least three cycles.</Empty>}

      <Card tone="note">
        <Meta>
          One dimension, two payloads. A commitment (fixed amount, fixed interval) leaves the
          anomaly set and turns on price-creep detection, which is what stops the Reality check
          screaming about a subscription every month. A habit catches the $71 Tuesday pizza that
          sits below every approval threshold.
        </Meta>
      </Card>
    </Page>
  );
}

export default function Rhythm() {
  return (
    <Gate allow={[...ROLES.householdAdults]}>
      <RhythmInner />
    </Gate>
  );
}
