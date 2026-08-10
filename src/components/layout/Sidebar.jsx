import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Video,
  User,
  Layout,
  ShieldCheck,
} from 'lucide-react';
import Avatar from '../ui/Avatar';

const STUDENT_LINKS = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/roster', label: 'Roster & Dockets', icon: LayoutDashboard },
  { to: '/announcements', label: 'Announcements', icon: LayoutDashboard },
  { to: '/materials', label: 'Subjects', icon: BookOpen },
  { to: '/classroom', label: 'Virtual Classroom', icon: Video },
];

const TEACHER_LINKS = [
  { to: '/teacher/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/teacher/subjects', label: 'My Subjects', icon: BookOpen },
  { to: '/classroom', label: 'Virtual Classroom', icon: Video },
];

const ADMIN_LINKS = [
  { to: '/admin', label: 'Administration', icon: ShieldCheck },
];

const ACCOUNT_LINKS = [{ to: '/profile', label: 'Profile', icon: User }];

const ROLE_BADGE = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Admin',
};

function NavSection({ title, links, onNavigate }) {
  return (
    <div className="mb-5">
      <p className="px-3 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {title}
      </p>
      <nav className="space-y-0.5">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function Sidebar({ profile, onNavigate }) {
  const workspaceLinks =
    profile?.role === 'teacher' ? TEACHER_LINKS
      : profile?.role === 'admin' ? ADMIN_LINKS
      : STUDENT_LINKS;
  const roleBadge = ROLE_BADGE[profile?.role] || 'User';

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-4 h-14 flex items-center border-b border-slate-200 flex-shrink-0">
        <span className="w-7 h-7 rounded-md bg-primary-600 flex items-center justify-center mr-2.5">
          <Layout className="w-4 h-4 text-white" />
        </span>
        <span className="font-bold text-[15px] text-slate-900 tracking-tight">ByteBridge</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavSection title="Workspace" links={workspaceLinks} onNavigate={onNavigate} />
        <NavSection title="Account" links={ACCOUNT_LINKS} onNavigate={onNavigate} />
      </div>

      <div className="px-3 py-3 border-t border-slate-200 flex items-center gap-2.5 flex-shrink-0">
        <Avatar name={profile?.full_name} size={32} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-slate-800 truncate">
            {profile?.full_name || 'User'}
          </p>
          <p className="text-[11px] text-slate-400 capitalize">{profile?.role || '—'}</p>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
          {roleBadge}
        </span>
      </div>
    </div>
  );
}
