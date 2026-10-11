'use client';

import {
  chainOf, DECISIONS, HOUSE, memberOf, money, say, upTo, visibleBeliefs, WEEK_NOTE,
} from '@unwritten/fixtures';
import { useMemo, useState } from 'react';
import { Card, Confidence, Meta, Tag } from '@/components/primitives';
import { WeekScrubber } from '@/components/week-scrubber';

/** Page 1 — The Agreement. Rules nobody wrote. */
export default function AgreementPage() {
  const [week, setWeek] = useState(6);
  const beliefs = useMemo(() => visibleBeliefs(week), [week]);
  const decisionCount = useMemo(() => upTo(DECISIONS, week).length, [week]);
  const { minEvidence, confidenceFloor } = HOUSE.learning;

  return (
    <>
      <main className="mx-auto max-w-[960px] px-4 pb-28 pt-7 sm:px-8">
        <h1 className="mb-1 text-[21px] font-semibold tracking-[-0.3px]">The Agreement</h1>
        <p className="mb-6 text-[13.5px] text-dim">
          {beliefs.length
            ? `Rules nobody wrote. Discovered from ${decisionCount} decisions over ${week} week${week > 1 ? 's' : ''}.`
            : `No rules yet — ${WEEK_NOTE[week]}.`}
        </p>

        {beliefs.length === 0 ? (
          /* An empty state is a first-class screen here: the product is useless for roughly two
             weeks by construction, so it says what is still missing instead of showing nothing. */
          <div className="rounded-[var(--radius-card)] border border-dashed border-line px-6 py-7 text-center text-[13.5px] text-dimmer">
            The agreement is still forming.
            <br />
            <span className="font-mono text-[11.5px]">
              A rule needs {minEvidence} events and {Math.round(confidenceFloor * 100)}% confidence
              before it appears.
            </span>
          </div>
        ) : (
          beliefs.map((b) => {
            const chain = chainOf(b);
            return (
              <Card key={b.id}>
                <div className="flex items-start justify-between gap-3.5">
                  <p className="mb-[7px] text-[15.5px]">{say(b)}</p>
                  <Tag state={b.state} />
                </div>
                <Meta>
                  {b.dimension} · {b.evidenceCount} event{b.evidenceCount === 1 ? '' : 's'} ·
                  confidence{' '}
                  {(b.confidence * 100).toFixed(0)}%
                  {b.ratifiedTx ? ' · onchain' : ''}
                </Meta>
                <Confidence value={b.confidence} />
                {chain.length > 1 && (
                  <div className="mt-[9px] flex items-center gap-[7px] font-mono text-[11.5px] text-dimmer">
                    {chain.map((v, i) => (
                      <span key={v.id} className={i < chain.length - 1 ? 'opacity-50' : 'font-bold'}>
                        v{v.version}
                        {i < chain.length - 1 ? ' →' : ''}
                      </span>
                    ))}
                    <span>· superseded, never edited</span>
                  </div>
                )}
              </Card>
            );
          })
        )}

        <Orientation week={week} />
      </main>
      <WeekScrubber week={week} onChange={setWeek} />
    </>
  );
}

/** What a joining member sees instead of landing on an empty Agreement. */
function Orientation({ week }: { week: number }) {
  const me = memberOf('m2');
  if (!me) return null;
  return (
    <Card tone="note">
      <Meta>
        You are an approver in the Wilson house. You will be asked whenever a request goes above the
        house number of {money(HOUSE.policy.autoApproveCents)}. You can accept policy proposals, but
        only Alex can sign them onchain.
        <br />
        <br />
        Week {week}: {WEEK_NOTE[week]}.
      </Meta>
    </Card>
  );
}
