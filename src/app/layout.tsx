// Root layout - includes global CSS
// Locale-specific content is in [locale]/layout.tsx

import './globals.css';

export const metadata = {
  title: 'TipstersKing',
  description: 'Expert Football Tips Marketplace',
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
