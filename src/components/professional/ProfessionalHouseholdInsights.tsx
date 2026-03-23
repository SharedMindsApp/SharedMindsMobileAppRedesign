import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  FileText,
  StickyNote,
  Loader2,
  Shield,
  AlertCircle,
  Share2,
  Lock,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import {
  getProfessionalHouseholdDetails,
  getProfessionalNotes,
  createProfessionalNote,
  updateProfessionalNote,
  deleteProfessionalNote,
  ProfessionalNote,
} from '../../lib/professional';

type Tab = 'overview' | 'insights' | 'notes';

export function ProfessionalHouseholdInsights() {
  const { householdId } = useParams<{ householdId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [household, setHousehold] = useState<any>(null);
  const [accessLevel, setAccessLevel] = useState<string>('');
  const [members, setMembers] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [notes, setNotes] = useState<ProfessionalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteIsShared, setNewNoteIsShared] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editIsShared, setEditIsShared] = useState(false);

  useEffect(() => {
    if (householdId) {
      loadData();
    }
  }, [householdId]);

  async function loadData() {
    if (!householdId) return;

    try {
      setLoading(true);
      setError(null);
      const [details, notesData] = await Promise.all([
        getProfessionalHouseholdDetails(householdId),
        getProfessionalNotes(householdId),
      ]);

      setHousehold(details.household);
      setAccessLevel(details.accessLevel);
      setMembers(details.members);
      setReport(details.latestReport);
      setNotes(notesData);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Access denied')) {
        setError('You no longer have access to this household');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load household');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAddNote() {
    if (!householdId || !newNoteContent.trim()) return;

    try {
      setAddingNote(true);
      await createProfessionalNote(householdId, newNoteContent, newNoteIsShared);
      setNewNoteContent('');
      setNewNoteIsShared(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  }

  async function handleUpdateNote() {
    if (!editingNoteId || !editContent.trim()) return;

    try {
      await updateProfessionalNote(editingNoteId, editContent, editIsShared);
      setEditingNoteId(null);
      setEditContent('');
      setEditIsShared(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note');
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await deleteProfessionalNote(noteId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    }
  }

  function startEdit(note: ProfessionalNote) {
    setEditingNoteId(note.id);
    setEditContent(note.content);
    setEditIsShared(note.is_shared);
  }

  function cancelEdit() {
    setEditingNoteId(null);
    setEditContent('');
    setEditIsShared(false);
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && error.includes('no longer have access')) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <Shield size={48} className="mx-auto text-red-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Revoked</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/professional/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!household) {
    return <div>Household not found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/professional/dashboard')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{household.name}</h1>
          <p className="text-gray-600 mt-1">
            Access Level:{' '}
            <span className="font-medium">
              {accessLevel === 'summary' ? 'Summary' : 'Full Insights'}
            </span>
          </p>
        </div>
      </div>

      {error && !error.includes('no longer have access') && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users size={20} />
                Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'insights'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText size={20} />
                Insights
              </div>
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'notes'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <StickyNote size={20} />
                Notes ({notes.length})
              </div>
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Household Members</h3>
                {members.length === 0 ? (
                  <p className="text-gray-600">No members have completed the questionnaire yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <p className="font-bold text-gray-900">{member.name}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          {member.age && <span>Age: {member.age}</span>}
                          {member.role && <span>{member.role}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Household Information</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Plan</p>
                      <p className="font-medium text-gray-900 capitalize">{household.plan}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Created</p>
                      <p className="font-medium text-gray-900">
                        {new Date(household.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-6">
              {report ? (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Latest Harmony Profile</h3>
                  <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg p-6">
                    <p className="text-sm text-gray-600 mb-2">
                      Generated {new Date(report.created_at).toLocaleDateString()}
                    </p>
                    {report.content ? (
                      <div className="prose max-w-none">
                        <div className="whitespace-pre-wrap text-gray-800">{report.content}</div>
                      </div>
                    ) : (
                      <p className="text-gray-600">Report content not available</p>
                    )}
                  </div>

                  {accessLevel === 'full_insights' && (
                    <div className="mt-6">
                      <h4 className="font-bold text-gray-900 mb-3">Full Insights Access</h4>
                      <p className="text-gray-600 text-sm">
                        You have full access to detailed friction points and perception gaps.
                      </p>
                    </div>
                  )}

                  {accessLevel === 'summary' && (
                    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Lock size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-900">Summary Access</p>
                          <p className="text-sm text-amber-800 mt-1">
                            You have summary access. Request full insights access from the
                            household owner to see detailed friction points and perception gaps.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No insights available yet</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Insights will appear once the household completes their questionnaires and
                    generates a report.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-3">Add New Note</h3>
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Write a note about this household..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                />
                <div className="flex items-center justify-between mt-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newNoteIsShared}
                      onChange={(e) => setNewNoteIsShared(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Share2 size={16} />
                    Share with household
                  </label>
                  <button
                    onClick={handleAddNote}
                    disabled={addingNote || !newNoteContent.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {addingNote ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        Add Note
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {notes.length === 0 ? (
                  <div className="text-center py-12">
                    <StickyNote size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No notes yet</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Add notes to track sessions and observations.
                    </p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      {editingNoteId === note.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={4}
                          />
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editIsShared}
                                onChange={(e) => setEditIsShared(e.target.checked)}
                                className="rounded border-gray-300"
                              />
                              <Share2 size={16} />
                              Share with household
                            </label>
                            <div className="flex gap-2">
                              <button
                                onClick={cancelEdit}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <X size={18} />
                              </button>
                              <button
                                onClick={handleUpdateNote}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              >
                                <Check size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {note.is_shared ? (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                  <Share2 size={12} />
                                  Shared
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                                  <Lock size={12} />
                                  Private
                                </div>
                              )}
                              <span className="text-xs text-gray-500">
                                {new Date(note.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEdit(note)}
                                className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
