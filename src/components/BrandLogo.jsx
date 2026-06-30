import Image from 'next/image';
import Link from 'next/link';

export default function BrandLogo({ href = '/', className = '', compact = false }) {
  return (
    <Link href={href} className={`brand-logo-link ${compact ? 'compact' : ''} ${className}`.trim()} aria-label="tryPan home">
      <Image src="/brand/trypan-wordmark.svg" alt="tryPan" width={175} height={137} className="brand-logo-wordmark" priority />
    </Link>
  );
}
