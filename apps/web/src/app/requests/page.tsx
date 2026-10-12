'use client';

import { capFor, money } from '@unwritten/fixtures';
import { Badge, Card, Meta, Page, Rule } from '@/components/primitives';
import { useApp } from '@/lib/state';

const MINE = [
  { id: 'q1', amountCents: 4270, category: 'groceries', state: 'pending' as const, signatures: 2 },
  { id: 'q2', amountCents: 1200, category: 'groceries', state: 'auto' as const, signatures: 0 },
];

export default function Requests() {
  const { viewer, week } = useApp();
  const cap = viewer === 'judge' ? { cents: 0 } : capFor(viewer, week);
  const tone = { auto: 'success', pending: 'brand', approved: 'success', rejected: 'error' } as const;
  const label = { auto: 'went through', pending: 'waiting on an approver', approved: 'approved', rejected: 'rejected' };

  return (
    <Page title="My requests" lede="What you asked for, and where it stands.">
      {MINE.map((r) => (
        <Card key={r.id}>
          <div className="flex items-start justify-between gap-3.5">
            <div>
              <Rule>{money(r.amountCents)} · {r.category}</Rule>
              <Meta>
                {r.state === 'auto'
                  ? `within your ${money(cap.cents)} cap — nobody was asked`
                  : `above your ${money(cap.cents)} cap · needs ${r.signatures} signatures`}
              </Meta>
            </div>
            <Badge tone={tone[r.state]}>{label[r.state]}</Badge>
          </div>
        </Card>
      ))}
    </Page>
  );
}
