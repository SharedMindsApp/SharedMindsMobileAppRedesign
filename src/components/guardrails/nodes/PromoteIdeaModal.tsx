import { useState } from 'react';
import { X, ArrowUpRight } from 'lucide-react';
import type { OffshootIdea, RoadmapSection } from '../../../lib/guardrailsTypes';
import { createRoadmapItem, deleteOffshootIdea } from '../../../lib/guardrails';
import { getDefaultColors } from '../../../lib/ganttUtils';

interface PromoteIdeaModalProps {
  idea: OffshootIdea;
  sections: RoadmapSection[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PromoteIdeaModal({
  idea,
  sections,
  isOpen,
  onClose,
  onSuccess,
}: PromoteIdeaModalProps) {
  const [sectionId, setSectionId] = useState(sections[0]?.id || '');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionId || loading) return;

    if (new Date(endDate) < new Date(startDate)) {
      alert('End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      await createRoadmapItem({
        section_id: sectionId,
        title: idea.title,
        description: idea.description || undefined,
        start_date: startDate,
        end_date: endDate,
        status: 'not_started',
        color: getDefaultColors()[0],
      });

      await deleteOffshootIdea(idea.id);

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to promote idea:', error);
      alert('Failed to promote idea. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Promote to Roadmap</h2>
              <p className="text-sm text-gray-600 mt-1">Convert "{idea.title}" to a roadmap item</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={loading}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handlePromote} className="p-4 space-y-4">
            {sections.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-900">
                  No roadmap sections available. Please create a section first in the Roadmap view.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section *
                  </label>
                  <select
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                    required
                  >
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-900">
                    This will convert the side idea into a roadmap item and remove it from the ideas list.
                    The title and description will be preserved.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                    disabled={loading || !sectionId}
                  >
                    <ArrowUpRight size={18} />
                    Promote to Roadmap
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
