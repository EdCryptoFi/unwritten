import { redirect } from 'next/navigation';

/* Setup belongs to a house being created, not to one six weeks old. This page sat in the Wilson
   house's menu, showed the Wilsons' roster and number back as "steps", and offered a
   "Receive 412 USDC (testnet)" button that was false three ways: the house holds SUI, everything
   runs on Mainnet, and the button moved no money. The visitor's own setup is /try — people, the
   house's pot, what it buys, one number — so old links land there. */
export default function Onboarding() {
  redirect('/try');
}
