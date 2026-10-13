'use client';

import { Meta } from '@/components/primitives';
import { useApp } from '@/lib/state';
import { useRouter } from 'next/navigation';

/* Three doors, deliberately not equal weight. The example teaches what a derived rule is in ten
   seconds; "try it yourself" only lands once you know that, so it is second. The judge door leads
   to a short orientation rather than straight to /proof — a reviewer sent to a page of hashes
   skips the product they are scoring. */
export default function Landing() {
  const { setViewer, setWeek } = useApp();
  const router = useRouter();

  const go = (href: string, viewer: 'm1' | 'judge' = 'm1') => {
    setViewer(viewer);
    setWeek(6);
    router.push(href);
  };

  return (
    <div className="max-w-[680px] py-10">
      <p className="text-text-quaternary mb-3 font-mono text-[11px] tracking-[1px] uppercase">
        Unwritten
      </p>
      <h1 className="text-text-primary mb-3.5 text-[34px] leading-[1.15] font-semibold tracking-[-0.5px]">
        The spending agreement
        <br />
        your house already has.
      </h1>
      <p className="text-text-tertiary max-w-[540px] text-base">
        Every household answers one question informally and never writes it down: who can spend
        what, alone, up to how much. We watch real decisions, write it for you, and tell you when
        the rule you think you have is not the rule you actually follow.
      </p>

      <div className="mt-8 space-y-3">
        <Door
          primary
          onClick={() => go('/agreement')}
          title="See a house that already has one"
          body="Six weeks of the Wilson family, seeded and read-only. Drag the weeks and watch the rules form, then watch one get rewritten. Start here — it takes ten seconds to understand."
          cta="Enter the Wilson house"
        />
        <Door
          onClick={() => go('/try')}
          title="Make one about yourself"
          body="Three taps and the same engine derives a rule from your decisions, written to Walrus Mainnet. Makes more sense once you have seen the house above."
          cta="Try it yourself"
        />
        <Door
          quiet
          onClick={() => go('/judge', 'judge')}
          title="Reviewing this for Total Recall?"
          body="A guided path through what is worth looking at, in order, and where the evidence lives."
          cta="I'm a judge"
        />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Note title="Setup asks one number">
          On purpose — so there is something for week five to correct.
        </Note>
        <Note title="No wallet, no gas">
          Two keys in the whole system, and members join with a link.
        </Note>
      </div>
    </div>
  );
}

function Door({
  title, body, cta, onClick, primary, quiet,
}: {
  title: string; body: string; cta: string; onClick: () => void;
  primary?: boolean; quiet?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-xl border p-5 text-left transition-colors ${
        primary
          ? 'border-border-brand bg-utility-brand-50 hover:border-bg-brand-solid'
          : quiet
            ? 'border-border-secondary hover:border-border-primary'
            : 'border-border-primary bg-bg-secondary hover:border-border-brand'
      }`}
    >
      <p className={`mb-1 font-semibold ${primary ? 'text-text-primary text-[17px]' : 'text-text-secondary text-[15px]'}`}>
        {title}
      </p>
      <p className={`text-text-tertiary mb-3 ${primary ? 'text-[13.5px]' : 'text-[13px]'}`}>{body}</p>
      <span
        className={`inline-block rounded-lg px-3.5 py-2 text-[13px] font-semibold ${
          primary
            ? 'bg-bg-brand-solid text-text-primary-on-brand'
            : quiet
              ? 'text-text-brand-primary px-0'
              : 'border-border-primary text-text-primary border'
        }`}
      >
        {cta} →
      </span>
    </button>
  );
}

function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-border-secondary bg-bg-secondary rounded-[10px] border px-[18px] py-4">
      <p className="text-text-primary mb-1 text-sm font-medium">{title}</p>
      <Meta>{children}</Meta>
    </div>
  );
}
