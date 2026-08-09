import { Loader2 } from 'lucide-react';

export default function AuthButton({ loading = false, loadingText = '', children, variant = 'primary', disabled, ...props }) {
  const styles =
    variant === 'secondary'
      ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
      : 'bg-primary-900 hover:bg-primary-800 text-white shadow-sm';

  return (
    <button
      className={`w-full h-[50px] rounded-lg text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${styles}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {loading ? loadingText : children}
    </button>
  );
}
