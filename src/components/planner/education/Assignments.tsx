import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Plus, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PlannerShell } from '../PlannerShell';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface Assignment {
  id: string;
  title: string;
  course: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'submitted';
  notes?: string;
  created_at: string;
}

export function Assignments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    course: '',
    due_date: '',
    status: 'pending' as const,
    notes: ''
  });

  useEffect(() => {
    if (user) {
      loadAssignments();
    }
  }, [user]);

  const loadAssignments = async () => {
    if (!user) return;
    setLoading(true);
    // Assignments are managed separately
    setAssignments([]);
    setLoading(false);
  };

  const addAssignment = async () => {
    if (!user || !newAssignment.title.trim()) return;
    // Assignments are managed separately
    setNewAssignment({ title: '', course: '', due_date: '', notes: '' });
    setShowForm(false);
  };

  const addAssignmentOld = async () => {
    if (!user || !newAssignment.title.trim()) return;

    const { error } = await supabase
      .from('daily_planner_entries_OLD')
      .insert({
        user_id: user.id,
        life_area: 'education',
        title: newAssignment.title,
        content: newAssignment.notes,
        tags: 'assignment',
        metadata: {
          course: newAssignment.course,
          due_date: newAssignment.due_date,
          status: newAssignment.status
        }
      });

    if (!error) {
      setNewAssignment({ title: '', course: '', due_date: '', status: 'pending', notes: '' });
      setShowForm(false);
      loadAssignments();
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      submitted: 'bg-green-100 text-green-700 border-green-200',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
      pending: 'bg-amber-100 text-amber-700 border-amber-200'
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const isOverdue = (dueDate: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
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
              <h1 className="text-3xl font-bold text-slate-800">Assignments</h1>
              <p className="text-slate-600 mt-1">Track coursework and assignment deadlines</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Add Assignment
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">New Assignment</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Assignment Title</label>
                    <input
                      type="text"
                      value={newAssignment.title}
                      onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="e.g., Research Paper, Final Exam"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Course</label>
                    <input
                      type="text"
                      value={newAssignment.course}
                      onChange={(e) => setNewAssignment({ ...newAssignment, course: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="e.g., Biology 101"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Due Date</label>
                    <input
                      type="date"
                      value={newAssignment.due_date}
                      onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                    <select
                      value={newAssignment.status}
                      onChange={(e) => setNewAssignment({ ...newAssignment, status: e.target.value as any })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="submitted">Submitted</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                  <textarea
                    value={newAssignment.notes}
                    onChange={(e) => setNewAssignment({ ...newAssignment, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    rows={2}
                    placeholder="Requirements, instructions, notes..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={addAssignment}
                    className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                  >
                    Save Assignment
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setNewAssignment({ title: '', course: '', due_date: '', status: 'pending', notes: '' });
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
          <div className="text-center py-12 text-slate-600">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-12 text-center border border-slate-200">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No assignments yet</h3>
            <p className="text-slate-600">Add your first assignment to track</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">{assignment.title}</h3>
                    {assignment.course && (
                      <p className="text-sm text-slate-600 mb-2">{assignment.course}</p>
                    )}
                    {assignment.notes && (
                      <p className="text-sm text-slate-600 leading-relaxed">{assignment.notes}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full border whitespace-nowrap ${getStatusBadge(assignment.status)}`}>
                    {assignment.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm mt-4">
                  {assignment.due_date && (
                    <span className={`flex items-center gap-1 ${isOverdue(assignment.due_date) && assignment.status !== 'submitted' ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                      {isOverdue(assignment.due_date) && assignment.status !== 'submitted' ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <Calendar className="w-4 h-4" />
                      )}
                      Due {new Date(assignment.due_date).toLocaleDateString()}
                    </span>
                  )}
                  {assignment.status === 'submitted' && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      Submitted
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
