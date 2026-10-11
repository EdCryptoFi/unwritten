import type { BeliefState } from '@unwritten/fixtures';

export function Card({
  children, tone = 'plain', onClick,
}: { children: React.ReactNode; tone?: 'plain' | 'note'; onClick?: () => void }) {
  const base =
    'rounded-[var(--radius-card)] border px-[18px] py-4 mb-3 transition-colors text-left w-full';
  const tones = {
    plain: 'bg-panel border-line',
    note: 'bg-[#0e1420] border-[#1e3a5f]',
  } as const;
  const interactive = onClick ? 'cursor-pointer hover:border-line-lit' : '';
  return onClick ? (
    <button type="button" onClick={onClick} className={`${base} ${tones[tone]} ${interactive}`}>
      {children}
    </button>
  ) : (
    <div className={`${base} ${tones[tone]}`}>{children}</div>
  );
}

const TAGS: Record<BeliefState, [string, string]> = {
  observed: ['bg-[#1e2b3a] text-info', 'observed'],
  ratified: ['bg-[#14301f] text-accent', 'ratified'],
  drifting: ['bg-[#3a2a12] text-warn', 'drifting'],
};

export function Tag({ state }: { state: BeliefState }) {
  const [cls, label] = TAGS[state];
  return (
    <span
      className={`${cls} shrink-0 rounded px-[7px] py-[3px] text-[10px] font-semibold uppercase tracking-[0.7px]`}
    >
      {label}
    </span>
  );
}

export function Meta({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[11.5px] text-dimmer">{children}</div>;
}

export function Confidence({ value }: { value: number }) {
  return (
    <div className="mt-[9px] h-[3px] overflow-hidden rounded-sm bg-line">
      <div className="h-full bg-accent" style={{ width: `${value * 100}%` }} />
    </div>
  );
}
