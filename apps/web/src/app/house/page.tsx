'use client';

import { CATEGORY_LABEL, CategoryIcon } from '@/components/category-icon';
import { ClayAvatar, ClayButton } from '@/components/primitives';
import { useGo } from '@/components/tour';
import { useHouse } from '@/lib/state';
import { type Category, HOUSE, type Member, money, nameOf } from '@unwritten/fixtures';

/* The Wilson tour's first stop: the house as a flowchart, so a visitor knows where it begins
   before they are shown what it learned. Nothing on this page is new data — the people come from
   HOUSE, the requests from the same decisions every other screen reads. */

const ROLE_LINE: Record<Member['role'], string> = {
  owner: 'Approves, and holds the owner key — the only key that can sign policy onchain or revoke the app.',
  approver: 'Approves. Can accept a proposed rule, cannot sign it.',
  spender: 'Asks. Approves nothing — three screens, no oversight.',
  dependent: 'Spends from an allowance wallet. The pattern is learned, not policed.',
};

const STATE_LINE: Record<Member['state'], string> = {
  active: 'active',
  subject: 'subject · has a wallet, no app',
  invited: 'invited · does not count toward a quorum yet',
  declared: 'declared · named at setup, never joined',
  revoked: 'revoked',
};

const AVATAR_COLOR: Record<Member['role'], 'primary' | 'secondary' | 'tertiary' | 'neutral'> = {
  owner: 'primary', approver: 'secondary', spender: 'neutral', dependent: 'tertiary',
};

const SHOWN: Category[] = ['groceries', 'fastfood', 'games', 'subscriptions', 'pets', 'household'];

export default function House() {
  const { decisionsUpTo } = useHouse();
  const go = useGo();
  const recent = [...decisionsUpTo].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const auto = money(HOUSE.policy.autoApproveCents);

  return (
    <>
      <span className="text-label-caps text-primary font-bold tracking-widest uppercase">Wilson family · six weeks</span>
      <h1 className="text-on-surface mt-1 mb-2 text-[34px] leading-tight font-extrabold tracking-tight">How the house works</h1>
      <p className="text-body-md text-on-surface-variant mb-8 max-w-2xl">
        Every rule this app shows came out of one loop, run a few times a day for six weeks. Start
        at the top left. Each box links to the screen where you can see that step happen.
      </p>

      {/* ── The people ─────────────────────────────────────────────── */}
      <h2 className="text-label-caps text-on-surface-variant mb-3 font-bold tracking-wider uppercase">The people</h2>
      <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {HOUSE.members.map((m) => (
          <div key={m.ref} className={`clay-card flex gap-3 rounded-xl p-4 ${m.state === 'active' || m.state === 'subject' ? '' : 'opacity-70'}`}>
            <ClayAvatar label={m.label.charAt(0) || '?'} color={AVATAR_COLOR[m.role]} />
            <div className="min-w-0">
              <p className="text-on-surface text-sm font-bold">
                {m.label} <span className="text-on-surface-variant font-medium">· {m.role}</span>
              </p>
              <p className="text-body-sm text-on-surface-variant">{ROLE_LINE[m.role]}</p>
              <p className="text-on-surface-variant mt-1 font-mono text-[11px]">
                {STATE_LINE[m.state]}
                {m.walletLimitCents ? ` · ${money(m.walletLimitCents)}/${m.period === 'weekly' ? 'week' : 'month'}` : ''}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── The flowchart ───────────────────────────────────────────── */}
      <h2 className="text-label-caps text-on-surface-variant mb-3 font-bold tracking-wider uppercase">The path every request takes</h2>
      <ol className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Node n={1} start lane="ask" icon="front_hand" title="Someone asks"
          body="Spenders and dependents ask. Routines — Friday pizza, a renewal — raise their own requests without anyone asking."
          link={{ label: 'Ask as Carol', onClick: () => go('/ask', 'm3') }}>
          <div className="flex items-center gap-1.5">
            <ClayAvatar label="C" color="neutral" size="sm" />
            <ClayAvatar label="M" color="tertiary" size="sm" />
            <span className="bg-surface-container text-on-surface-variant flex h-8 w-8 items-center justify-center rounded-full" title="routine">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">autorenew</span>
            </span>
          </div>
        </Node>
        <Node n={2} lane="ask" icon="category" title="Classified"
          body="Category and amount — never an item name. Memory is permanent, so what it may hold is decided up front.">
          <div className="flex flex-wrap items-center gap-1.5">
            {SHOWN.map((c) => <span key={c} title={CATEGORY_LABEL[c]}><CategoryIcon category={c} size={30} /></span>)}
          </div>
        </Node>
        <Node n={3} lane="ask" icon="rule" title="The gate"
          body={`Under ${auto} it goes through and nobody is asked — that is a silence event. Above it, an approver. The house's stated rule says big household buys need both.`}>
          <div className="flex flex-wrap gap-1.5">
            <span className="clay-badge clay-badge-neutral normal-case tracking-normal">auto · under {auto}</span>
            <span className="clay-badge clay-badge-brand normal-case tracking-normal">1 of 2</span>
            <span className="clay-badge clay-badge-warning normal-case tracking-normal">2 of 2</span>
          </div>
        </Node>
        <Node n={4} lane="ask" icon="how_to_reg" title="Decided"
          body="Who signed, in what order, how fast. The order is data: it is how the house learns who it defers to."
          link={{ label: 'What is waiting', onClick: () => go('/pending', 'm1') }}>
          <div className="flex items-center gap-1.5">
            <ClayAvatar label="A" color="primary" size="sm" />
            <span aria-hidden="true" className="material-symbols-outlined text-on-surface-variant text-[18px]">arrow_forward</span>
            <ClayAvatar label="S" color="secondary" size="sm" />
          </div>
        </Node>
        <Node n={5} lane="remember" icon="database" title="Written to Walrus"
          body="Only once it resolves. Append-only: a pending state written to memory could never be corrected."
          link={{ label: 'The full history', onClick: () => go('/history', 'm1') }} />
        <Node n={6} lane="remember" icon="psychology" title="Rules derived"
          body="Seven pure functions read the evidence. A rule is never edited — a new version supersedes it and names it."
          link={{ label: 'The Agreement', onClick: () => go('/agreement', 'm1') }} />
        <Node n={7} lane="check" icon="travel_explore" title="Checked against the chain"
          body="Tatum reads what actually left the wallet. A transfer with no approval in memory is something neither side knew alone."
          link={{ label: 'Reality check', onClick: () => go('/reality', 'm1') }} />
        <Node n={8} lane="agree" icon="draw" title="Proposed, then ratified"
          body="The weekly digest proposes a rule. An approver can accept; only the owner can sign. And the owner can revoke the app."
          link={{ label: 'Weekly digest', onClick: () => go('/digest', 'm2') }} />
      </ol>
      <div className="text-on-surface-variant mb-10 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <Legend lane="ask" label="asking & deciding" />
        <Legend lane="remember" label="remembering — Walrus" />
        <Legend lane="check" label="checking — Tatum" />
        <Legend lane="agree" label="agreeing" />
      </div>

      {/* ── The last few requests, through that path ────────────────── */}
      <h2 className="text-label-caps text-on-surface-variant mb-3 font-bold tracking-wider uppercase">
        The last {recent.length} requests, through that path
      </h2>
      <div className="clay-card mb-3 overflow-hidden rounded-xl">
        {recent.map((d, i) => (
          <div key={d.id} className={`flex items-center gap-3 px-4 py-3 ${i % 2 ? 'bg-surface-container-low/60' : ''}`}>
            <CategoryIcon category={d.category} size={34} />
            <div className="min-w-0 flex-1">
              <p className="text-on-surface text-sm font-semibold">
                {money(d.amountCents)} · {CATEGORY_LABEL[d.category].toLowerCase()}
              </p>
              <p className="text-on-surface-variant flex items-center gap-1 font-mono text-[11px]">
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                  {d.initiatedBy === 'routine' ? 'autorenew' : 'front_hand'}
                </span>
                {d.initiatedBy === 'routine' ? 'raised by a routine' : 'asked by a member'} · {d.date}
              </p>
            </div>
            <div className="hidden items-center -space-x-1.5 sm:flex">
              {d.decidedBy.map((x) => (
                <span key={x.ref} title={`${nameOf(x.ref)} · ${x.role}`}>
                  <ClayAvatar label={nameOf(x.ref).charAt(0) || '?'} color={x.role === 'owner' ? 'primary' : 'secondary'} size="sm" />
                </span>
              ))}
            </div>
            <span className={`clay-badge ${
              d.outcome === 'auto' ? 'clay-badge-neutral' : d.outcome === 'approved' ? 'clay-badge-success' : 'clay-badge-error'
            }`}>
              {d.outcome === 'auto' ? 'nobody asked' : d.outcome}
            </span>
          </div>
        ))}
      </div>
      <p className="text-on-surface-variant mb-8 font-mono text-[11px]">
        Memory records who decided and in what order. Who asked stays in the application database, with
        every other name — a name written to Walrus could never be removed.
      </p>

      <ClayButton variant="primary" size="lg" onClick={() => go('/agreement', 'm1')}>
        See what six weeks of this wrote down
        <span aria-hidden="true" className="material-symbols-outlined text-[20px]">arrow_forward</span>
      </ClayButton>
    </>
  );
}

type Lane = 'ask' | 'remember' | 'check' | 'agree';
const LANE: Record<Lane, { ring: string; chip: string; dot: string }> = {
  ask: { ring: 'clay-card-glow-primary', chip: 'bg-primary-fixed text-primary', dot: 'bg-primary' },
  remember: { ring: 'clay-card-glow-secondary', chip: 'bg-secondary-fixed text-secondary', dot: 'bg-secondary' },
  check: { ring: 'clay-card-glow-primary', chip: 'bg-surface-container-high text-on-primary-fixed-variant', dot: 'bg-on-primary-fixed-variant' },
  agree: { ring: 'clay-card-glow-tertiary', chip: 'bg-tertiary-fixed text-tertiary', dot: 'bg-tertiary' },
};

function Node({
  n, lane, icon, title, body, link, start, children,
}: {
  n: number; lane: Lane; icon: string; title: string; body: string; start?: boolean;
  link?: { label: string; onClick: () => void }; children?: React.ReactNode;
}) {
  const l = LANE[lane];
  return (
    <li className={`clay-card ${l.ring} relative flex flex-col rounded-xl p-5`}>
      {start && (
        <span className="bg-primary text-on-primary absolute -top-3 left-5 rounded-full px-3 py-0.5 text-[11px] font-bold tracking-wider uppercase shadow-[0_4px_10px_rgba(70,72,212,0.3)]">
          Start here
        </span>
      )}
      <div className="mb-3 flex items-center gap-2.5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${l.chip}`}>{n}</span>
        <span aria-hidden="true" className={`material-symbols-outlined text-[22px] ${l.chip.split(' ')[1]}`}>{icon}</span>
        <h3 className="text-on-surface text-base font-bold">{title}</h3>
      </div>
      <p className="text-body-sm text-on-surface-variant flex-1 leading-relaxed">{body}</p>
      {children && <div className="mt-3">{children}</div>}
      {link && (
        <button type="button" onClick={link.onClick}
          className="text-primary mt-3 inline-flex items-center gap-1 self-start text-sm font-semibold">
          {link.label}
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      )}
      {/* the arrow to the next box: down on one column, across on wider grids */}
      {n < 8 && (
        <span aria-hidden className="text-outline absolute -bottom-4 left-1/2 z-10 -translate-x-1/2 md:hidden">
          <span aria-hidden="true" className="material-symbols-outlined bg-background rounded-full text-[20px]">arrow_downward</span>
        </span>
      )}
    </li>
  );
}

function Legend({ lane, label }: { lane: Lane; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${LANE[lane].dot}`} />
      {label}
    </span>
  );
}
