import { useState, useEffect } from 'react';
import { ArrowLeft, GraduationCap, Plus, Calendar, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PlannerShell } from '../PlannerShell';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface Course {
  id: string;
  title: string;
  provider: string;
  status: 'planned' | 'active' | 'completed';
  deadline?: string;
  notes?: string;
  created_at: string;
}

export function CourseInfo() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: '',
    provider: '',
    status: 'planned' as const,
    deadline: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      loadCourses();
    }
  }, [user]);

  const loadCourses = async () => {
    if (!user) return;
    setLoading(true);
    // Courses are managed separately
    setCourses([]);
    setLoading(false);
  };

  const addCourse = async () => {
    if (!user || !newCourse.title.trim()) return;
    // Courses are managed separately
    setNewCourse({ title: '', provider: '', notes: '' });
    setShowForm(false);
  };

  const addCourseOld = async () => {
    if (!user || !newCourse.title.trim()) return;

    const { error } = await supabase
      .from('daily_planner_entries_OLD')
      .insert({
        user_id: user.id,
        life_area: 'education',
        title: newCourse.title,
        content: newCourse.notes,
        tags: 'course',
        metadata: {
          provider: newCourse.provider,
          status: newCourse.status,
          deadline: newCourse.deadline || null
        }
      });

    if (!error) {
      setNewCourse({ title: '', provider: '', status: 'planned', deadline: '', notes: '' });
      setShowForm(false);
      loadCourses();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'active':
        return <PlayCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-700 border-green-200',
      active: 'bg-blue-100 text-blue-700 border-blue-200',
      planned: 'bg-slate-100 text-slate-700 border-slate-200'
    };
    return styles[status as keyof typeof styles] || styles.planned;
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
              <h1 className="text-3xl font-bold text-slate-800">Course Info</h1>
              <p className="text-slate-600 mt-1">Track your enrolled courses and programs</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Add Course
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">New Course</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Course Name</label>
                    <input
                      type="text"
                      value={newCourse.title}
                      onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="e.g., Advanced TypeScript"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Provider</label>
                    <input
                      type="text"
                      value={newCourse.provider}
                      onChange={(e) => setNewCourse({ ...newCourse, provider: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="e.g., Coursera, Udemy"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                    <select
                      value={newCourse.status}
                      onChange={(e) => setNewCourse({ ...newCourse, status: e.target.value as any })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                      <option value="planned">Planned</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Deadline (Optional)</label>
                    <input
                      type="date"
                      value={newCourse.deadline}
                      onChange={(e) => setNewCourse({ ...newCourse, deadline: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                  <textarea
                    value={newCourse.notes}
                    onChange={(e) => setNewCourse({ ...newCourse, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    rows={3}
                    placeholder="Course description, learning outcomes, etc."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={addCourse}
                    className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                  >
                    Save Course
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setNewCourse({ title: '', provider: '', status: 'planned', deadline: '', notes: '' });
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
          <div className="text-center py-12 text-slate-600">Loading courses...</div>
        ) : courses.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-12 text-center border border-slate-200">
            <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No courses yet</h3>
            <p className="text-slate-600">Add your first course or program to track</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(course.status)}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 mb-1">{course.title}</h3>
                      {course.provider && (
                        <p className="text-sm text-slate-600 mb-2">{course.provider}</p>
                      )}
                      {course.notes && (
                        <p className="text-sm text-slate-600 leading-relaxed">{course.notes}</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusBadge(course.status)}`}>
                    {course.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500 mt-4">
                  <span>Added {new Date(course.created_at).toLocaleDateString()}</span>
                  {course.deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Due {new Date(course.deadline).toLocaleDateString()}
                    </span>
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
