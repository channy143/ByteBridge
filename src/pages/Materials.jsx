import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import Navbar from '../components/layout/Navbar';
import { FolderOpen, FileText, Video, Link as LinkIcon, Download, CheckCircle, Circle, ChevronDown, ChevronRight, Plus, Upload, X, ExternalLink } from 'lucide-react';

export default function Materials() {
  const { profile } = useAuth();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState({});
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModule, setNewModule] = useState({ title: '', description: '' });
  const [showAddMaterial, setShowAddMaterial] = useState(null);
  const [newMaterial, setNewMaterial] = useState({ title: '', external_url: '', material_type: 'PDF' });

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select(`
          *,
          course_materials (*),
          module_progress (*)
        `)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setModules(data || []);
      // Expand first module by default
      if (data && data.length > 0) {
        setExpandedModules({ [data[0].id]: true });
      }
    } catch (err) {
      console.error('Error fetching modules:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const handleMarkComplete = async (moduleId) => {
    try {
      const { error } = await supabase
        .from('module_progress')
        .upsert({
          student_id: profile.id,
          module_id: moduleId,
          completed: true,
          completed_at: new Date().toISOString()
        }, { onConflict: 'student_id,module_id' });

      if (error) throw error;
      fetchModules();
    } catch (err) {
      console.error('Error marking module complete:', err);
    }
  };

  const handleAddModule = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('modules')
        .insert([{
          ...newModule,
          subject_id: null,
          created_by: profile.id,
          order_index: modules.length
        }]);
      if (error) throw error;
      setNewModule({ title: '', description: '' });
      setShowAddModule(false);
      fetchModules();
    } catch (err) {
      console.error('Error adding module:', err);
    }
  };

  const handleAddMaterial = async (e, moduleId) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('course_materials')
        .insert([{
          module_id: moduleId,
          title: newMaterial.title,
          external_url: newMaterial.external_url,
          material_type: newMaterial.material_type
        }]);
      if (error) throw error;
      setNewMaterial({ title: '', external_url: '', material_type: 'PDF' });
      setShowAddMaterial(null);
      fetchModules();
    } catch (err) {
      console.error('Error adding material:', err);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Video': return <Video className="w-4 h-4 text-red-500" />;
      case 'Link': return <LinkIcon className="w-4 h-4 text-blue-500" />;
      default: return <FileText className="w-4 h-4 text-amber-500" />;
    }
  };

  const getProgress = () => {
    if (modules.length === 0) return 0;
    const completed = modules.filter(m => 
      m.module_progress?.some(p => p.student_id === profile?.id && p.completed)
    ).length;
    return Math.round((completed / modules.length) * 100);
  };

  const isModuleCompleted = (mod) => {
    return mod.module_progress?.some(p => p.student_id === profile?.id && p.completed);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <FolderOpen className="w-6 h-6 mr-2 text-primary-600" />
              Course Materials
            </h1>
            <p className="text-slate-600 text-sm mt-1">Access modules, lessons, and downloadable resources.</p>
          </div>
          {profile?.role === 'teacher' && (
            <button 
              onClick={() => setShowAddModule(true)}
              className="mt-4 sm:mt-0 flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Module
            </button>
          )}
        </div>

        {/* Progress Bar for Students */}
        {profile?.role === 'student' && modules.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-slate-700">Overall Progress</h3>
              <span className="text-sm font-bold text-primary-600">{getProgress()}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500" 
                style={{ width: `${getProgress()}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {modules.filter(m => isModuleCompleted(m)).length} of {modules.length} modules completed
            </p>
          </div>
        )}

        {/* Add Module Form */}
        {showAddModule && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-primary-200 mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">New Module</h3>
            <form onSubmit={handleAddModule} className="space-y-4">
              <input
                type="text"
                placeholder="Module title"
                value={newModule.title}
                onChange={e => setNewModule({ ...newModule, title: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <textarea
                placeholder="Description (optional)"
                value={newModule.description}
                onChange={e => setNewModule({ ...newModule, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setShowAddModule(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">Create Module</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : modules.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No Modules Yet</h3>
            <p className="text-slate-500 mt-1">Course materials will appear here once modules are created.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {modules.map((mod, idx) => (
              <div key={mod.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center">
                    {profile?.role === 'student' ? (
                      isModuleCompleted(mod) ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 mr-3 flex-shrink-0" />
                      )
                    ) : (
                      <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">
                        {idx + 1}
                      </span>
                    )}
                    <div>
                      <h3 className="font-semibold text-slate-900">{mod.title}</h3>
                      {mod.description && <p className="text-xs text-slate-500 mt-0.5">{mod.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-slate-400">{mod.course_materials?.length || 0} items</span>
                    {expandedModules[mod.id] ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                  </div>
                </button>

                {expandedModules[mod.id] && (
                  <div className="px-6 pb-4 border-t border-slate-100">
                    {mod.course_materials && mod.course_materials.length > 0 ? (
                      <ul className="divide-y divide-slate-100">
                        {mod.course_materials.map(mat => (
                          <li key={mat.id} className="py-3 flex items-center justify-between group">
                            <div className="flex items-center">
                              {getTypeIcon(mat.material_type)}
                              <span className="ml-3 text-sm font-medium text-slate-700 group-hover:text-primary-600 transition-colors">{mat.title}</span>
                              <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{mat.material_type}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {mat.external_url && (
                                <a href={mat.external_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700" title="Open">
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                              {mat.file_url && (
                                <a href={mat.file_url} download className="text-slate-400 hover:text-slate-600" title="Download">
                                  <Download className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400 py-4 text-center">No materials in this module yet.</p>
                    )}

                    {/* Add Material (Teacher) */}
                    {profile?.role === 'teacher' && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        {showAddMaterial === mod.id ? (
                          <form onSubmit={(e) => handleAddMaterial(e, mod.id)} className="space-y-3">
                            <input type="text" placeholder="Material title" value={newMaterial.title} onChange={e => setNewMaterial({ ...newMaterial, title: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                            <input type="url" placeholder="External URL (YouTube, Drive, etc.)" value={newMaterial.external_url} onChange={e => setNewMaterial({ ...newMaterial, external_url: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                            <select value={newMaterial.material_type} onChange={e => setNewMaterial({ ...newMaterial, material_type: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                              <option value="PDF">PDF</option>
                              <option value="Video">Video</option>
                              <option value="Link">Link</option>
                              <option value="Document">Document</option>
                              <option value="Presentation">Presentation</option>
                              <option value="Code">Code</option>
                            </select>
                            <div className="flex justify-end space-x-3">
                              <button type="button" onClick={() => setShowAddMaterial(null)} className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
                              <button type="submit" className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">Add</button>
                            </div>
                          </form>
                        ) : (
                          <button onClick={() => setShowAddMaterial(mod.id)} className="flex items-center text-sm text-primary-600 font-medium hover:text-primary-700">
                            <Plus className="w-4 h-4 mr-1" /> Add Material
                          </button>
                        )}
                      </div>
                    )}

                    {/* Mark Complete (Student) */}
                    {profile?.role === 'student' && !isModuleCompleted(mod) && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => handleMarkComplete(mod.id)}
                          className="flex items-center text-sm text-green-600 font-medium hover:text-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Mark as Completed
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
