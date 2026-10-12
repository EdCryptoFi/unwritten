'use client';

import { useEffect, useState } from 'react';

export interface Reconciled {
  digest: string;
  date: string;
  mist: number;
  to: string | null;
  category: string;
  approvalId: string | null;
}

export interface ChainState {
  wallet: string;
  transfers: number;
  decisions: number;
  reconciled: Reconciled[];
  readAt?: string;
  error?: string;
}

/** Any Sui explorer resolves these; a digest nobody can open is a digest taken on faith. */
export const txUrl = (digest: string) => `https://suivision.xyz/txblock/${digest}`;
export const addrUrl = (a: string) => `https://suivision.xyz/account/${a}`;
export const sui = (mist: number) => `${(mist / 1e9).toFixed(4)} SUI`;

export function useChain() {
  const [state, setState] = useState<ChainState | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/chain')
      .then((r) => r.json())
      .then(setState)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);
  return { chain: state, loading };
}
