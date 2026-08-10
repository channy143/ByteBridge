import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherSubjects from './pages/TeacherSubjects';
import TeacherTimetables from './pages/TeacherTimetables';
import TeacherSubjectPage from './pages/TeacherSubjectPage';
import AdminOverview from './pages/admin/AdminOverview';
import AdminStudents from './pages/admin/AdminStudents';
import AdminTeachers from './pages/admin/AdminTeachers';
import AdminTeacherDetail from './pages/admin/AdminTeacherDetail';
import AdminPrograms from './pages/admin/AdminPrograms';
import AdminSections from './pages/admin/AdminSections';
import AdminSubjects from './pages/admin/AdminSubjects';
import AdminAssignments from './pages/admin/AdminAssignments';
import AdminLogs from './pages/admin/AdminLogs';
import ComingSoon from './pages/admin/ComingSoon';
import Announcements from './pages/Announcements';
import Profile from './pages/Profile';
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
            <Route path="/teacher/timetables" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><TeacherTimetables /></ProtectedRoute>} />
            <Route path="/teacher/subjects" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><TeacherSubjects /></ProtectedRoute>} />
            <Route path="/teacher/subjects/:subjectId" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><TeacherSubjectPage /></ProtectedRoute>} />

            <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
            <Route path="/admin/overview" element={<ProtectedRoute allowedRoles={['admin']}><AdminOverview /></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><AdminStudents /></ProtectedRoute>} />
            <Route path="/admin/teachers" element={<ProtectedRoute allowedRoles={['admin']}><AdminTeachers /></ProtectedRoute>} />
            <Route path="/admin/teachers/:teacherId" element={<ProtectedRoute allowedRoles={['admin']}><AdminTeacherDetail /></ProtectedRoute>} />
            <Route path="/admin/programs" element={<ProtectedRoute allowedRoles={['admin']}><AdminPrograms /></ProtectedRoute>} />
            <Route path="/admin/sections" element={<ProtectedRoute allowedRoles={['admin']}><AdminSections /></ProtectedRoute>} />
            <Route path="/admin/subjects" element={<ProtectedRoute allowedRoles={['admin']}><AdminSubjects /></ProtectedRoute>} />
            <Route path="/admin/assignments" element={<ProtectedRoute allowedRoles={['admin']}><AdminAssignments /></ProtectedRoute>} />
            <Route path="/admin/syllabi" element={<ProtectedRoute allowedRoles={['admin']}><ComingSoon title="Syllabi" subtitle="Official subject-level syllabus uploads and versioning are coming in the next iteration." /></ProtectedRoute>} />
            <Route path="/admin/announcements" element={<ProtectedRoute allowedRoles={['admin']}><Announcements /></ProtectedRoute>} />
            <Route path="/admin/reports/enrollment" element={<ProtectedRoute allowedRoles={['admin']}><ComingSoon title="Enrollment Reports" subtitle="Enrollment summaries by program, year, and subject are coming in the next iteration." /></ProtectedRoute>} />
            <Route path="/admin/reports/progress" element={<ProtectedRoute allowedRoles={['admin']}><ComingSoon title="Student Progress Reports" subtitle="Per-student activity and grade tracking are coming in the next iteration." /></ProtectedRoute>} />
            <Route path="/admin/reports/academic" element={<ProtectedRoute allowedRoles={['admin']}><ComingSoon title="Academic Reports" subtitle="Academic performance analysis is coming in the next iteration." /></ProtectedRoute>} />
            <Route path="/admin/logs" element={<ProtectedRoute allowedRoles={['admin']}><AdminLogs /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><ComingSoon title="Settings" subtitle="Portal-wide configuration will be available here in the next iteration." /></ProtectedRoute>} />

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
