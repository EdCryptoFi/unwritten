'use client';

import { HOUSE, MAXSPEND, money, say } from '@unwritten/fixtures';
import { Card, Empty, Kpi, Meta, Page, Progress, Rule, StateBadge } from '@/components/primitives';
import { useApp, useHouse } from '@/lib/state';
import { Gate, ROLES } from '@/components/gate';

function AllowanceInner() {
  const { week } = useApp();
  const { topupsUpTo, beliefsUpTo } = useHouse();
  const max = HOUSE.members.find((m) => m.ref === 'm4');
  const weeks = MAXSPEND.slice(0, week);
  const games = weeks.reduce((a, b) => a + b.games, 0);
  const spent = weeks.reduce((a, b) => a + b.games + b.food + b.other, 0);
  // The denominator is the TOP-UPS, not the spend: "78% of his allowance" needs inbound events,
  // and without them you cannot tell spending from saving.
  const given = topupsUpTo.reduce((a, t) => a + t.amountCents, 0);
  const belief = beliefsUpTo.find((b) => b.dimension === 'member_pattern');

  return (
    <Page
      title="Allowance"
      lede="Max cannot open this app, and that is deliberate — he has a wallet and a limit, not an account. What you see here, he does not."
    >
      <Kpi items={[
        ['Weekly limit', money(max?.walletLimitCents ?? 0)],
        ['Allowance given', money(given)],
        ['Spent', money(spent)],
        ['Games / allowance', given ? `${Math.round((games / given) * 100)}%` : '—', 'text-text-warning-primary'],
      ]} />

      {belief ? (
        <Card>
          <div className="flex items-start justify-between gap-3.5">
            <Rule>{say(belief)}</Rule>
            <StateBadge state={belief.state} />
          </div>
          <p className="text-text-tertiary mb-2 text-[13.5px]">
            You set that limit before you knew any of this. Now you know.
          </p>
          <Meta>read from his wallet through Tatum · {belief.evidenceCount} weeks of allowance</Meta>
          <Progress value={belief.confidence} />
        </Card>
      ) : (
        <Empty>
          {money(max?.walletLimitCents ?? 0)} a week, which is a guess — you had nothing to go on
          when you set it.
          <br />
          <span className="font-mono text-[11.5px]">
            Give it three weeks of his actual spending and it will tell you whether you were right.
          </span>
        </Empty>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {weeks.map((w, i) => (
          <Card key={w.week}>
            <Meta>week {i + 1}</Meta>
            <div className="mt-1 flex justify-between text-[13.5px]">
              <span className="text-text-tertiary">games</span>
              <b className="font-mono text-[13px]">{money(w.games)}</b>
            </div>
            <div className="flex justify-between text-[13.5px]">
              <span className="text-text-tertiary">food</span>
              <b className="font-mono text-[13px]">{money(w.food)}</b>
            </div>
          </Card>
        ))}
      </div>

      <Card tone="note">
        <Meta>
          The denominator is the top-ups, not the spend. &ldquo;72% of his allowance&rdquo; needs
          inbound events; &ldquo;72% of what he spent&rdquo; is a weaker, different claim — and
          without the top-ups you cannot tell spending from saving. That is why allowance
          distribution is a real feature while treasury funding is only a seeding script.
        </Meta>
      </Card>
    </Page>
  );
}

export default function Allowance() {
  return (
    <Gate allow={[...ROLES.householdAdults]}>
      <AllowanceInner />
    </Gate>
  );
}
