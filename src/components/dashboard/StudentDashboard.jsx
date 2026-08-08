import { BookOpen, Calendar, Bell, Clock, MonitorPlay, Activity } from 'lucide-react';

export default function StudentDashboard({ profile }) {
  // Mock data for initial UI layout
  const subjects = [
    { id: 1, code: 'ICT 101', title: 'Introduction to Computing', progress: 85 },
    { id: 2, code: 'ICT 102', title: 'Programming Logic and Design', progress: 60 },
  ];
  
  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Active Subjects</p>
              <h3 className="text-2xl font-bold text-slate-900">{subjects.length}</h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 text-red-600 rounded-lg">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Upcoming Deadlines</p>
              <h3 className="text-2xl font-bold text-slate-900">2</h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <Activity className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Pending Submissions</p>
              <h3 className="text-2xl font-bold text-slate-900">1</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Active Subjects */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <MonitorPlay className="w-5 h-5 mr-2 text-primary-600" />
              My Subjects
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subjects.map(sub => (
                <div key={sub.id} className="border border-slate-200 p-4 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-primary-50 text-primary-700 text-xs font-semibold px-2.5 py-0.5 rounded">
                      {sub.code}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-4">{sub.title}</h3>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 mb-1">
                    <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${sub.progress}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Progress</span>
                    <span>{sub.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Announcements */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <Bell className="w-5 h-5 mr-2 text-primary-600" />
              Recent Announcements
            </h2>
            <div className="space-y-4">
              <div className="p-4 border border-slate-100 bg-slate-50 rounded-lg">
                <div className="flex justify-between mb-1">
                  <h4 className="font-semibold text-slate-900 text-sm">Welcome to ByteBridge</h4>
                  <span className="text-xs text-slate-500">Today</span>
                </div>
                <p className="text-sm text-slate-600">The new portal is now live. Please review your enrolled subjects.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Upcoming Deadlines Widget */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-red-500" />
              Due Soon
            </h2>
            <div className="space-y-4">
              <div className="flex p-3 rounded-lg border border-red-100 bg-red-50">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900">Lab Assignment 1</h4>
                  <p className="text-xs text-red-700">ICT 101 - Intro to Computing</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-red-700">Tomorrow</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Active Class Widget */}
          <div className="bg-gradient-to-br from-primary-900 to-primary-800 p-6 rounded-xl shadow-md text-white">
            <h2 className="text-lg font-bold mb-2 flex items-center">
              <span className="relative flex h-3 w-3 mr-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              Active Class
            </h2>
            <p className="text-sm text-primary-100 mb-4">ICT 102 is currently holding a live session.</p>
            <button className="w-full bg-white text-primary-900 font-semibold py-2 px-4 rounded-lg hover:bg-primary-50 transition-colors">
              Join Class
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
