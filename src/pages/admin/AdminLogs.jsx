import { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { ClipboardList, Search, RefreshCw } from 'lucide-react';
import { supabase } from '../../services/supabase';

const ACTION_TONES = {
  INSERT: 'green',
  UPDATE: 'amber',
  DELETE: 'red',
};

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tableFilter, setTableFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');
  const [limit, setLimit] = useState(50);

  const tables = [...new Set(logs.map((l) => l.table_name))].sort();

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, actor_id, actor_role, action, table_name, record_id, details, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = logs.filter((l) => {
    const q = search.trim().toLowerCase();
    if (q && !`${l.table_name} ${l.action} ${l.record_id || ''}`.toLowerCase().includes(q)) return false;
    if (tableFilter !== 'All' && l.table_name !== tableFilter) return false;
    if (actionFilter !== 'All' && l.action !== actionFilter) return false;
    return true;
  });

  const show = filtered.slice(0, limit);

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        subtitle="Append-only record of every insert, update, and delete across the portal."
        actions={
          <button onClick={load} className="ws-btn-secondary">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search table, action, or record…" className="ws-input w-full pl-9" />
        </div>
        <select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)} className="ws-input">
          <option value="All">All tables</option>
          {tables.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="ws-input">
          <option value="All">All actions</option>
          <option value="INSERT">INSERT</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      <div className="ws-card">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-lg" />)}
          </div>
        ) : show.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="w-8 h-8" />}
            title="No audit entries"
            description="Changes made by users will be recorded here as they happen."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Table</th>
                  <th>Record</th>
                  <th>Role</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {show.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap text-slate-500">{timeAgo(l.created_at)}</td>
                    <td>
                      <StatusBadge label={l.action} tone={ACTION_TONES[l.action] || 'gray'} />
                    </td>
                    <td className="text-slate-800 font-medium whitespace-nowrap">{l.table_name.replaceAll('_', ' ')}</td>
                    <td className="text-slate-500 text-[11.5px] whitespace-nowrap">{l.record_id ? l.record_id.slice(0, 8) : '—'}</td>
                    <td className="text-slate-500 capitalize">{l.actor_role || '—'}</td>
                    <td className="text-slate-500 text-[11.5px] max-w-[280px] truncate">{summarize(l.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > limit && (
          <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[11.5px] text-slate-400">Showing {limit} of {filtered.length} entries.</p>
            <button onClick={() => setLimit((n) => n + 50)} className="ws-btn-secondary">Load more</button>
          </div>
        )}
      </div>
    </div>
  );
}

function summarize(details) {
  if (!details) return '—';
  const parts = [];
  if (details.old && typeof details.old === 'object') {
    const keys = Object.keys(details.old).slice(0, 3);
    parts.push(`before: ${keys.map((k) => k).join(', ')}`);
  }
  if (details.new && typeof details.new === 'object') {
    const keys = Object.keys(details.new).slice(0, 3);
    parts.push(`after: ${keys.map((k) => k).join(', ')}`);
  }
  return parts.length ? parts.join(' · ') : JSON.stringify(details).slice(0, 60);
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}