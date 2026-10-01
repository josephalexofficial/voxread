import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Atkinson_Hyperlegible, Fraunces, Outfit } from 'next/font/google';
import Script from 'next/script';

import './globals.css';

const reading = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-reading',
});

const ui = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-ui',
});

const accessible = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-accessible',
});

export const metadata: Metadata = {
  title: 'VoxRead',
  description: 'An accessible audio reader that highlights each sentence as it is spoken.',
};

export const viewport: Viewport = {
  themeColor: '#f3eee4',
  width: 'device-width',
  initialScale: 1,
};

const appearanceBootScript = `
try {
  var root = document.documentElement;
  var raw = localStorage.getItem('voxread-appearance');
  var saved = raw ? JSON.parse(raw) : null;
  var current = saved && saved.displayVersion >= 2;
  root.dataset.contrast = !current || saved.isHighContrast !== false ? 'high' : 'normal';
  root.dataset.font = !current || saved.isDyslexiaFont !== false ? 'accessible' : 'editorial';
  root.dataset.scale = current && (saved.textScale === 'sm' || saved.textScale === 'md' || saved.textScale === 'lg' || saved.textScale === 'xl') ? saved.textScale : 'sm';
  root.dataset.leading = current && (saved.lineHeight === 'compact' || saved.lineHeight === 'comfortable' || saved.lineHeight === 'relaxed') ? saved.lineHeight : 'relaxed';
  if (saved && (saved.theme === 'light' || saved.theme === 'dark')) root.dataset.theme = saved.theme;
} catch (error) {
  document.documentElement.dataset.appearance = 'default';
}
`;

/**
 * Root document. Appearance is applied before paint from the local mirror so a saved theme does not flash.
 *
 * @param props.children - The active route.
 * @returns The HTML document.
 */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      data-scale="sm"
      data-leading="relaxed"
      data-font="accessible"
      data-contrast="high"
      suppressHydrationWarning
    >
      <body className={`${reading.variable} ${ui.variable} ${accessible.variable}`}>
        <Script id="voxread-appearance" strategy="beforeInteractive">
          {appearanceBootScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
