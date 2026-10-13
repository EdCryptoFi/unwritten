'use client';

import { Gate, ROLES } from '@/components/gate';
import { Badge, Card, Meta, Page, Rule } from '@/components/primitives';
import { useHouse } from '@/lib/state';
import { money, nameOf } from '@unwritten/fixtures';

function HistoryInner() {
  const { decisionsUpTo } = useHouse();
  const events = [...decisionsUpTo].reverse();

  return (
    <Page
      title="History"
      lede="What was decided, by whom, in order. No hashes — those live on the proof page the app never links to."
    >
      {events.map((e) => (
        <Card key={e.id}>
          <div className="flex items-start justify-between gap-3.5">
            <div>
              <Rule>{money(e.amountCents)} · {e.category}</Rule>
              <Meta>
                {e.date} · {e.outcome}
                {e.decidedBy.length
                  ? ` by ${e.decidedBy.map((d) => nameOf(d.ref)).join(' → ')}`
                  : ' · nobody was asked'}
                {e.latencySeconds !== null ? ` · ${e.latencySeconds}s` : ''}
              </Meta>
            </div>
            <Badge tone={e.outcome === 'auto' ? 'gray' : e.outcome === 'approved' ? 'success' : 'error'}>
              {e.outcome}
            </Badge>
          </div>
        </Card>
      ))}
    </Page>
  );
}

export default function History() {
  return (
    <Gate allow={[...ROLES.householdAdults]}>
      <HistoryInner />
    </Gate>
  );
}
