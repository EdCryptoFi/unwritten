'use client';

import { CATEGORY_LABEL, CategoryIcon } from '@/components/category-icon';
import { Card, ClayAvatar, Empty, Meta, Page, Progress, Rule, StateBadge } from '@/components/primitives';
import { useApp, useHouse } from '@/lib/state';
import { type Belief, type Category, HOUSE, WEEK_NOTE, money, nameOf, say, soWhat } from '@unwritten/fixtures';

/* A house-wide rule has no category to draw, so it gets the dimension's own glyph. */
const DIMENSION_GLYPH: Record<Belief['dimension'], string> = {
  value_band: 'payments', silence: 'notifications_off', authority: 'how_to_reg',
  friction: 'bolt', drift: 'speed', member_pattern: 'pie_chart', rhythm: 'event_repeat',
};
const DIMENSION_LABEL: Record<Belief['dimension'], string> = {
  value_band: 'solo limit', silence: 'silence floor', authority: 'who decides',
  friction: 'friction', drift: 'drift', member_pattern: 'allowance pattern', rhythm: 'rhythm',
};

export default function Agreement() {
  const { week, me, role } = useApp();
  const { beliefsUpTo: beliefs, decisionsUpTo, beliefs: allBeliefs } = useHouse();

  /* The chain walks the versions that are actually on Mainnet, not a local list. */
  const chainOf = (b: Belief): Belief[] => {
    const out = [b];
    let cur: Belief | undefined = b;
    while (cur?.supersedes) {
      const prev: Belief | undefined = allBeliefs.find((x) => x.id === cur?.supersedes);
      if (!prev) break;
      out.unshift(prev);
      cur = prev;
    }
    return out;
  };
  const { minEvidence, confidenceFloor } = HOUSE.learning;

  return (
    <Page
      title="The Agreement"
      lede={
        beliefs.length
          ? `Nobody wrote these. They came out of ${decisionsUpTo.length} decisions over ${week} week${week > 1 ? 's' : ''} — this is what your house already does.`
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
          Too early to say anything true about this house.
          <br />
          <span className="font-mono text-[11.5px]">
            A rule needs {minEvidence} decisions and {Math.round(confidenceFloor * 100)}% confidence
            before it will claim anything. Keep going — week five is where it gets interesting.
          </span>
        </Empty>
      ) : (
        beliefs.map((b) => {
          const chain = chainOf(b);
          return (
            <Card key={b.id}>
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  {b.scope.category === '*' ? (
                    <span className="bg-primary-fixed text-primary flex h-14 w-14 items-center justify-center rounded-full shadow-[inset_0_2px_3px_rgba(255,255,255,0.9)]">
                      <span aria-hidden="true" className="material-symbols-outlined text-[28px]">{DIMENSION_GLYPH[b.dimension]}</span>
                    </span>
                  ) : (
                    <CategoryIcon category={b.scope.category as Category} size={56} />
                  )}
                  {/* who the rule is about, when it is about one person */}
                  {b.scope.actor !== '*' && (
                    <span className="absolute -right-2 -bottom-2" title={nameOf(b.scope.actor)}>
                      <ClayAvatar label={nameOf(b.scope.actor).charAt(0) || '?'} size="sm"
                        color={HOUSE.members.find((m) => m.ref === b.scope.actor)?.role === 'dependent' ? 'tertiary' : 'primary'} />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="clay-badge clay-badge-neutral normal-case tracking-normal">
                      {b.scope.category === '*' ? 'whole house' : CATEGORY_LABEL[b.scope.category as Category]} · {DIMENSION_LABEL[b.dimension]}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3.5">
                    <Rule>{say(b)}</Rule>
                    <StateBadge state={b.state} />
                  </div>
              {/* The fact, then what it means for the person reading it. Without the second line
                  the screen is a report: seven true sentences and nothing to do about any of them. */}
              <p className="text-on-surface-variant mb-2 text-[13.5px]">{soWhat(b)}</p>
              <Meta>
                {b.dimension} · {b.evidenceCount} event{b.evidenceCount === 1 ? '' : 's'} · confidence{' '}
                {(b.confidence * 100).toFixed(0)}%{b.ratifiedTx ? ' · onchain' : ''}
              </Meta>
              <Progress value={b.confidence} />
              {chain.length > 1 && (
                <div className="text-on-surface-variant mt-[9px] flex items-center gap-[7px] font-mono text-[11.5px]">
                  {chain.map((v, i) => (
                    <span key={v.id} className={i < chain.length - 1 ? 'opacity-50' : 'font-bold'}>
                      v{v.version}{i < chain.length - 1 ? ' →' : ''}
                    </span>
                  ))}
                  <span>· superseded, never edited</span>
                </div>
              )}
                </div>
              </div>
            </Card>
          );
        })
      )}
    </Page>
  );
}
