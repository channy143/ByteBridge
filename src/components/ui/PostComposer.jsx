import { useState } from 'react';
import { Image, Paperclip, Eye, Send, X } from 'lucide-react';

export default function PostComposer({ 
  onSubmit, 
  subjects = [], 
  placeholder = "Write something...",
  showSubjectSelect = true,
  showPinOption = false 
}) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !content) return;
    
    setLoading(true);
    await onSubmit({
      title,
      content,
      subject_id: selectedSubject || null,
      is_pinned: isPinned,
      is_urgent: isUrgent,
      attachments
    });
    setLoading(false);
    
    // Reset form
    setTitle('');
    setContent('');
    setSelectedSubject('');
    setIsPinned(false);
    setIsUrgent(false);
    setAttachments([]);
    setPreviewMode(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments([...attachments, ...newFiles]);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  if (previewMode) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
            {selectedSubject && (
              <span className="inline-block mt-2 px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                {subjects.find(s => s.id === selectedSubject)?.code || 'Global'}
              </span>
            )}
          </div>
          <button 
            onClick={() => setPreviewMode(false)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="prose prose-slate max-w-none text-sm mb-6 whitespace-pre-wrap">
          {content}
        </div>
        {attachments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Attachments</h4>
            <ul className="space-y-2">
              {attachments.map((file, idx) => (
                <li key={idx} className="flex items-center text-sm text-slate-600 bg-slate-50 p-2 rounded">
                  <Paperclip className="w-4 h-4 mr-2" />
                  {file.name}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={() => setPreviewMode(false)}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium flex items-center disabled:opacity-50"
          >
            {loading ? 'Publishing...' : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Publish
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden focus-within:ring-1 focus-within:ring-primary-500 transition-shadow">
      <div className="p-4 border-b border-slate-100">
        <input
          type="text"
          placeholder="Title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full text-lg font-medium text-slate-900 placeholder-slate-400 border-0 focus:outline-none focus:ring-0 p-0"
        />
      </div>
      
      <div className="p-4">
        <textarea
          placeholder={placeholder}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={4}
          className="w-full text-sm text-slate-700 placeholder-slate-400 border-0 focus:outline-none focus:ring-0 p-0 resize-none"
        />
      </div>

      {attachments.length > 0 && (
        <div className="px-4 pb-4 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div key={index} className="flex items-center bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-xs font-medium">
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button 
                type="button" 
                onClick={() => removeAttachment(index)}
                className="ml-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-50 px-4 py-3 flex flex-wrap gap-4 items-center justify-between border-t border-slate-100">
        <div className="flex items-center space-x-4">
          <label className="cursor-pointer text-slate-500 hover:text-primary-600 transition-colors" title="Attach file">
            <Paperclip className="w-5 h-5" />
            <input type="file" multiple className="hidden" onChange={handleFileChange} />
          </label>
          <button type="button" className="text-slate-500 hover:text-primary-600 transition-colors" title="Insert image">
            <Image className="w-5 h-5" />
          </button>
          
          {showSubjectSelect && (
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="text-sm bg-white border border-slate-300 text-slate-700 rounded-md py-1 pl-2 pr-8 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Global (All Subjects)</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.code}</option>
              ))}
            </select>
          )}

          {showPinOption && (
            <div className="flex items-center space-x-3 text-sm">
              <label className="flex items-center space-x-1 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isPinned} 
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500 border-slate-300" 
                />
                <span className="text-slate-600">Pin</span>
              </label>
              <label className="flex items-center space-x-1 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isUrgent} 
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 border-slate-300" 
                />
                <span className="text-slate-600">Urgent</span>
              </label>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setPreviewMode(true)}
            disabled={!title || !content}
            className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
          >
            <Eye className="w-4 h-4 mr-1.5" />
            Preview
          </button>
          <button
            type="submit"
            disabled={loading || !title || !content}
            className="flex items-center px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Sending...' : (
              <>
                <Send className="w-4 h-4 mr-1.5" />
                Post
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
