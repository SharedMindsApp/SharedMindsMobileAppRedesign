import { useState, useEffect } from 'react';
import { Folder, List, Target, CheckSquare, Search } from 'lucide-react';
import type { WorkItem } from '../../lib/regulation/dailyAlignmentTypes';
import { getAvailableWorkItems } from '../../lib/regulation/dailyAlignmentService';

interface AlignmentWorkPickerProps {
  userId: string;
}

export function AlignmentWorkPicker({ userId }: AlignmentWorkPickerProps) {
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<WorkItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkItems();
  }, [userId]);

  useEffect(() => {
    filterItems();
  }, [workItems, searchQuery, selectedType]);

  const loadWorkItems = async () => {
    setLoading(true);
    const items = await getAvailableWorkItems(userId);
    setWorkItems(items);
    setLoading(false);
  };

  const filterItems = () => {
    let filtered = workItems;

    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.projectName?.toLowerCase().includes(query) ||
        item.trackName?.toLowerCase().includes(query)
      );
    }

    setFilteredItems(filtered);
  };

  const handleDragStart = (e: React.DragEvent, item: WorkItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <Folder className="w-4 h-4" />;
      case 'track':
        return <List className="w-4 h-4" />;
      case 'subtrack':
        return <Target className="w-4 h-4" />;
      case 'task':
        return <CheckSquare className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'project':
        return 'text-purple-600 bg-purple-50';
      case 'track':
        return 'text-blue-600 bg-blue-50';
      case 'subtrack':
        return 'text-green-600 bg-green-50';
      case 'task':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">Loading work items...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Available Work</h3>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-2 py-1 text-xs rounded ${
              selectedType === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedType('task')}
            className={`px-2 py-1 text-xs rounded ${
              selectedType === 'task'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tasks
          </button>
          <button
            onClick={() => setSelectedType('track')}
            className={`px-2 py-1 text-xs rounded ${
              selectedType === 'track'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tracks
          </button>
          <button
            onClick={() => setSelectedType('project')}
            className={`px-2 py-1 text-xs rounded ${
              selectedType === 'project'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Projects
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            {searchQuery ? 'No items match your search' : 'No work items available'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map(item => (
              <div
                key={`${item.type}-${item.id}`}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm cursor-move transition-all bg-white"
              >
                <div className="flex items-start gap-2">
                  <div className={`p-1.5 rounded ${getTypeColor(item.type)}`}>
                    {getItemIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {item.title}
                    </div>
                    {(item.projectName || item.trackName) && (
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {item.projectName && <span>{item.projectName}</span>}
                        {item.projectName && item.trackName && <span className="mx-1">›</span>}
                        {item.trackName && <span>{item.trackName}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-600">
          Drag items to the calendar to plan your day
        </p>
      </div>
    </div>
  );
}
