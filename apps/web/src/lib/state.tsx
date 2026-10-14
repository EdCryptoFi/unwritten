'use client';

import {
  BELIEFS, type Belief, DECISIONS, type DecisionEvent, HOUSE, type Member, type Ref, SPEND,
  type SpendEvent, TOPUPS, type TopUpEvent, upTo, wilsonProbes,
} from '@unwritten/fixtures';
import { replay } from '@unwritten/policy';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Viewer = Ref | 'judge';

/** A guided path through the product. `null` is free browsing. */
export type Tour = 'wilson' | 'judge' | null;

/** Each role gets a different app. A spender has three screens and no oversight surfaces. */
export const NAV: Record<string, Array<[label: string, href: string]>> = {
  owner: [
    ['How the house works', '/house'], ['The Agreement', '/agreement'], ['Notifications', '/notifications'], ['Pending', '/pending'],
    ['Weekly digest', '/digest'], ['Reality check', '/reality'], ['Rhythm', '/rhythm'],
    ['Allowance', '/allowance'], ['History', '/history'], ['Keys', '/keys'],
    ['Try it yourself', '/try'],
  ],
  approver: [
    ['How the house works', '/house'], ['The Agreement', '/agreement'], ['Notifications', '/notifications'], ['Pending', '/pending'],
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
  /** The MemWal account object on Sui — public, unlike the delegate key that writes to it. */
  account?: string | undefined;
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
  tour: Tour;
  setTour: (t: Tour) => void;
}

const C = createContext<Ctx | null>(null);

export function StateProvider({ children }: { children: React.ReactNode }) {
  const [week, setWeek] = useState(6);
  const [viewer, setViewer] = useState<Viewer>('m1');
  const [house, setHouse] = useState<HouseData>(FALLBACK);
  const [loading, setLoading] = useState(true);
  /* Survives a refresh mid-tour, never another tab or device. Storage can be absent (private
     windows, blocked site data), so every access is guarded and the tour degrades to "off". */
  const [tour, setTourState] = useState<Tour>(null);
  useEffect(() => {
    try {
      const t = sessionStorage.getItem('unwritten.tour');
      if (t === 'wilson' || t === 'judge') setTourState(t);
    } catch { /* no storage — tour starts off */ }
  }, []);
  const setTour = useCallback((t: Tour) => {
    setTourState(t);
    try {
      if (t) sessionStorage.setItem('unwritten.tour', t);
      else sessionStorage.removeItem('unwritten.tour');
    } catch { /* no storage — in-memory only */ }
  }, []);

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
    return {
      week, setWeek, viewer, setViewer, role, me, nav: NAV[role] ?? NAV.owner!, house, loading,
      tour, setTour,
    };
  }, [week, viewer, house, loading, tour, setTour]);

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
  /* The rules at the selected week, derived — not read.
     Mainnet holds ONE derivation (week 6, written by the seeder), because the scheduled weekly
     pass that would have written one per week is not built. Reading Mainnet's beliefs filtered by
     week therefore showed nothing for weeks 1–5 and everything at once in week 6, and no version
     was ever superseded: the central claim of the product, invisible on the live site.
     So the same function runs here, once per week, over the seeded decisions that ARE on
     Mainnet. Week 6 equals Mainnet's seven rules, which /proof checks sentence for sentence.
     Only the seeded story feeds it: decisions the daily job has written since (ids `s-…`) arrive
     after the six weeks and would otherwise rewrite them. */
  const story = useMemo(() => {
    const seeded = house.decisions.filter((d) => /^d\d+$/.test(d.id));
    return replay(
      (w) => ({
        decisions: upTo(seeded, w),
        spend: upTo(house.spend, w),
        topups: upTo(house.topups, w),
        knobs: HOUSE.learning,
        policy: HOUSE.policy,
      }),
      wilsonProbes,
      6,
    );
  }, [house.decisions, house.spend, house.topups]);

  return {
    ...house,
    decisionsUpTo: upto(house.decisions),
    spendUpTo: upto(house.spend),
    topupsUpTo: upto(house.topups),
    /** The rules standing at the selected week, with their version chains. */
    beliefsUpTo: story.live[Math.min(Math.max(week, 1), 6) - 1] ?? [],
    /** Every version that ever stood, so a chain can be walked backwards. */
    beliefHistory: story.versions,
    /** The beliefs Mainnet actually holds, with real blob ids — what /proof shows. */
    mainnetBeliefs: house.beliefs,
  };
}
