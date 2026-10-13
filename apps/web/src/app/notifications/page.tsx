'use client';

import { Badge, Card, Empty, Meta, Page, Rule } from '@/components/primitives';
import { useApp } from '@/lib/state';
import { type Ref, nameOf } from '@unwritten/fixtures';
import { useState } from 'react';

/* A notification is a RECORD; the channel (in-app, email, push) is a delivery adapter.
   Only three kinds interrupt — an agent that notifies you about its own learning is unbearable. */
const KIND = {
  pending_approval: { interrupts: true, text: 'A request needs your approval' },
  unapproved_spend: { interrupts: true, text: 'Spend with no approval recorded' },
  request_resolved: { interrupts: true, text: 'Your request was decided' },
  digest_ready: { interrupts: false, text: 'Your weekly digest is ready' },
  treasury_low: { interrupts: false, text: 'House balance is low' },
  proposal_ready: { interrupts: false, text: 'A policy proposal is waiting' },
} as const;

const SEED: Array<{ id: string; kind: keyof typeof KIND; to: Ref[]; atHour: number }> = [
  { id: 'n1', kind: 'digest_ready', to: ['m1', 'm2'], atHour: 0 },
  { id: 'n2', kind: 'unapproved_spend', to: ['m1', 'm2'], atHour: 2 },
  { id: 'n3', kind: 'treasury_low', to: ['m1'], atHour: 5 },
  { id: 'n4', kind: 'proposal_ready', to: ['m1', 'm2'], atHour: 7 },
  { id: 'n5', kind: 'request_resolved', to: ['m3'], atHour: 1 },
];

export default function Notifications() {
  const { viewer } = useApp();
  const [read, setRead] = useState<string[]>([]);
  const mine = SEED.filter((n) => viewer !== 'judge' && n.to.includes(viewer));

  return (
    <Page
      title="Notifications"
      lede="Only three kinds interrupt. Everything else waits for the weekly digest."
    >
      {mine.length ? mine.map((n) => (
        <Card key={n.id}>
          <div className="flex items-start justify-between gap-3.5">
            <div className={read.includes(n.id) ? 'opacity-55' : ''}>
              <Rule>{KIND[n.kind].text}</Rule>
              <Meta>{n.kind} · {n.atHour}h ago · to {n.to.map(nameOf).join(', ')}</Meta>
            </div>
            <Badge tone={KIND[n.kind].interrupts ? 'error' : 'gray'}>
              {KIND[n.kind].interrupts ? 'interrupts' : 'digest'}
            </Badge>
          </div>
        </Card>
      )) : <Empty>Nothing for you.</Empty>}

      {mine.length > 0 && (
        <button type="button" onClick={() => setRead(mine.map((n) => n.id))}
          className="border-border-primary text-text-tertiary rounded-lg border px-3.5 py-2 text-[13px]">
          Mark all read
        </button>
      )}

      <Card tone="note">
        <Meta>
          This matters for correctness, not polish: the approval deadline runs from the
          notification, never from creation. Escalating someone who was never told is not an
          escalation.
        </Meta>
      </Card>
    </Page>
  );
}
