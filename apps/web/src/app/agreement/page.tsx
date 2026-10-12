'use client';

import { chainOf, DECISIONS, HOUSE, money, say, upTo, visibleBeliefs, WEEK_NOTE } from '@unwritten/fixtures';
import { Card, Empty, Meta, Page, Progress, Rule, StateBadge } from '@/components/primitives';
import { useApp } from '@/lib/state';

export default function Agreement() {
  const { week, me, role } = useApp();
  const beliefs = visibleBeliefs(week);
  const { minEvidence, confidenceFloor } = HOUSE.learning;

  return (
    <Page
      title="The Agreement"
      lede={
        beliefs.length
          ? `Rules nobody wrote. Discovered from ${upTo(DECISIONS, week).length} decisions over ${week} week${week > 1 ? 's' : ''}.`
          : `No rules yet — ${WEEK_NOTE[week]}.`
      }
    >
      {/* What a joining member sees instead of landing on an empty screen. */}
      {me && role !== 'owner' && (
        <Card tone="note">
          <Meta>
            You are {role === 'approver' ? 'an approver' : 'a spender'} in the Wilson house.{' '}
            {role === 'approver'
              ? `You will be asked whenever a request goes above the house number of ${money(HOUSE.policy.autoApproveCents)}. You can accept policy proposals, but only Alex can sign them onchain.`
              : `You have ${money(HOUSE.policy.autoApproveCents)} without asking. Above that, an approver is notified.`}
          </Meta>
        </Card>
      )}

      {beliefs.length === 0 ? (
        /* An empty state is a first-class screen: the product is useless for roughly two weeks
           by construction, so it says what is missing instead of showing nothing. */
        <Empty>
          The agreement is still forming.
          <br />
          <span className="font-mono text-[11.5px]">
            A rule needs {minEvidence} events and {Math.round(confidenceFloor * 100)}% confidence
            before it appears.
          </span>
        </Empty>
      ) : (
        beliefs.map((b) => {
          const chain = chainOf(b);
          return (
            <Card key={b.id}>
              <div className="flex items-start justify-between gap-3.5">
                <Rule>{say(b)}</Rule>
                <StateBadge state={b.state} />
              </div>
              <Meta>
                {b.dimension} · {b.evidenceCount} event{b.evidenceCount === 1 ? '' : 's'} · confidence{' '}
                {(b.confidence * 100).toFixed(0)}%{b.ratifiedTx ? ' · onchain' : ''}
              </Meta>
              <Progress value={b.confidence} />
              {chain.length > 1 && (
                <div className="text-text-quaternary mt-[9px] flex items-center gap-[7px] font-mono text-[11.5px]">
                  {chain.map((v, i) => (
                    <span key={v.id} className={i < chain.length - 1 ? 'opacity-50' : 'font-bold'}>
                      v{v.version}{i < chain.length - 1 ? ' →' : ''}
                    </span>
                  ))}
                  <span>· superseded, never edited</span>
                </div>
              )}
            </Card>
          );
        })
      )}
    </Page>
  );
}
