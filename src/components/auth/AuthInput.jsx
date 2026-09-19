import { useId } from 'react';

export default function AuthInput({ label, error, className = '', ...props }) {
  const id = useId();

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[12px] font-medium text-slate-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        className={`w-full h-[38px] px-3 rounded-lg border bg-white text-[13px] text-slate-900 placeholder:text-slate-400 shadow-sm transition-colors outline-none focus:ring-2 ${
          error
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-slate-200 hover:border-slate-300 focus:border-primary-500 focus:ring-primary-100'
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
