import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Unwritten',
  description: 'The spending agreement your house already has.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
