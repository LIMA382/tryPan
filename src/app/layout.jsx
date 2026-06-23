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
  title: 'tryPan',
  description: 'Plan your week from meals you already know.',
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
