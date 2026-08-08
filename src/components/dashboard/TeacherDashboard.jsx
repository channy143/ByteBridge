import { Users, Calendar, Bell, PlusCircle, MonitorPlay, Activity } from 'lucide-react';

export default function TeacherDashboard({ profile }) {
  // Mock data for initial UI layout
  const assignedSubjects = [
    { id: 1, code: 'ICT 101', title: 'Introduction to Computing', students: 45 },
    { id: 2, code: 'ICT 102', title: 'Programming Logic and Design', students: 40 },
  ];
  
  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm">
          <PlusCircle className="w-4 h-4 mr-2" />
          Create Activity
        </button>
        <button className="flex items-center px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
          <Bell className="w-4 h-4 mr-2" />
          Post Announcement
        </button>
        <button className="flex items-center px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
          <MonitorPlay className="w-4 h-4 mr-2 text-green-600" />
          Start Class
        </button>
      </div>

      {/* Overview Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Users className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Total Students</p>
              <h3 className="text-2xl font-bold text-slate-900">85</h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
              <Activity className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Pending to Grade</p>
              <h3 className="text-2xl font-bold text-slate-900">12</h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Upcoming Deadlines</p>
              <h3 className="text-2xl font-bold text-slate-900">3</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Assigned Subjects */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Assigned Subjects</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {assignedSubjects.map(sub => (
                <div key={sub.id} className="border border-slate-200 p-4 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-primary-50 text-primary-700 text-xs font-semibold px-2.5 py-0.5 rounded">
                      {sub.code}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      {sub.students}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{sub.title}</h3>
                  <div className="flex justify-between items-center mt-4">
                    <button className="text-sm text-primary-600 font-medium hover:text-primary-700">Manage Course &rarr;</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Recent Submissions Widget */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              Recent Submissions
            </h2>
            <div className="space-y-4">
              <div className="flex items-start p-3 rounded-lg border border-slate-100 bg-slate-50">
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs mr-3">
                  JD
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-slate-900">John Doe</h4>
                  <p className="text-xs text-slate-500">Submitted: Lab Assignment 1</p>
                </div>
                <span className="text-xs text-slate-400">2h ago</span>
              </div>
            </div>
            <button className="w-full mt-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              View All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
