import Link from 'next/link';

export default function BrandLogo({ href = '/', className = '', withMark = true, compact = false }) {
  return (
    <Link href={href} className={`brand-logo-link ${compact ? 'compact' : ''} ${className}`.trim()} aria-label="tryPan home">
      {withMark ? <img src="/brand/trypan-mark.svg" alt="" className="brand-logo-mark" /> : null}
      <img src="/brand/trypan-wordmark.svg" alt="tryPan" className="brand-logo-wordmark" />
    </Link>
  );
}
