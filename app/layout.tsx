import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Sekhon Marathon 2026 | Air Force Station Suratgarh',
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/sekhon-logo.png` },
  description: 'The Wings of Courage. Join the Sekhon Indian Air Force Marathon at Air Force Station Suratgarh on 4 October 2026. 5 KM, 10 KM and 21 KM for airwarriors and families.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
