import localFont from 'next/font/local';
import './globals.css';

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
  icons: {
    icon: '/brand/trypan-wordmark.svg',
    shortcut: '/brand/trypan-wordmark.svg',
    apple: '/brand/trypan-wordmark.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={baloo.variable}>{children}</body>
    </html>
  );
}
