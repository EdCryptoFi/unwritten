'use client';

import Link from 'next/link';
import { Card, Meta, Page } from '@/components/primitives';

/* A reviewer has three to five minutes and spends most of it deciding whether to keep going.
   Sending them straight to a page of hashes means they score the evidence and skip the product. */
const PATH: Array<[string, string, string]> = [
  ['/agreement', 'The Agreement', 'Rules nobody wrote. Drag the week scrubber at the bottom from 1 to 6 — the agreement forms, and in week 5 one rule is superseded by a new version rather than edited.'],
  ['/reality', 'Reality check', 'Two halves. The top reads the house wallet through Tatum and matches every transfer against the decisions in memory — the unapproved rows exist in neither source alone. The bottom is what memory knows on its own: a subscription that quietly repriced, a Tuesday pizza under every threshold, a purchase split in two to stay inside a cap.'],
  ['/digest', 'Weekly digest', 'Accept a proposal as Sam and it waits — only the owner key can sign it onchain. Switch to Alex at the top left and sign. There is a button to simulate the transaction failing.'],
  ['/keys', 'Keys', 'As Alex: revoke the delegate, then press remember(). The application loses access to the house’s own memory and cannot stop it.'],
  ['/try', 'Try it yourself', 'Three taps and the same engine derives a rule about you, written to Walrus Mainnet in a sandbox namespace.'],
  ['/proof', 'Proof', 'Blob ids, the seed disclosure, the four Tatum reads, and the command to verify it against the live relayer yourself.'],
];

export default function Judge() {
  return (
    <Page
      title="For reviewers"
      lede="Six stops, in order, with the point of each one. The whole path is about four minutes."
    >
      {PATH.map(([href, title, why], i) => (
        <Card key={href}>
          <div className="flex gap-3.5">
            <span className="text-text-quaternary font-mono text-[13px]">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <Link href={href} className="text-text-brand-primary mb-1 block text-[15.5px] font-medium">
                {title} →
              </Link>
              <Meta>{why}</Meta>
            </div>
          </div>
        </Card>
      ))}

      <Card>
        <Meta>
          <a href="https://github.com/EdCryptoFi/unwritten" target="_blank" rel="noreferrer"
            className="text-text-brand-primary">Repository ↗</a>
          {' · '}
          <a href="https://github.com/EdCryptoFi/unwritten-ai-builder" target="_blank" rel="noreferrer"
            className="text-text-brand-primary">AI Builder first version ↗</a>
          {' · '}
          <Link href="/proof" className="text-text-brand-primary">Proof</Link>
        </Meta>
      </Card>

      <Card tone="note">
        <Meta>
          Two things worth knowing before you start. The role switcher at the top left changes the
          whole application — a spender gets three screens and no oversight surfaces, which is the
          point. And no hash appears anywhere in the product: every blob id and transaction digest
          lives on <Link href="/proof" className="text-text-brand-primary">/proof</Link>, which the
          app itself never links to.
        </Meta>
      </Card>
    </Page>
  );
}
