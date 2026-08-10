import { User } from 'lucide-react';

export default function Avatar({ name, src, size = 32, className = '' }) {
  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'avatar'}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={`rounded-full bg-primary-100 text-primary-700 font-semibold inline-flex items-center justify-center flex-shrink-0 ${className}`}
    >
      {name ? initials : <User style={{ width: size * 0.55, height: size * 0.55 }} />}
    </span>
  );
}
