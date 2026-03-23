import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Plus, FileText, Video, Book, File } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PlannerShell } from '../PlannerShell';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface Resource {
  id: string;
  title: string;
  type: 'article' | 'video' | 'book' | 'pdf' | 'other';
  url?: string;
  notes?: string;
  tags?: string;
  created_at: string;
}

export function ReadingResources() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newResource, setNewResource] = useState({
    title: '',
    type: 'article' as const,
    url: '',
    notes: '',
    tags: ''
  });

  useEffect(() => {
    if (user) {
      loadResources();
    }
  }, [user]);

  const loadResources = async () => {
    if (!user) return;
    setLoading(true);
    // Resources are managed separately
    setResources([]);
    setLoading(false);
  };

  const addResource = async () => {
    if (!user || !newResource.title.trim()) return;
    // Resources are managed separately
    setNewResource({ title: '', type: 'book', url: '', tags: '', notes: '' });
    setShowForm(false);
  };

  const addResourceOld = async () => {
    if (!user || !newResource.title.trim()) return;

    const { error } = await supabase
      .from('daily_planner_entries_OLD')
      .insert({
        user_id: user.id,
        life_area: 'education',
        title: newResource.title,
        content: newResource.notes,
        tags: `resource ${newResource.tags}`,
        metadata: {
          type: newResource.type,
          url: newResource.url || null
        }
      });

    if (!error) {
      setNewResource({ title: '', type: 'article', url: '', notes: '', tags: '' });
      setShowForm(false);
      loadResources();
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'article': return <FileText className="w-5 h-5 text-blue-600" />;
      case 'video': return <Video className="w-5 h-5 text-red-600" />;
      case 'book': return <Book className="w-5 h-5 text-green-600" />;
      case 'pdf': return <File className="w-5 h-5 text-orange-600" />;
      default: return <FileText className="w-5 h-5 text-slate-600" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const styles = {
      article: 'bg-blue-100 text-blue-700 border-blue-200',
      video: 'bg-red-100 text-red-700 border-red-200',
      book: 'bg-green-100 text-green-700 border-green-200',
      pdf: 'bg-orange-100 text-orange-700 border-orange-200',
      other: 'bg-slate-100 text-slate-700 border-slate-200'
    };
    return styles[type as keyof typeof styles] || styles.other;
  };

  return (
    <PlannerShell>
      <div className="max-w-5xl mx-auto p-8">
        <button
          onClick={() => navigate('/planner/education')}
          className="flex items-center gap-2 px-4 py-2 mb-6 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Education</span>
        </button>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Reading & Resources</h1>
              <p className="text-slate-600 mt-1">Collect books, articles, and learning materials</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Add Resource
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">New Resource</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Resource Title</label>
                    <input
                      type="text"
                      value={newResource.title}
                      onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="e.g., React Documentation"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                    <select
                      value={newResource.type}
                      onChange={(e) => setNewResource({ ...newResource, type: e.target.value as any })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                      <option value="article">Article</option>
                      <option value="video">Video</option>
                      <option value="book">Book</option>
                      <option value="pdf">PDF</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">URL (Optional)</label>
                  <input
                    type="url"
                    value={newResource.url}
                    onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                  <textarea
                    value={newResource.notes}
                    onChange={(e) => setNewResource({ ...newResource, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    rows={3}
                    placeholder="Key takeaways, summary, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
                  <input
                    type="text"
                    value={newResource.tags}
                    onChange={(e) => setNewResource({ ...newResource, tags: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="javascript, frontend, tutorial"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={addResource}
                    className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                  >
                    Save Resource
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setNewResource({ title: '', type: 'article', url: '', notes: '', tags: '' });
                    }}
                    className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-600">Loading resources...</div>
        ) : resources.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-12 text-center border border-slate-200">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No resources yet</h3>
            <p className="text-slate-600">Start building your reading list and resource library</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    {getTypeIcon(resource.type)}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 mb-1">{resource.title}</h3>
                      {resource.url && (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-pink-600 hover:text-pink-700 hover:underline mb-2 inline-block"
                        >
                          {resource.url}
                        </a>
                      )}
                      {resource.notes && (
                        <p className="text-sm text-slate-600 leading-relaxed mt-2">{resource.notes}</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getTypeBadge(resource.type)}`}>
                    {resource.type}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500 mt-4">
                  <span>Added {new Date(resource.created_at).toLocaleDateString()}</span>
                  {resource.tags && resource.tags !== 'resource' && (
                    <span className="text-pink-600">{resource.tags}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PlannerShell>
  );
}
