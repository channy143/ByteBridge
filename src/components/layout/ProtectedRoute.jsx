import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { homePathFor } from '../../utils/roles';
import { Skeleton } from '../ui/Skeleton';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex bg-workspace">
        <aside className="hidden lg:block w-60 flex-shrink-0 border-r border-slate-200 fixed inset-y-0 left-0 z-40 bg-white p-4">
          <Skeleton className="h-8 w-32 rounded mb-8" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 mb-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-24 rounded" />
            </div>
          ))}
        </aside>
        <div className="flex-1 flex flex-col min-w-0 lg:pl-60">
          <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 bg-white">
            <Skeleton className="h-3.5 w-32 rounded" />
            <Skeleton className="h-8 w-28 rounded" />
          </div>
          <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 max-w-[1400px] w-full mx-auto">
            <Skeleton className="h-6 w-1/3 rounded mb-2" />
            <Skeleton className="h-3.5 w-1/2 rounded mb-6" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="ws-card px-4 py-3">
                  <Skeleton className="w-8 h-8 rounded-md" />
                  <Skeleton className="h-3 w-20 mt-3" />
                  <Skeleton className="h-4 w-10 mt-1.5" />
                </div>
              ))}
            </div>
            <div className="ws-card p-5">
              <Skeleton className="h-3 w-1/4 rounded mb-3" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full rounded mb-2.5" />
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Not logged in → go to login (remember where they were headed)
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Email confirmed but no profile → something went wrong
  if (!profile) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Role check
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={homePathFor(profile)} replace />;
  }

  return children;
}
