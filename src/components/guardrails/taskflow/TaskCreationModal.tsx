import { X, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createRoadmapItem } from '../../../lib/guardrails';
import type { RoadmapItemStatus } from '../../../lib/guardrailsTypes';
import { supabase } from '../../../lib/supabase';
import { useForegroundTriggers } from '../../../contexts/ForegroundTriggersContext';

interface TaskCreationModalProps {
  sectionId: string;
  masterProjectId: string;
  defaultStatus?: RoadmapItemStatus;
  onClose: () => void;
  onSuccess: () => void;
}

interface Track {
  id: string;
  name: string;
  color: string;
}

interface Subtrack {
  id: string;
  name: string;
}

interface SideProject {
  id: string;
  title: string;
}

export function TaskCreationModal({
  sectionId,
  masterProjectId,
  defaultStatus = 'not_started',
  onClose,
  onSuccess,
}: TaskCreationModalProps) {
  const { emitContextEvent } = useForegroundTriggers();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<RoadmapItemStatus>(defaultStatus);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('');
  const [selectedSubtrackId, setSelectedSubtrackId] = useState<string>('');
  const [selectedSideProjectId, setSelectedSideProjectId] = useState<string>('');
  const [isOffshoot, setIsOffshoot] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [subtracks, setSubtracks] = useState<Subtrack[]>([]);
  const [sideProjects, setSideProjects] = useState<SideProject[]>([]);

  useEffect(() => {
    loadTracks();
    loadSideProjects();
  }, [masterProjectId]);

  useEffect(() => {
    if (selectedTrackId) {
      loadSubtracks(selectedTrackId);
    } else {
      setSubtracks([]);
      setSelectedSubtrackId('');
    }
  }, [selectedTrackId]);

  async function loadTracks() {
    const { data } = await supabase
      .from('guardrails_tracks')
      .select('id, name, color')
      .eq('master_project_id', masterProjectId)
      .order('ordering_index');
    if (data) setTracks(data);
  }

  async function loadSubtracks(trackId: string) {
    const { data } = await supabase
      .from('guardrails_tracks')
      .select('id, name')
      .eq('parent_track_id', trackId)
      .is('deleted_at', null)
      .order('ordering_index');
    if (data) setSubtracks(data);
  }

  async function loadSideProjects() {
    const { data } = await supabase
      .from('side_projects')
      .select('id, title')
      .eq('master_project_id', masterProjectId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (data) setSideProjects(data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      await createRoadmapItem({
        section_id: sectionId,
        title: title.trim(),
        description: description.trim() || undefined,
        start_date: startDate,
        end_date: endDate,
        status,
      });

      const { data: createdItem } = await supabase
        .from('roadmap_items')
        .select('id')
        .eq('section_id', sectionId)
        .eq('title', title.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (createdItem && createdItem.id) {
        const updates: any = {};
        if (selectedTrackId) updates.track_id = selectedTrackId;
        if (selectedSubtrackId) updates.subtrack_id = selectedSubtrackId;
        if (selectedSideProjectId) updates.side_project_id = selectedSideProjectId;
        if (isOffshoot) updates.is_offshoot = true;

        if (Object.keys(updates).length > 0) {
          await supabase
            .from('roadmap_items')
            .update(updates)
            .eq('id', createdItem.id);
        }
      }

      emitContextEvent('task_created');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
      // Phase 5A: Use toast instead of alert
      const { showToast } = await import('../../Toast');
      showToast('error', 'Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 safe-top safe-bottom">
      <div className="bg-white rounded-lg shadow-xl max-w-full sm:max-w-2xl w-full max-h-screen-safe overflow-hidden flex flex-col overscroll-contain">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">Create New Task</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Implement user authentication..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add details about this task..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as RoadmapItemStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Optional Associations</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Track
                </label>
                <select
                  value={selectedTrackId}
                  onChange={(e) => setSelectedTrackId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No track selected</option>
                  {tracks.map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTrackId && subtracks.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subtrack
                  </label>
                  <select
                    value={selectedSubtrackId}
                    onChange={(e) => setSelectedSubtrackId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No subtrack selected</option>
                    {subtracks.map((subtrack) => (
                      <option key={subtrack.id} value={subtrack.id}>
                        {subtrack.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {sideProjects.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Side Project
                  </label>
                  <select
                    value={selectedSideProjectId}
                    onChange={(e) => setSelectedSideProjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">No side project selected</option>
                    {sideProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Assign this task to a side project
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isOffshoot"
                  checked={isOffshoot}
                  onChange={(e) => setIsOffshoot(e.target.checked)}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="isOffshoot" className="text-sm text-gray-700">
                  Mark as offshoot idea
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Create Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
