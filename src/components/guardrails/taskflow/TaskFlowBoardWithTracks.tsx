import { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, Palette, Trash2, Check, X } from 'lucide-react';
import type { RoadmapItem, RoadmapSection } from '../../../lib/guardrailsTypes';
import type { Track } from '../../../lib/guardrails/tracksTypes';
import { TaskFlowCard } from './TaskFlowCard';
import { ItemDrawer } from '../roadmap/ItemDrawer';
import { updateRoadmapItem } from '../../../lib/guardrails';
import {
  getTracksForProject,
  createTrack,
  updateTrack,
  deleteTrack,
  getTrackStats,
} from '../../../lib/guardrails/tracks';
import { TrackColorPicker } from '../tracks/TrackColorPicker';
import { TrackDeleteConfirmModal } from '../tracks/TrackDeleteConfirmModal';
import { useActiveDataContext } from '../../../state/useActiveDataContext';

interface TaskFlowBoardWithTracksProps {
  items: RoadmapItem[];
  sections: RoadmapSection[];
  onRefresh: () => void;
  masterProjectId: string;
}

export function TaskFlowBoardWithTracks({
  items,
  sections,
  onRefresh,
  masterProjectId,
}: TaskFlowBoardWithTracksProps) {
  const { activeTrackId, activeSubtrackId } = useActiveDataContext();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<RoadmapItem | null>(null);
  const [lastDragTime, setLastDragTime] = useState(0);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [trackItemCounts, setTrackItemCounts] = useState<Map<string, number>>(new Map());
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingTrackName, setEditingTrackName] = useState('');
  const [colorPickerTrackId, setColorPickerTrackId] = useState<string | null>(null);
  const [colorPickerPosition, setColorPickerPosition] = useState<{ x: number; y: number } | null>(null);
  const [deleteTrackId, setDeleteTrackId] = useState<string | null>(null);
  const [isAddingTrack, setIsAddingTrack] = useState(false);
  const [newTrackName, setNewTrackName] = useState('');
  const [openMenuTrackId, setOpenMenuTrackId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    let filtered = items;

    if (activeTrackId) {
      filtered = filtered.filter((item) => (item as any).track_id === activeTrackId);
    }

    if (activeSubtrackId) {
      filtered = filtered.filter((item) => (item as any).subtrack_id === activeSubtrackId);
    }

    return filtered;
  }, [items, activeTrackId, activeSubtrackId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const loadTracks = async () => {
    try {
      const tracksData = await getTracksForProject(masterProjectId);
      setTracks(tracksData);

      const counts = new Map<string, number>();
      for (const track of tracksData) {
        const stats = await getTrackStats(track.id);
        counts.set(track.id, stats.roadmapItemCount);
      }
      setTrackItemCounts(counts);
    } catch (error) {
      console.error('Failed to load tracks:', error);
    }
  };

  useEffect(() => {
    loadTracks();
  }, [masterProjectId]);

  const itemsByTrackId = useMemo(() => {
    const grouped = new Map<string | null, RoadmapItem[]>();
    filteredItems.forEach((item) => {
      const trackId = (item as any).track_id || null;
      if (!grouped.has(trackId)) {
        grouped.set(trackId, []);
      }
      grouped.get(trackId)!.push(item);
    });
    return grouped;
  }, [filteredItems]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const itemId = active.id as string;
    const newTrackId = over.id === 'unassigned' ? null : (over.id as string);

    const item = items.find((i) => i.id === itemId);
    if (!item) {
      setActiveId(null);
      return;
    }

    const currentTrackId = (item as any).track_id || null;

    if (currentTrackId === newTrackId) {
      setActiveId(null);
      return;
    }

    const now = Date.now();
    if (now - lastDragTime < 500) {
      setActiveId(null);
      return;
    }
    setLastDragTime(now);

    try {
      await updateRoadmapItem(itemId, { track_id: newTrackId });
      onRefresh();
    } catch (error) {
      console.error('Failed to update item track:', error);
      alert('Failed to update task track. Please try again.');
    }

    setActiveId(null);
  };

  const handleAddTrack = async () => {
    if (!newTrackName.trim()) return;
    try {
      await createTrack({
        masterProjectId,
        name: newTrackName.trim(),
      });
      setNewTrackName('');
      setIsAddingTrack(false);
      await loadTracks();
    } catch (error) {
      console.error('Failed to create track:', error);
      alert('Failed to create track. Please try again.');
    }
  };

  const handleRenameTrack = async (trackId: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await updateTrack(trackId, { name: newName.trim() });
      setEditingTrackId(null);
      await loadTracks();
    } catch (error) {
      console.error('Failed to rename track:', error);
      alert('Failed to rename track. Please try again.');
    }
  };

  const handleChangeColor = async (trackId: string, color: string) => {
    try {
      await updateTrack(trackId, { color });
      await loadTracks();
    } catch (error) {
      console.error('Failed to update track color:', error);
      alert('Failed to update color. Please try again.');
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    try {
      await deleteTrack(trackId);
      setDeleteTrackId(null);
      await loadTracks();
      await onRefresh();
    } catch (error) {
      console.error('Failed to delete track:', error);
      alert('Failed to delete track. Please try again.');
    }
  };

  const activeItem = activeId ? items.find((item) => item.id === activeId) : null;
  const unassignedItems = itemsByTrackId.get(null) || [];

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="h-full flex gap-4 p-4 min-w-max">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {tracks.map((track) => {
              const trackItems = itemsByTrackId.get(track.id) || [];
              const isEditing = editingTrackId === track.id;
              const isMenuOpen = openMenuTrackId === track.id;
              const itemCount = trackItemCounts.get(track.id) || 0;

              return (
                <div
                  key={track.id}
                  className="flex-shrink-0 w-80 flex flex-col bg-white rounded-lg shadow-sm border border-gray-200"
                >
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        setColorPickerTrackId(track.id);
                        const rect = e.currentTarget.getBoundingClientRect();
                        setColorPickerPosition({ x: rect.left, y: rect.bottom + 4 });
                      }}
                      className="w-4 h-4 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors flex-shrink-0"
                      style={{ backgroundColor: track.color || '#6B7280' }}
                    />

                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-1">
                        <input
                          type="text"
                          value={editingTrackName}
                          onChange={(e) => setEditingTrackName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameTrack(track.id, editingTrackName);
                            } else if (e.key === 'Escape') {
                              setEditingTrackId(null);
                            }
                          }}
                          autoFocus
                          className="flex-1 px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleRenameTrack(track.id, editingTrackName)}
                          className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingTrackId(null)}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => {
                              setEditingTrackId(track.id);
                              setEditingTrackName(track.name);
                            }}
                            className="text-left w-full group"
                          >
                            <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                              {track.name}
                            </h3>
                          </button>
                          <p className="text-xs text-gray-500">
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                          </p>
                        </div>

                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenMenuTrackId(isMenuOpen ? null : track.id)
                            }
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 top-8 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20 min-w-[140px]">
                              <button
                                onClick={() => {
                                  setEditingTrackId(track.id);
                                  setEditingTrackName(track.name);
                                  setOpenMenuTrackId(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Palette size={14} />
                                Rename
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteTrackId(track.id);
                                  setOpenMenuTrackId(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <SortableContext
                    items={trackItems.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                    id={track.id}
                  >
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {trackItems.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-sm text-gray-400">No items in this track</p>
                        </div>
                      ) : (
                        trackItems.map((item) => (
                          <TaskFlowCard
                            key={item.id}
                            item={item}
                            sectionTitle={
                              sections.find((s) => s.id === item.section_id)?.title || 'Unknown'
                            }
                            onClick={() => setSelectedItem(item)}
                          />
                        ))
                      )}
                    </div>
                  </SortableContext>
                </div>
              );
            })}

            {unassignedItems.length > 0 && (
              <div className="flex-shrink-0 w-80 flex flex-col bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="px-4 py-3 border-b border-gray-300">
                  <h3 className="font-semibold text-gray-600">Unassigned</h3>
                  <p className="text-xs text-gray-500">
                    {unassignedItems.length} {unassignedItems.length === 1 ? 'item' : 'items'}
                  </p>
                </div>

                <SortableContext
                  items={unassignedItems.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                  id="unassigned"
                >
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {unassignedItems.map((item) => (
                      <TaskFlowCard
                        key={item.id}
                        item={item}
                        sectionTitle={
                          sections.find((s) => s.id === item.section_id)?.title || 'Unknown'
                        }
                        onClick={() => setSelectedItem(item)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            )}

            {isAddingTrack ? (
              <div className="flex-shrink-0 w-80 bg-blue-50 rounded-lg border border-blue-200 p-4">
                <input
                  type="text"
                  value={newTrackName}
                  onChange={(e) => setNewTrackName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTrack();
                    } else if (e.key === 'Escape') {
                      setIsAddingTrack(false);
                      setNewTrackName('');
                    }
                  }}
                  placeholder="Track name..."
                  autoFocus
                  className="w-full px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddTrack}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingTrack(false);
                      setNewTrackName('');
                    }}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingTrack(true)}
                className="flex-shrink-0 w-80 h-24 bg-white rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-blue-600 font-medium"
              >
                <Plus size={20} />
                Add Track
              </button>
            )}

            <DragOverlay>
              {activeItem ? (
                <div className="w-80">
                  <TaskFlowCard
                    item={activeItem}
                    sectionTitle={
                      sections.find((s) => s.id === activeItem.section_id)?.title || 'Unknown'
                    }
                    onClick={() => {}}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      <TrackColorPicker
        currentColor={colorPickerTrackId ? tracks.find((t) => t.id === colorPickerTrackId)?.color || null : null}
        onColorChange={(color) => {
          if (colorPickerTrackId) {
            handleChangeColor(colorPickerTrackId, color);
          }
        }}
        isOpen={!!colorPickerTrackId}
        onClose={() => {
          setColorPickerTrackId(null);
          setColorPickerPosition(null);
        }}
        position={colorPickerPosition || undefined}
      />

      <TrackDeleteConfirmModal
        isOpen={!!deleteTrackId}
        onClose={() => setDeleteTrackId(null)}
        onConfirm={() => {
          if (deleteTrackId) {
            handleDeleteTrack(deleteTrackId);
          }
        }}
        trackName={deleteTrackId ? tracks.find((t) => t.id === deleteTrackId)?.name || '' : ''}
        itemCount={deleteTrackId ? trackItemCounts.get(deleteTrackId) || 0 : 0}
      />

      {selectedItem && (
        <ItemDrawer
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={onRefresh}
          tracks={tracks}
        />
      )}
    </div>
  );
}
