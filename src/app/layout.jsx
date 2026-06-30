import localFont from 'next/font/local';
import './globals.css';
import PWARegister from '@/components/PWARegister';

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://trypan.app'),
  title: {
    default: 'tryPan',
    template: '%s · tryPan',
  },
  description: 'Stop deciding dinner from scratch. Plan from meals you already know, use what you have, and shop only what is missing.',
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
    title: 'tryPan — stop deciding dinner from scratch',
    description: 'Plan from meals you already know, compare with your pantry, and shop only what is missing.',
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
    title: 'tryPan — stop deciding dinner from scratch',
    description: 'Plan from meals you already know, use what you have, and shop only what is missing.',
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
  themeColor: '#963F2E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={baloo.variable}><PWARegister />{children}</body>
    </html>
  );
}
