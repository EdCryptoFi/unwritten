'use client';

import { HOUSE, money } from '@unwritten/fixtures';
import { useRouter } from 'next/navigation';
import { Card, Meta } from '@/components/primitives';
import { useApp } from '@/lib/state';

export default function Landing() {
  const { setViewer, setWeek } = useApp();
  const router = useRouter();

  /* A visitor who lands on empty onboarding sees the one screen that says "I have nothing".
     One click puts them in the seeded house at week six instead. */
  const enterDemo = () => {
    setViewer('m1');
    setWeek(6);
    router.push('/agreement');
  };

  return (
    <div className="max-w-[640px] py-10">
      <p className="text-text-quaternary mb-3 font-mono text-[11px] uppercase tracking-[1px]">Unwritten</p>
      <h1 className="text-text-primary mb-3.5 text-[34px] leading-[1.15] font-semibold tracking-[-0.5px]">
        The spending agreement
        <br />
        your house already has.
      </h1>
      <p className="text-text-tertiary max-w-[520px] text-base">
        Every household answers one question informally and never writes it down: who can spend
        what, alone, up to how much. We watch real decisions, write it for you, and tell you when
        the rule you think you have is not the rule you actually follow.
      </p>

      <div className="my-[26px] flex flex-wrap gap-2">
        <button
          type="button" onClick={enterDemo}
          className="bg-bg-brand-solid hover:bg-bg-brand-solid-hover text-text-primary-on-brand rounded-lg px-4 py-2.5 text-[13px] font-semibold"
        >
          Enter the Wilson house →
        </button>
        <button
          type="button" onClick={() => { setViewer('judge'); router.push('/proof'); }}
          className="border-border-primary text-text-tertiary hover:text-text-primary rounded-lg border px-4 py-2.5 text-[13px]"
        >
          I&apos;m a judge
        </button>
      </div>

      <Card>
        <Meta>
          A seeded six-week household, read-only. Drag the weeks at the bottom to watch rules form
          and get rewritten. Switch roles at the top to see what an approver, a spender and a judge
          each get.
        </Meta>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="text-text-primary mb-1 text-sm font-medium">Setup asks one number</p>
          <Meta>On purpose — so there is something for week five to correct.</Meta>
        </Card>
        <Card>
          <p className="text-text-primary mb-1 text-sm font-medium">No wallet, no gas</p>
          <Meta>
            Two keys in the whole system, and members join with a link. Your floor of autonomy is{' '}
            {money(HOUSE.policy.autoApproveCents)}.
          </Meta>
        </Card>
      </div>
    </div>
  );
}
