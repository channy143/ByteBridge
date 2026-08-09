// Shared status/date helpers for the workspace UI.

export const STATUS_TONES = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  gray: 'bg-slate-100 text-slate-600 border-slate-200',
};

// Derive the student-facing status of an activity.
// sub = the student's submission row (or null), now = Date.now()
export function getActivityStatus(activity, sub, now) {
  if (sub) {
    if (sub.status === 'Graded' && sub.grade != null) return { label: 'Graded', tone: 'green' };
    if (sub.status === 'Late') return { label: 'Late', tone: 'amber' };
    return { label: 'Submitted', tone: 'green' };
  }
  const deadline = activity.deadline && new Date(activity.deadline).getTime();
  if (deadline && deadline < now) return { label: 'Overdue', tone: 'red' };
  return { label: 'To do', tone: 'gray' };
}

export function isDueSoon(activity, now, withinMs = 3 * 86400000) {
  const deadline = activity.deadline && new Date(activity.deadline).getTime();
  return !!deadline && deadline >= now && deadline - now <= withinMs;
}

export function formatDue(dateStr, now = Date.now()) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const diff = d.getTime() - now;
  const days = Math.ceil(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1 && days <= 7) return `In ${days} days`;
  if (days < -1 && days >= -7) return `${-days} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatTimeLeft(deadline, now = Date.now()) {
  const ms = new Date(deadline).getTime() - now;
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(name) {
  return (name || '').trim().split(/\s+/)[0] || 'there';
}
