import type { Metadata } from 'next';
import { Shell } from '@/components/shell';
import { StateProvider } from '@/lib/state';
import './globals.css';

export const metadata: Metadata = {
  title: 'Unwritten',
  description: 'The spending agreement your house already has.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <StateProvider>
          <Shell>{children}</Shell>
        </StateProvider>
      </body>
    </html>
  );
}
