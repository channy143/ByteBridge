import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherSubjects from './pages/TeacherSubjects';
import TeacherSubjectPage from './pages/TeacherSubjectPage';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import Announcements from './pages/Announcements';
import Roster from './pages/Roster';
import Materials from './pages/Materials';
import Notifications from './pages/Notifications';
import Classroom from './pages/Classroom';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import { homePathFor } from './utils/roles';

function HomeRedirect() {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user && profile ? homePathFor(profile) : '/login'} replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Authenticated workspace */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['student']}><Dashboard /></ProtectedRoute>} />
            <Route path="/teacher/dashboard" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/subjects" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><TeacherSubjects /></ProtectedRoute>} />
            <Route path="/teacher/subjects/:subjectId" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><TeacherSubjectPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />

            <Route path="/profile" element={<Profile />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/roster" element={<Roster />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/classroom" element={<Classroom />} />
          </Route>

          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
