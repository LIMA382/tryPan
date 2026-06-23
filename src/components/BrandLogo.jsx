import Link from 'next/link';

export default function BrandLogo({ href = '/', className = '', compact = false }) {
  return (
    <Link href={href} className={`brand-logo-link ${compact ? 'compact' : ''} ${className}`.trim()} aria-label="tryPan home">
      <img src="/brand/trypan-wordmark.svg" alt="tryPan" className="brand-logo-wordmark" />
    </Link>
  );
}
