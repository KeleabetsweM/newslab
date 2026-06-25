import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Newsroom Lab',
  description: 'Private AI newsroom sandbox for testing AI journalist workflows.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
