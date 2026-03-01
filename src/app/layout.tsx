// Root layout - minimal, just html wrapper
// Locale-specific content is in [locale]/layout.tsx

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
