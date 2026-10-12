'use client';

import { money } from '@unwritten/fixtures';
import { Card, Kpi, Meta, Page, Rule } from '@/components/primitives';
import { useHouse } from '@/lib/state';

/* For reviewers. THE APP NEVER LINKS HERE — it is referenced from the README, the write-up and
   the architecture beat of the demo, so the product stays abstracted and the evidence stays
   findable. This is the only surface in the app where a hash appears. */
export default function Proof() {
  const { decisionsUpTo: decisions, spendUpTo, topupsUpTo, beliefsUpTo, counts, seed, source } = useHouse();
  const total = Object.values(counts ?? {}).reduce<number>((a, b) => a + b, 0)
    || decisions.length + spendUpTo.length + topupsUpTo.length + beliefsUpTo.length;

  return (
    <Page
      title="Proof"
      lede={`${source === 'mainnet' ? 'Read live from Walrus Mainnet. ' : ''}For reviewers — the app never links here. It is referenced from the README, the write-up and the demo, so the product stays abstracted while the evidence stays findable.`}
    >
      <Kpi items={[
        ['Memories on Mainnet', String(total)],
        ['Seed', seed ?? '—'],
        ['Requirement', '10+'],
        ['Namespaces', '4'],
        ['Walrus epochs', '50 ≈ 2y'],
      ]} />

      <Card tone="note">
        <Rule>Verify it yourself</Rule>
        <Meta>
          <code className="text-text-brand-primary">pnpm verify</code> queries the live relayer and
          chain and prints the memory count per namespace, every blob id, the two-account Observer
          comparison, and the onchain policy state. A page of hashes is something you have to
          believe; a script is something you can run.
        </Meta>
      </Card>

      <H>Seed disclosure</H>
      <Card>
        <Meta>
          The Wilson house is seeded. A deterministic script runs the real engine over six weeks of
          household decisions and writes them to Walrus Mainnet. Nothing is faked downstream of
          that script, and every rule here was derived by the same pure functions that run in
          production. An undisclosed seed is the kind of thing a reader is right to distrust.
        </Meta>
      </Card>

      <H>decisions · {decisions.length} blobs</H>
      {decisions.slice(0, 4).map((e) => (
        <Card key={e.id}>
          <Meta>{e.date} · {money(e.amountCents)} · {e.category} · {e.outcome}</Meta>
          <div className="text-text-brand-primary font-mono text-[10.5px] break-all">{e.blobId}</div>
        </Card>
      ))}

      <H>beliefs · supersession chain</H>
      {beliefsUpTo.slice(0, 3).map((b) => (
        <Card key={b.id}>
          <Meta>
            {b.id} · v{b.version}
            {b.supersedes ? ` supersedes ${b.supersedes}` : ''}
            {b.ratifiedTx ? ` · tx ${b.ratifiedTx}` : ''}
          </Meta>
          <div className="text-text-brand-primary font-mono text-[10.5px] break-all">{b.blobId}</div>
        </Card>
      ))}

      <H>the four Tatum reads</H>
      <Card>
        <Meta>
          Data API · house wallet transaction history → spend with no approval
          <br />
          Data API · dependent wallet transaction history → the member_pattern denominator
          <br />
          Notifications · real-time spend detection
          <br />
          Sui RPC · the ratified policy state and approval records
          <br />
          <br />
          endpoint: sui-testnet.gateway.tatum.io · one environment variable switches to mainnet,
          with no branching logic
        </Meta>
      </Card>
    </Page>
  );
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-text-quaternary mt-[26px] mb-[9px] text-[12px] font-semibold uppercase tracking-[0.8px]">{children}</h2>
);
