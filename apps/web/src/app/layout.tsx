import { Shell } from '@/components/shell';
import { StateProvider } from '@/lib/state';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Unwritten',
  description: 'The spending agreement your house already has.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        {/* `material-symbols-outlined` was referenced in shell.tsx without this font ever being
            loaded — the judge-mode icon was silently rendering the literal word "gavel". */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
      </head>
      <body>
        <StateProvider>
          <Shell>{children}</Shell>
        </StateProvider>
      </body>
    </html>
  );
}
