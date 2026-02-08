import type { Metadata } from 'next';
import './globals.css';
import { ClientTelemetry } from '@/components/telemetry/client-telemetry';

export const metadata: Metadata = {
  title: 'DESAYRE | AI Generation Platform',
  description: 'Internal AI media generation studio',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClientTelemetry />
        {children}
      </body>
    </html>
  );
}
