'use client';

import {
  BELIEFS, DECISIONS, HOUSE, type Belief, type DecisionEvent, type Member, type Ref,
  type SpendEvent, SPEND, type TopUpEvent, TOPUPS,
} from '@unwritten/fixtures';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Viewer = Ref | 'judge';

/** Each role gets a different app. A spender has three screens and no oversight surfaces. */
export const NAV: Record<string, Array<[label: string, href: string]>> = {
  owner: [
    ['The Agreement', '/agreement'], ['Notifications', '/notifications'], ['Pending', '/pending'],
    ['Weekly digest', '/digest'], ['Reality check', '/reality'], ['Rhythm', '/rhythm'],
    ['Allowance', '/allowance'], ['History', '/history'], ['Keys', '/keys'],
    ['Try it yourself', '/try'], ['Setup', '/onboarding'],
  ],
  approver: [
    ['The Agreement', '/agreement'], ['Notifications', '/notifications'], ['Pending', '/pending'],
    ['Weekly digest', '/digest'], ['Reality check', '/reality'], ['Rhythm', '/rhythm'],
    ['Allowance', '/allowance'], ['History', '/history'], ['Try it yourself', '/try'],
  ],
  spender: [
    ['Ask', '/ask'], ['My requests', '/requests'], ['The Agreement', '/agreement'],
    ['Notifications', '/notifications'], ['Try it yourself', '/try'],
  ],
  // Never linked from the product. Referenced from the README and the write-up only.
  judge: [
    ['Start here', '/judge'], ['Proof', '/proof'], ['Observer digest', '/observer'],
    ['Discovered schema', '/schema'],
  ],
};

/** Anything recalled carries the real Walrus blob id and the relayer's write time. */
export type OnChain<T> = T & { blobId?: string | undefined; writtenAt?: string | undefined };

export interface HouseData {
  source: 'mainnet' | 'fixtures';
  seed?: string | undefined;
  /** Real counts from listNamespaces — what `pnpm verify` prints, shown on /proof. */
  counts?: Record<string, number> | undefined;
  decisions: Array<OnChain<DecisionEvent>>;
  spend: Array<OnChain<SpendEvent>>;
  topups: Array<OnChain<TopUpEvent>>;
  beliefs: Array<OnChain<Belief>>;
}

/* The fixtures are the fallback, not the source. If the relayer is unreachable the product still
   renders — and says so, because a screen that silently shows local data while claiming to read
   Mainnet is the kind of lie this whole project is built to avoid. */
const FALLBACK: HouseData = {
  source: 'fixtures', decisions: DECISIONS, spend: SPEND, topups: TOPUPS, beliefs: BELIEFS,
};

interface Ctx {
  week: number;
  setWeek: (w: number) => void;
  viewer: Viewer;
  setViewer: (v: Viewer) => void;
  role: string;
  me: Member | undefined;
  nav: Array<[string, string]>;
  house: HouseData;
  loading: boolean;
}

const C = createContext<Ctx | null>(null);

export function StateProvider({ children }: { children: React.ReactNode }) {
  const [week, setWeek] = useState(6);
  const [viewer, setViewer] = useState<Viewer>('m1');
  const [house, setHouse] = useState<HouseData>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/house')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: HouseData) => { if (d.decisions?.length) setHouse(d); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<Ctx>(() => {
    const me = viewer === 'judge' ? undefined : HOUSE.members.find((m) => m.ref === viewer);
    const role = viewer === 'judge' ? 'judge' : (me?.role ?? 'owner');
    return { week, setWeek, viewer, setViewer, role, me, nav: NAV[role] ?? NAV.owner!, house, loading };
  }, [week, viewer, house, loading]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useApp() {
  const v = useContext(C);
  if (!v) throw new Error('useApp must be used inside StateProvider');
  return v;
}

/** Everything the screens read goes through here, so the source is swapped in one place. */
export function useHouse() {
  const { house, week } = useApp();
  const upto = <T extends { week?: number; fromWeek?: number }>(xs: T[]) =>
    xs.filter((x) => (x.week ?? x.fromWeek ?? 0) <= week);
  const live = house.beliefs.filter(
    (b) => !new Set(house.beliefs.map((x) => x.supersedes).filter(Boolean)).has(b.id),
  );
  return {
    ...house,
    decisionsUpTo: upto(house.decisions),
    spendUpTo: upto(house.spend),
    topupsUpTo: upto(house.topups),
    beliefsUpTo: upto(live),
  };
}
