export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      {icon && <div className="text-slate-300 mb-2">{icon}</div>}
      <h3 className="text-[13.5px] font-semibold text-slate-800">{title}</h3>
      {description && <p className="mt-0.5 text-[12.5px] text-slate-500 max-w-xs">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
