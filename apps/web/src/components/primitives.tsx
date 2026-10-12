import type { BeliefState } from '@unwritten/fixtures';

type Tone = 'plain' | 'note' | 'alert';

export function Card({
  children, tone = 'plain', onClick,
}: { children: React.ReactNode; tone?: Tone; onClick?: () => void }) {
  const tones: Record<Tone, string> = {
    plain: 'bg-bg-secondary border-border-secondary',
    note: 'bg-utility-brand-50 border-utility-brand-200',
    alert: 'bg-utility-error-50 border-utility-error-200',
  };
  const cls = `w-full rounded-[10px] border px-[18px] py-4 mb-3 text-left transition-colors ${tones[tone]} ${
    onClick ? 'cursor-pointer hover:border-border-primary' : ''
  }`;
  return onClick ? (
    <button type="button" onClick={onClick} className={cls}>{children}</button>
  ) : (
    <div className={cls}>{children}</div>
  );
}

export type BadgeTone = 'brand' | 'success' | 'warning' | 'error' | 'gray';

const BADGE: Record<BadgeTone, string> = {
  brand: 'bg-utility-brand-50 text-utility-brand-700 border-utility-brand-200',
  success: 'bg-utility-success-50 text-utility-success-700 border-utility-success-200',
  warning: 'bg-utility-warning-50 text-utility-warning-700 border-utility-warning-200',
  error: 'bg-utility-error-50 text-utility-error-700 border-utility-error-200',
  gray: 'bg-utility-gray-50 text-utility-gray-700 border-utility-gray-200',
};

export function Badge({ tone = 'gray', children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={`${BADGE[tone]} shrink-0 rounded-full border px-2 py-[2px] text-[11px] font-medium whitespace-nowrap`}>
      {children}
    </span>
  );
}

const STATE_TONE: Record<BeliefState, BadgeTone> = {
  observed: 'brand', ratified: 'success', drifting: 'warning',
};

export const StateBadge = ({ state }: { state: BeliefState }) => (
  <Badge tone={STATE_TONE[state]}>{state}</Badge>
);

export const Meta = ({ children }: { children: React.ReactNode }) => (
  <div className="text-text-quaternary font-mono text-[11.5px] leading-relaxed">{children}</div>
);

export const Rule = ({ children }: { children: React.ReactNode }) => (
  <p className="text-text-primary mb-[7px] text-[15.5px]">{children}</p>
);

export const Progress = ({ value }: { value: number }) => (
  <div className="bg-bg-tertiary mt-[9px] h-[3px] overflow-hidden rounded-sm">
    <div className="bg-utility-success-700 h-full" style={{ width: `${value * 100}%` }} />
  </div>
);

export function Page({ title, lede, children }: { title: string; lede: string; children: React.ReactNode }) {
  return (
    <>
      <h1 className="text-text-primary mb-1 text-[21px] font-semibold tracking-[-0.3px]">{title}</h1>
      <p className="text-text-tertiary mb-6 text-[13.5px]">{lede}</p>
      {children}
    </>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-border-secondary text-text-quaternary rounded-[10px] border border-dashed px-6 py-7 text-center text-[13.5px]">
      {children}
    </div>
  );
}

export function Kpi({ items }: { items: Array<[label: string, value: string, tone?: string | undefined]> }) {
  return (
    <div className="mb-[18px] grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
      {items.map(([label, value, tone]) => (
        <div key={label} className="bg-bg-secondary border-border-secondary rounded-[9px] border px-3.5 py-3">
          <span className="text-text-quaternary block text-[11px] uppercase tracking-[0.6px]">{label}</span>
          <b className={`font-mono text-[21px] font-medium ${tone ?? 'text-text-primary'}`}>{value}</b>
        </div>
      ))}
    </div>
  );
}
