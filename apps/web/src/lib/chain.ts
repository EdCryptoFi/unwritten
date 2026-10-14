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
  /** Absent when the balance read failed — the page shows the rest rather than nothing. */
  balanceMist?: string;
  transfers: number;
  decisions: number;
  reconciled: Reconciled[];
  readAt?: string;
  error?: string;
}

/** A digest nobody can open is a digest taken on faith. Suiscan rather than SuiVision: SuiVision's
    account pages sit behind a Cloudflare challenge that a link checker — and some reviewers'
    browsers — stop at, while Suiscan serves both pages directly. */
export const txUrl = (digest: string) => `https://suiscan.xyz/mainnet/tx/${digest}`;
export const addrUrl = (a: string) => `https://suiscan.xyz/mainnet/account/${a}`;
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
