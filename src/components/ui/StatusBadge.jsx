import { STATUS_TONES } from '../../lib/status';

export default function StatusBadge({ label, tone = 'gray', dot = false, className = '' }) {
  const toneClass = STATUS_TONES[tone] || STATUS_TONES.gray;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11.5px] font-medium whitespace-nowrap ${toneClass} ${className}`}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}
