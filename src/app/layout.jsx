import './globals.css';

export const metadata = {
  title: 'tryPan',
  description: 'Plan your week from meals you already know.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
