'use client';

import { Card, Meta, Page } from '@/components/primitives';
import { NAV, useApp } from '@/lib/state';
import Link from 'next/link';

/**
 * Role enforcement, not role decoration.
 *
 * The navigation hid these screens, which is not the same as protecting them: a spender who typed
 * /reality saw the household's oversight surface. "Each role gets a different app" has to be true
 * of the routes, not only of the sidebar.
 *
 * This is a product boundary, not a security one — the data still arrives over the same API. The
 * real control for anything that matters lives on the server.
 */
export function Gate({ allow, children }: { allow: string[]; children: React.ReactNode }) {
  const { role, nav, me } = useApp();
  if (allow.includes(role)) return <>{children}</>;

  const home = nav[0]?.[1] ?? '/';
  return (
    <Page title="Not your screen" lede={LEDE[role] ?? 'This screen belongs to another role.'}>
      <Card>
        <Meta>
          You are viewing as {me ? `${me.label}, ${me.role}` : 'a reviewer'}. Switch roles at the
          top left, or go back to{' '}
          <Link href={home} className="text-text-brand-primary">
            {nav[0]?.[0] ?? 'the start'}
          </Link>
          .
        </Meta>
      </Card>
      <Card tone="note">
        <Meta>
          A spender has three screens on purpose. They do not vote on policy, they do not audit the
          household&apos;s spending, and they do not manage keys — so those screens are not theirs
          to open, whether or not the menu shows them.
        </Meta>
      </Card>
    </Page>
  );
}

const LEDE: Record<string, string> = {
  spender: 'A spender has three screens. This one belongs to an approver.',
  approver: 'This screen is the account owner’s.',
  judge: 'This is a product screen. Your path is on the proof pages.',
};

export const ROLES = {
  householdAdults: ['owner', 'approver'],
  ownerOnly: ['owner'],
  spenderOnly: ['spender'],
  everyone: ['owner', 'approver', 'spender', 'judge'],
} as const;
