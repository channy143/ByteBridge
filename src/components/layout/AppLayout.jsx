import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const { profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-workspace">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-60 flex-shrink-0 border-r border-slate-200 fixed inset-y-0 left-0 z-40">
        <Sidebar profile={profile} />
      </aside>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-60 bg-white shadow-xl">
            <Sidebar profile={profile} onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 lg:pl-60">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
