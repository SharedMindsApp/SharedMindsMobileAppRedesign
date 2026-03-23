/**
 * SpacesWidgetsMenuSheet - Widget Quick Menu for SpacesOS
 * 
 * Bottom sheet panel that opens from the bottom navigation "Widgets" button.
 * Provides quick access to all available widgets.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search } from 'lucide-react';
import { widgetRegistry, widgetCategories, getWidgetsByCategory, type WidgetRegistryItem } from '../../spacesOS/widgets/widgetRegistry';
import { BottomSheet } from '../shared/BottomSheet';

interface SpacesWidgetsMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string | null;
}

export function SpacesWidgetsMenuSheet({
  isOpen,
  onClose,
  householdId,
}: SpacesWidgetsMenuSheetProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Filter widgets by search and category
  const filteredWidgets = useMemo(() => {
    let widgets = getWidgetsByCategory(selectedCategory);

    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      widgets = widgets.filter(widget =>
        widget.label.toLowerCase().includes(lowerQuery) ||
        widget.description.toLowerCase().includes(lowerQuery) ||
        widget.category.toLowerCase().includes(lowerQuery)
      );
    }

    return widgets;
  }, [searchQuery, selectedCategory]);

  const handleWidgetClick = (widget: WidgetRegistryItem) => {
    // Navigate to widget app view if route exists, otherwise navigate to spaces launcher
    if (householdId) {
      // For now, navigate to spaces launcher - can be enhanced to navigate to specific widget
      navigate(`/spaces/${householdId}`);
    } else {
      navigate('/spaces');
    }
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Widgets"
      maxHeight="85vh"
    >
      <div className="flex flex-col h-full">
        {/* Search Input */}
        <div className="px-4 pb-3 border-b border-gray-200">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search widgets…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-base bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-4 py-3 border-b border-gray-200 overflow-x-auto">
          <div className="flex gap-2">
            {widgetCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`
                  px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors
                  ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Widget List */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {filteredWidgets.length === 0 ? (
            <div className="flex items-center justify-center h-full p-8">
              <p className="text-sm text-gray-500 text-center">
                No widgets found
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredWidgets.map((widget) => {
                const Icon = widget.icon;
                return (
                  <button
                    key={widget.id}
                    onClick={() => handleWidgetClick(widget)}
                    className="w-full p-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-left flex items-center gap-3"
                  >
                    <div className={`${widget.color} ${widget.iconColor} p-2.5 rounded-lg flex-shrink-0`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 mb-0.5">
                        {widget.label}
                      </div>
                      <div className="text-xs text-gray-500">
                        {widget.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
