export default function StatCard({ label, value, icon: Icon, accent = 'bg-primary-50 text-primary-700', sub }) {
  return (
    <div className="ws-card px-4 py-3">
      <span className={`w-8 h-8 rounded-md flex items-center justify-center ${accent}`}>
        <Icon className="w-4 h-4" />
      </span>
      <p className="mt-2 text-[20px] font-bold text-slate-900 leading-tight">{value ?? 0}</p>
      <p className="text-[10.5px] uppercase tracking-wide text-slate-400 font-medium">{label}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}