import type { Tour, Viewer } from '@/lib/state';

/**
 * The two guided paths, in one place.
 *
 * Each stop names the role it NEEDS. The judge door used to set `viewer = 'judge'` and then send
 * the reviewer to /reality, which is gated to household adults — stop two of the judge's own
 * path answered "Not your screen". A tour that switches role per stop is the fix: the reviewer
 * sees each screen as the person it was built for, and is told who that is.
 */
export interface Stop {
  href: string;
  title: string;
  /** Who you are while looking at this screen. */
  as: Viewer;
  /** One line on what to look for. */
  look: string;
  /** Optional second role on the same screen — the digest is accepted by one and signed by another. */
  also?: { as: Viewer; label: string };
}

export const TOURS: Record<Exclude<Tour, null>, { name: string; stops: Stop[]; end: { href: string; label: string } }> = {
  wilson: {
    name: 'The Wilson house',
    stops: [
      { href: '/house', title: 'How the house works', as: 'm1',
        look: 'The people, the categories, and the path every request takes.' },
      { href: '/agreement', title: 'The Agreement', as: 'm1',
        look: 'Rules nobody wrote. Drag the week control and watch them form.' },
      { href: '/reality', title: 'Reality check', as: 'm1',
        look: 'What the chain says left the wallet, matched against what was agreed.' },
      { href: '/digest', title: 'Weekly digest', as: 'm2',
        look: 'Accept a proposal as Sam — it waits for the owner.',
        also: { as: 'm1', label: 'Now sign it as Alex' } },
      { href: '/keys', title: 'Keys', as: 'm1',
        look: 'Revoke the app’s key — a disclosed rehearsal — and watch the next write fail.' },
    ],
    end: { href: '/try', label: 'Now make one about yourself' },
  },
  judge: {
    name: 'Reviewer path',
    stops: [
      { href: '/judge', title: 'Orientation', as: 'judge',
        look: 'The map: what each stop proves, and how Tatum and Walrus meet.' },
      { href: '/agreement', title: 'The Agreement', as: 'm1',
        look: 'Rules derived, not written. They form from week 3; one that moves is superseded, never edited.' },
      { href: '/reality', title: 'Reality check', as: 'm1',
        look: 'Tatum reads the wallet; Walrus holds the approvals. Rows with no match exist in neither.' },
      { href: '/digest', title: 'Weekly digest', as: 'm2',
        look: 'Accept as Sam — only the owner key can sign.',
        also: { as: 'm1', label: 'Now sign it as Alex' } },
      { href: '/keys', title: 'Keys', as: 'm1',
        look: 'Revoke the delegate, then press remember(). A disclosed rehearsal of the protocol.' },
      { href: '/try', title: 'Try it yourself', as: 'm1',
        look: 'Your own decisions, written to Walrus Mainnet, and a rule derived from them.' },
      { href: '/proof', title: 'Proof', as: 'judge',
        look: 'The checklist line by line, blob ids, Tatum calls, and a derivation re-run in your browser.' },
    ],
    end: { href: '/', label: 'Back to the start' },
  },
};

export const VIEWER_LABEL: Record<string, string> = {
  m1: 'Alex · owner', m2: 'Sam · approver', m3: 'Carol · spender', judge: 'a reviewer',
};
