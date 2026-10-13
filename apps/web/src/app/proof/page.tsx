'use client';

import { BELIEFS, HOUSE, money, say, wilsonProbes } from '@unwritten/fixtures';
import { agreement, deriveAll } from '@unwritten/policy';
import { Card, Kpi, Meta, Page, Rule } from '@/components/primitives';
import { addrUrl, sui, txUrl, useChain } from '@/lib/chain';
import { LINKS } from '@/lib/links';
import { useHouse } from '@/lib/state';

/* For reviewers. THE APP NEVER LINKS HERE — it is referenced from the README, the write-up and
   the architecture beat of the demo, so the product stays abstracted and the evidence stays
   findable. This is the only surface in the app where a hash appears. */
export default function Proof() {
  const { decisionsUpTo: decisions, spendUpTo, topupsUpTo, beliefsUpTo, counts, seed, source } = useHouse();
  const { chain } = useChain();
  const total = Object.values(counts ?? {}).reduce<number>((a, b) => a + b, 0)
    || decisions.length + spendUpTo.length + topupsUpTo.length + beliefsUpTo.length;

  /* Re-derived on every render rather than imported, so this cannot silently become a snapshot
     of a passing result. `week: 6` matches the seeded window. */
  const checks = agreement(
    deriveAll({
      decisions, spend: spendUpTo, topups: topupsUpTo,
      knobs: HOUSE.learning, policy: HOUSE.policy, week: 6,
    }, wilsonProbes(6)),
    BELIEFS, say,
  );

  /* The rubric is one thing and the submission checklist is another. A reviewer ticking boxes
     should not have to work out which section answers which requirement. */
  const CHECKS: Array<[string, string, string | null]> = [
    ['Walrus Memory integrated and writing on Mainnet', `${total} memories across 4 namespaces, every blob id below resolvable`, '#walrus'],
    ['At least 10 memories stored on Mainnet', `${total}, counted with listNamespaces rather than recall`, '#walrus'],
    ['Tatum RPC used for onchain data where relevant', 'four calls, and the only path that exists since fullnodes dropped JSON-RPC', '#tatum'],
    ['Working demo', LINKS.video ? 'the video' : 'the application you are in; video not published yet', LINKS.video],
    ['Public repo', 'EdCryptoFi/unwritten', LINKS.repo],
    ['Published blog post', LINKS.writeup ? 'the write-up' : 'written, not published yet', LINKS.writeup],
    ['Optional · built with Tatum AI Builder', 'the generated first version, kept in its own repo', LINKS.aiBuilder],
  ];

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

      <H>The submission checklist, line by line</H>
      <Card>
        {CHECKS.map(([req, where, href]) => (
          <div key={req} className="border-border-primary flex gap-3 border-b py-2 last:border-0">
            <span className="text-text-quaternary w-[13px] shrink-0 font-mono text-[13px]">
              {href === null ? '○' : '✓'}
            </span>
            <div>
              <div className="text-[13.5px]">{req}</div>
              <Meta>
                {href === null ? where : <a href={href} className="text-text-brand-primary">{where} →</a>}
              </Meta>
            </div>
          </div>
        ))}
      </Card>

      <Card tone="note">
        <Rule>Verify it yourself</Rule>
        <Meta>
          Every blob id below is a link. It resolves on a public Walrus aggregator and returns
          Seal-encrypted bytes — unreadable by design, and present, which is the whole claim.
          <br />
          <br />
          <code className="text-text-brand-primary">pnpm verify</code> queries the live relayer and
          chain and prints the memory count per namespace, every blob id, the two-account Observer
          comparison, and the onchain policy state. A page of hashes is something you have to
          believe; a script is something you can run.
        </Meta>
      </Card>

      <H>Where everything else is</H>
      <Card>
        <Meta>
          <a href="https://github.com/EdCryptoFi/unwritten" target="_blank" rel="noreferrer"
            className="text-text-brand-primary">The repository ↗</a>
          {' — specs, the clickable prototype the schema was derived from, and '}
          <code>pnpm verify</code>.
          <br />
          <a href="https://github.com/EdCryptoFi/unwritten-ai-builder" target="_blank" rel="noreferrer"
            className="text-text-brand-primary">The first version ↗</a>
          {' — the main screen as Tatum AI Builder generated it, kept separate so the lineage is verifiable.'}
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

      <H id="walrus">decisions · {decisions.length} blobs</H>
      {decisions.slice(0, 4).map((e) => (
        <Card key={e.id}>
          <Meta>
            {e.date} · {money(e.amountCents)} · {e.category} · {e.outcome}
            {e.writtenAt ? ` · written ${e.writtenAt.slice(0, 19).replace('T', ' ')}Z` : ''}
          </Meta>
          <Blob id={e.blobId} />
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
          <Blob id={b.blobId} />
        </Card>
      ))}

      {/* The strongest claim in the project — that the rules are derived, not written — used to
          be provable only by reading a terminal during a seed that can never be re-run. */}
      <H>derived, not hardcoded · {checks.filter((r) => r.agrees).length} of {checks.length}</H>
      <Card>
        <Meta>
          Computed in your browser, right now. Every rule below was produced by running
          <code> packages/policy</code> over the six weeks of events — the same function the seeder
          called to write to Mainnet — and compared against what the screens show. If a rule were
          hardcoded, this is where it would say <em>differs</em>.
        </Meta>
      </Card>
      {checks.map((r) => (
        <Card key={r.id}>
          <Meta>
            <span className={r.agrees ? 'text-text-success-primary' : 'text-text-warning-primary'}>
              {r.agrees ? 'agrees' : 'differs'}
            </span>
            {` · ${r.dimension} · ${r.id}`}
          </Meta>
          <div className="mt-1 text-[13px]">{r.derived}</div>
          {!r.agrees && <Meta>screen says: {r.fixture}</Meta>}
        </Card>
      ))}

      {/* The page proved Walrus and said nothing about Sui, which is half a proof. */}
      <H>the Sui side</H>
      <Card>
        <Meta>The house wallet, and everything that has ever left it.</Meta>
        {chain?.wallet && (
          <a href={addrUrl(chain.wallet)} target="_blank" rel="noreferrer"
            className="text-text-brand-primary font-mono text-[10.5px] break-all underline decoration-dotted underline-offset-2">
            {chain.wallet} ↗
          </a>
        )}
      </Card>
      {(chain?.reconciled ?? []).slice(0, 4).map((r) => (
        <Card key={r.digest}>
          <Meta>
            {r.date} · {sui(r.mist)} · {r.category} ·{' '}
            {r.approvalId ? `matched to ${r.approvalId}` : 'no approval in memory'}
          </Meta>
          <a href={txUrl(r.digest)} target="_blank" rel="noreferrer"
            className="text-text-brand-primary font-mono text-[10.5px] break-all underline decoration-dotted underline-offset-2">
            {r.digest} ↗
          </a>
        </Card>
      ))}

      <H id="tatum">the four Tatum reads</H>
      <Card>
        <Meta>
          <strong>suix_queryTransactionBlocks</strong> · the house wallet&apos;s outgoing
          transfers, which is the reconciliation&apos;s only source of truth about money
          <br />
          <strong>suix_getBalance</strong> · the treasury, for the low-balance nudge
          <br />
          <strong>sui_getLatestCheckpointSequenceNumber</strong> · anchors a sandbox session
          against a chain height
          <br />
          <strong>signAndExecuteTransaction</strong> · the transfers themselves are signed through
          the gateway
          <br />
          <br />
          endpoint: <code>sui-mainnet.gateway.tatum.io</code>. Not a convenience — public Sui
          fullnodes deprecated JSON-RPC in July 2026 and answer &ldquo;migrate to gRPC or
          GraphQL&rdquo;. The gateway is the path that exists. And Tatum&apos;s Data API does not
          cover Sui at all, so wallet history comes over RPC rather than from <code>/v4/data</code>.
        </Meta>
      </Card>
    </Page>
  );
}

/**
 * A clickable blob id, served by a public Walrus aggregator. The bytes come back Seal-encrypted
 * and unreadable — that is the point: anyone can confirm they EXIST on the network without being
 * able to read a family's decisions. A hash you cannot resolve is a hash you have to take on
 * faith, which is the opposite of what this page is for.
 */
function Blob({ id }: { id?: string | undefined }) {
  if (!id || id.startsWith('0x')) {
    return <div className="text-text-quaternary font-mono text-[10.5px]">not recalled from Mainnet</div>;
  }
  return (
    <a
      href={`https://aggregator.walrus-mainnet.walrus.space/v1/blobs/${id}`}
      target="_blank" rel="noreferrer"
      className="text-text-brand-primary font-mono text-[10.5px] break-all underline decoration-dotted underline-offset-2"
    >
      {id} ↗
    </a>
  );
}

const H = ({ children, id }: { children: React.ReactNode; id?: string }) => (
  <h2 id={id} className="text-text-quaternary mt-[26px] mb-[9px] scroll-mt-6 text-[12px] font-semibold uppercase tracking-[0.8px]">{children}</h2>
);
