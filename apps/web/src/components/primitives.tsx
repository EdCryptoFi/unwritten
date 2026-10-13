'use client';

import type { BeliefState } from '@unwritten/fixtures';

type Tone = 'plain' | 'note' | 'alert';

export function Card({
  children,
  tone = 'plain',
  onClick,
  className = '',
}: { children: React.ReactNode; tone?: Tone; onClick?: () => void; className?: string }) {
  const tones: Record<Tone, string> = {
    plain: 'bg-surface-container-lowest',
    note: 'bg-primary-fixed/50',
    alert: 'bg-error-container/50',
  };
  /* `mb-3` and `w-full text-left` were lost in the clay port: every stacked card on every page
     sat flush against the next, and a clickable card shrank to its content and centred its text.
     The hover lift is for cards you can press — a static card that rises under the cursor
     promises an action that is not there. */
  const cls = `clay-card mb-3 block w-full rounded-xl p-5 text-left ${tones[tone]} ${
    onClick ? 'clay-card-hover cursor-pointer' : ''
  } ${className}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={cls}>{children}</button>
  ) : (
    <div className={cls}>{children}</div>
  );
}

export type BadgeTone = 'brand' | 'success' | 'warning' | 'error' | 'neutral';

const BADGE_CLASS: Record<BadgeTone, string> = {
  brand: 'clay-badge clay-badge-brand',
  success: 'clay-badge clay-badge-success',
  warning: 'clay-badge clay-badge-warning',
  error: 'clay-badge clay-badge-error',
  neutral: 'clay-badge clay-badge-neutral',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return <span className={BADGE_CLASS[tone]}>{children}</span>;
}

const STATE_TONE: Record<BeliefState, BadgeTone> = {
  observed: 'brand',
  ratified: 'success',
  drifting: 'warning',
};

export const StateBadge = ({ state }: { state: BeliefState }) => (
  <Badge tone={STATE_TONE[state]}>{state}</Badge>
);

export const Meta = ({ children }: { children: React.ReactNode }) => (
  <div className="text-on-surface-variant font-mono text-xs leading-relaxed">{children}</div>
);

export const Rule = ({ children }: { children: React.ReactNode }) => (
  <p className="text-on-surface font-semibold text-base mb-2">{children}</p>
);

export const Progress = ({ value }: { value: number }) => (
  <div className="clay-gauge h-2 mt-3" role="progressbar" tabIndex={0} aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
    <div className="clay-gauge-fill h-full" style={{ width: `${value * 100}%` }} />
  </div>
);

export function Page({ title, lede, children }: { title: string; lede: string; children: React.ReactNode }) {
  return (
    <>
      <h1 className="text-headline-md text-on-surface font-bold tracking-tight mb-1">{title}</h1>
      <p className="text-body-md text-on-surface-variant mb-6">{lede}</p>
      {children}
    </>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="clay-well rounded-xl p-6 text-center text-body-md text-on-surface-variant border border-outline-variant/50">
      {children}
    </div>
  );
}

export function Kpi({ items }: { items: Array<[label: string, value: string, tone?: string | undefined]> }) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([label, value, tone]) => (
        <div key={label} className="clay-card p-4">
          <span className="text-label-caps text-on-surface-variant block mb-1">{label}</span>
          <b className={`text-stat-numeric-md text-on-surface font-bold tabular-nums ${tone ?? ''}`}>{value}</b>
        </div>
      ))}
    </div>
  );
}

/* Clay Pill Button — reusable primitive */
export function ClayButton({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled,
  className = '',
  type = 'button',
  ...props
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  [key: string]: unknown;
}) {
  const variantClass = {
    primary: 'clay-pill clay-pill-primary',
    secondary: 'clay-pill clay-pill-secondary',
    tertiary: 'clay-pill clay-pill-tertiary',
  }[variant];

  const sizeClass = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-7 py-3.5 text-lg',
  }[size];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${variantClass} ${sizeClass} font-semibold inline-flex items-center justify-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/* Clay Avatar — member badge */
export function ClayAvatar({
  label,
  color = 'primary',
  size = 'md',
}: { label: string; color?: 'primary' | 'secondary' | 'tertiary' | 'neutral'; size?: 'sm' | 'md' | 'lg' }) {
  const colorClass = {
    primary: 'bg-primary-fixed text-on-primary-fixed-variant',
    secondary: 'bg-secondary-fixed text-on-secondary-fixed-variant',
    tertiary: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
    neutral: 'bg-surface-container-high text-on-surface-variant',
  }[color];

  const sizeClass = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  }[size];

  return (
    <span className={`clay-avatar ${colorClass} ${sizeClass} font-bold`}>
      {label}
    </span>
  );
}