import localFont from 'next/font/local';
import './globals.css';
import PWARegister from '@/components/PWARegister';
import { SITE_URL } from '@/lib/site';

const baloo = localFont({
  variable: '--font-brand',
  display: 'swap',
  src: [
    { path: './fonts/BalooBhai2-Regular.ttf', weight: '400', style: 'normal' },
    { path: './fonts/BalooBhai2-Medium.ttf', weight: '500', style: 'normal' },
    { path: './fonts/BalooBhai2-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: './fonts/BalooBhai2-Bold.ttf', weight: '700', style: 'normal' },
    { path: './fonts/BalooBhai2-ExtraBold.ttf', weight: '800', style: 'normal' },
  ],
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'tryPan — pantry-first student meal planner',
    template: '%s · tryPan',
  },
  description: 'Plan an affordable student week from food you already have, then shop only for what is missing.',
  manifest: '/manifest.webmanifest',
  applicationName: 'tryPan',
  appleWebApp: {
    capable: true,
    title: 'tryPan',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'tryPan — pantry-first student meal planning',
    description: 'Plan an affordable week from food you already have, then shop only for what is missing.',
    url: '/',
    siteName: 'tryPan',
    images: [
      {
        url: '/og-trypan.png',
        width: 1200,
        height: 630,
        alt: 'tryPan: Stop deciding dinner from scratch.',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'tryPan — pantry-first student meal planning',
    description: 'Plan an affordable week from food you already have, then shop only for what is missing.',
    images: ['/og-trypan.png'],
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icons/icon-192.png',
    apple: '/icons/icon-180.png',
  },
};

export const viewport = {
  themeColor: '#31d66b',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={baloo.variable}><PWARegister />{children}</body>
    </html>
  );
}
