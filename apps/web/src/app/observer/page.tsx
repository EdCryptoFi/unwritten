'use client';

import { Card, Meta, Page } from '@/components/primitives';
import { useApp } from '@/lib/state';
import { DECISIONS, upTo } from '@unwritten/fixtures';

export default function Observer() {
  const { week } = useApp();
  const events = upTo(DECISIONS, week);
  const totals = Object.entries(
    events.reduce<Record<string, number>>((a, d) => {
      a[d.category] = (a[d.category] ?? 0) + d.amountCents;
      return a;
    }, {}),
  ).map(([category, cents]) => ({ category, cents }));

  return (
    <Page
      title="Observer digest"
      lede="Delegate authorization is account-wide, so reads cannot be scoped. We scope the write instead."
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <H>House account · raw</H>
          <Pre>{JSON.stringify(events.slice(-2), null, 2)}</Pre>
        </div>
        <div>
          <H>Observer account · digest</H>
          <Pre>{JSON.stringify({
            kind: 'digest',
            period: `weeks 1–${week}`,
            totalsByCategory: totals,
            decisionCount: events.length,
            lineItems: 'omitted by construction',
            memberIdentities: 'never written',
          }, null, 2)}</Pre>
        </div>
      </div>

      <Card tone="note">
        <Meta>
          Two MemWalAccounts, with the app&apos;s delegate key registered on both. Same question,
          two answers, an auditable difference. The Observer possesses only the aggregate, so no
          filtering trust is required — which is what makes this different from a server that
          promises to redact.
        </Meta>
      </Card>
    </Page>
  );
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-text-quaternary mt-[26px] mb-[9px] text-[12px] font-semibold uppercase tracking-[0.8px]">{children}</h2>
);
const Pre = ({ children }: { children: React.ReactNode }) => (
  <pre className="bg-bg-secondary border-border-secondary text-text-tertiary mb-3 overflow-auto rounded-lg border p-3 font-mono text-[11.5px] leading-relaxed">
    {children}
  </pre>
);
