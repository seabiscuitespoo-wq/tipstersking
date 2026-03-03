// Root layout - includes global CSS
// Locale-specific content is in [locale]/layout.tsx

import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'TipstersKing - Expert Football Tips Marketplace',
    template: '%s | TipstersKing',
  },
  description: 'Access real-time football tips from verified tipsters. Track ROI, subscribe for €9.99/month, and get instant alerts on Telegram.',
  keywords: ['football tips', 'betting tips', 'sports predictions', 'tipster', 'ROI', 'telegram tips'],
  authors: [{ name: 'TipstersKing' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://tipstersking.com',
    siteName: 'TipstersKing',
    title: 'TipstersKing - Expert Football Tips Marketplace',
    description: 'Access real-time football tips from verified tipsters. Track ROI, subscribe for €9.99/month.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TipstersKing',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TipstersKing - Expert Football Tips',
    description: 'Real-time football tips from verified tipsters.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.svg',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
