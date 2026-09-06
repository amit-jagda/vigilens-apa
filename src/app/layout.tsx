import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Vigilens APA — Advanced People & Spatial Analytics',
  description:
    'Spatio-temporal camera topology, segmentation-based ReID, multi-day journey pathways, and AI Assistant for CCTV intelligence.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'oklch(0.18 0.02 250)',
              color: 'oklch(0.96 0.01 250)',
              border: '1px solid oklch(0.24 0.02 250)',
              fontSize: '13px',
              borderRadius: '10px',
            },
          }}
        />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
