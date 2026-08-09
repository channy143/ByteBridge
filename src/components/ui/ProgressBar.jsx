export default function ProgressBar({ value, className = '', barClassName = '' }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className={`h-1.5 w-full bg-slate-200 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full bg-primary-500 rounded-full transition-all duration-500 ${barClassName}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
