'use client';

import { HOUSE, type Member, type Ref } from '@unwritten/fixtures';
import { createContext, useContext, useMemo, useState } from 'react';

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

interface Ctx {
  week: number;
  setWeek: (w: number) => void;
  viewer: Viewer;
  setViewer: (v: Viewer) => void;
  role: string;
  me: Member | undefined;
  nav: Array<[string, string]>;
}

const C = createContext<Ctx | null>(null);

export function StateProvider({ children }: { children: React.ReactNode }) {
  const [week, setWeek] = useState(6);
  const [viewer, setViewer] = useState<Viewer>('m1');

  const value = useMemo<Ctx>(() => {
    const me = viewer === 'judge' ? undefined : HOUSE.members.find((m) => m.ref === viewer);
    const role = viewer === 'judge' ? 'judge' : (me?.role ?? 'owner');
    return { week, setWeek, viewer, setViewer, role, me, nav: NAV[role] ?? NAV.owner! };
  }, [week, viewer]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useApp() {
  const v = useContext(C);
  if (!v) throw new Error('useApp must be used inside StateProvider');
  return v;
}
