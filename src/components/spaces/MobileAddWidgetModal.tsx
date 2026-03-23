/**
 * Mobile-optimized Add Widget Modal
 * 
 * Full-screen modal for adding widgets in mobile SpacesOSLauncher view.
 * Optimized for touch interactions and mobile screens.
 */

import { useState, useMemo } from 'react';
import {
  X,
  Search,
  StickyNote,
  Bell,
  Calendar,
  Image,
  Sparkles,
  Trophy,
  UtensilsCrossed,
  ShoppingCart,
  Layers,
  FileText,
  Folder,
  ImagePlus,
  Table,
  Activity,
  BookOpen,
  CheckCircle2,
  Package,
  Settings,
  Check,
} from 'lucide-react';
import { WidgetType, TrackerAppContent } from '../../lib/fridgeCanvasTypes';
import { createWidget, getDefaultWidgetContent } from '../../lib/fridgeCanvas';
import { showToast } from '../Toast';
import { SelectTrackerModal } from '../fridge-canvas/widgets/SelectTrackerModal';
import { getTracker } from '../../lib/trackerStudio/trackerService';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import { WIDGET_COLOR_TOKENS, type WidgetColorToken } from '../../lib/uiPreferencesTypes';

interface MobileAddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  onWidgetAdded: () => void;
}

interface WidgetOption {
  type: WidgetType | 'graphics';
  icon: any;
  label: string;
  color: string;
  iconColor: string;
  category: string;
  description: string;
}

const widgetOptions: WidgetOption[] = [
  {
    type: 'note',
    icon: StickyNote,
    label: 'Note',
    color: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
    category: 'Content',
    description: 'Quick notes and memos',
  },
  {
    type: 'reminder',
    icon: Bell,
    label: 'Reminder',
    color: 'bg-rose-50',
    iconColor: 'text-rose-600',
    category: 'Planning',
    description: 'Set reminders and alerts',
  },
  {
    type: 'calendar',
    icon: Calendar,
    label: 'Calendar',
    color: 'bg-blue-50',
    iconColor: 'text-blue-600',
    category: 'Planning',
    description: 'View upcoming events',
  },
  {
    type: 'journal',
    icon: BookOpen,
    label: 'Journal',
    color: 'bg-amber-50',
    iconColor: 'text-amber-600',
    category: 'Content',
    description: 'Personal journal and gratitude entries',
  },
  {
    type: 'workspace',
    icon: FileText,
    label: 'Workspace',
    color: 'bg-slate-50',
    iconColor: 'text-slate-600',
    category: 'Content',
    description: 'Structured thinking and reference surface',
  },
  {
    type: 'achievements',
    icon: Trophy,
    label: 'Achievements',
    color: 'bg-amber-50',
    iconColor: 'text-amber-600',
    category: 'Tracking',
    description: 'View milestones and wins',
  },
  {
    type: 'photo',
    icon: Image,
    label: 'Photo',
    color: 'bg-gray-50',
    iconColor: 'text-gray-600',
    category: 'Media',
    description: 'Add photos and images',
  },
  {
    type: 'insight',
    icon: Sparkles,
    label: 'Insight',
    color: 'bg-violet-50',
    iconColor: 'text-violet-600',
    category: 'Content',
    description: 'Important insights',
  },
  {
    type: 'meal_planner',
    icon: UtensilsCrossed,
    label: 'Meal Planner',
    color: 'bg-orange-50',
    iconColor: 'text-orange-600',
    category: 'Planning',
    description: 'Plan weekly meals',
  },
  {
    type: 'grocery_list',
    icon: ShoppingCart,
    label: 'Grocery List',
    color: 'bg-teal-50',
    iconColor: 'text-teal-600',
    category: 'Planning',
    description: 'Shopping list',
  },
  {
    type: 'pantry',
    icon: Package,
    label: 'Pantry',
    color: 'bg-stone-50',
    iconColor: 'text-stone-600',
    category: 'Planning',
    description: 'Track what you have at home',
  },
  {
    type: 'todos',
    icon: CheckCircle2,
    label: 'To-Do List',
    color: 'bg-green-50',
    iconColor: 'text-green-600',
    category: 'Planning',
    description: 'Task management',
  },
  {
    type: 'stack_card',
    icon: Layers,
    label: 'Stack Cards',
    color: 'bg-sky-50',
    iconColor: 'text-sky-600',
    category: 'Organization',
    description: 'Organize with cards',
  },
  {
    type: 'files',
    icon: FileText,
    label: 'Files',
    color: 'bg-slate-50',
    iconColor: 'text-slate-600',
    category: 'Organization',
    description: 'Manage your files',
  },
  {
    type: 'collections',
    icon: Folder,
    label: 'Collections',
    color: 'bg-blue-50',
    iconColor: 'text-blue-600',
    category: 'Organization',
    description: 'Curate and organize references',
  },
  {
    type: 'tables',
    icon: Table,
    label: 'Tables',
    color: 'bg-sky-50',
    iconColor: 'text-sky-600',
    category: 'Organization',
    description: 'Spreadsheet-style data tables',
  },
  {
    type: 'tracker_app',
    icon: Activity,
    label: 'Tracker App',
    color: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    category: 'Tracking',
    description: 'Add a tracker as a standalone app with its own icon',
  },
  {
    type: 'graphics',
    icon: ImagePlus,
    label: 'Graphics',
    color: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    category: 'Media',
    description: 'Upload and place SVG graphics',
  },
];

const categories = ['All', 'Content', 'Planning', 'Tracking', 'Media', 'Organization'];

export function MobileAddWidgetModal({ isOpen, onClose, householdId, onWidgetAdded }: MobileAddWidgetModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCreating, setIsCreating] = useState(false);
  const [showTrackerSelect, setShowTrackerSelect] = useState(false);
  const [pendingWidgetType, setPendingWidgetType] = useState<WidgetType | null>(null);
  const [colorPickerWidget, setColorPickerWidget] = useState<WidgetOption | null>(null);
  const { getWidgetColor, setWidgetColor, getTrackerColor } = useUIPreferences();

  const filteredWidgets = useMemo(() => {
    let widgets = widgetOptions;

    if (selectedCategory !== 'All') {
      widgets = widgets.filter((w) => w.category === selectedCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      widgets = widgets.filter(
        (w) =>
          w.label.toLowerCase().includes(term) ||
          w.description.toLowerCase().includes(term) ||
          w.category.toLowerCase().includes(term)
      );
    }

    return widgets;
  }, [searchTerm, selectedCategory]);

  const handleWidgetClick = (option: WidgetOption, e: React.MouseEvent) => {
    // If settings icon was clicked, show color picker
    if ((e.target as HTMLElement).closest('[data-settings-button]')) {
      e.stopPropagation();
      setColorPickerWidget(option);
      return;
    }

    // Otherwise, add the widget
    handleAddWidget(option);
  };

  const handleColorSelect = async (color: WidgetColorToken) => {
    if (!colorPickerWidget) return;

    // Save the color preference for this widget type
    if (colorPickerWidget.type !== 'graphics' && colorPickerWidget.type !== 'tracker_app') {
      await setWidgetColor(colorPickerWidget.type as WidgetType, color);
      showToast('success', `${colorPickerWidget.label} color updated`);
    }

    // Close color picker (user can click widget again to add it)
    setColorPickerWidget(null);
  };

  const handleAddWidget = async (option: WidgetOption) => {
    if (isCreating) return;

    // Graphics is not a widget - show message
    if (option.type === 'graphics') {
      showToast('info', 'Graphics can be added from the canvas view');
      return;
    }

    // Tracker app requires selection
    if (option.type === 'tracker_app') {
      setPendingWidgetType(option.type);
      setShowTrackerSelect(true);
      return;
    }

    try {
      setIsCreating(true);
      const content = getDefaultWidgetContent(option.type as WidgetType);
      
      // Get the user's color preference for this widget type
      const widgetColor = getWidgetColor(option.type as WidgetType);
      
      // Map WidgetColorToken to color string for createWidget
      // The createWidget function expects color strings like "blue", "cyan", etc.
      const colorMap: Record<WidgetColorToken, string> = {
        cyan: 'cyan',
        blue: 'blue',
        violet: 'violet',
        pink: 'pink',
        orange: 'orange',
        green: 'green',
        yellow: 'yellow',
        neutral: 'slate',
        red: 'red',
        teal: 'teal',
        emerald: 'emerald',
        amber: 'amber',
        indigo: 'indigo',
        rose: 'rose',
        sky: 'sky',
        lime: 'lime',
        fuchsia: 'fuchsia',
        slate: 'slate',
      };
      
      const colorString = colorMap[widgetColor] || 'yellow';
      
      await createWidget(householdId, option.type as WidgetType, content, {
        color: colorString,
      });
      
      showToast('success', `${option.label} added successfully`);
      onWidgetAdded();
      onClose();
    } catch (error) {
      console.error('Failed to create widget:', error);
      showToast('error', `Failed to add ${option.label}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleTrackerSelected = async (trackerId: string) => {
    if (!pendingWidgetType || isCreating) return;

    try {
      setIsCreating(true);
      
      // For tracker_app, fetch tracker to get icon and color
      let widgetIcon = 'Activity';
      let widgetColor = 'indigo';
      let widgetTitle = 'Tracker';

      if (pendingWidgetType === 'tracker_app') {
        try {
          const tracker = await getTracker(trackerId);
          if (tracker) {
            widgetTitle = tracker.name;
            widgetIcon = tracker.icon || 'Activity';
            
            // Check for custom color preference first, then fall back to tracker's color
            const customColor = getTrackerColor(trackerId);
            if (customColor) {
            // Map WidgetColorToken to color string for createWidget
            const colorMap: Record<WidgetColorToken, string> = {
              cyan: 'cyan',
              blue: 'blue',
              violet: 'violet',
              pink: 'pink',
              orange: 'orange',
              green: 'green',
              yellow: 'yellow',
              neutral: 'slate',
              red: 'red',
              teal: 'teal',
              emerald: 'emerald',
              amber: 'amber',
              indigo: 'indigo',
              rose: 'rose',
              sky: 'sky',
              lime: 'lime',
              fuchsia: 'fuchsia',
              slate: 'slate',
            };
              widgetColor = colorMap[customColor] || 'indigo';
            } else {
              widgetColor = tracker.color || 'indigo';
            }
          }
        } catch (err) {
          console.error('Failed to fetch tracker:', err);
        }
      }

      const content: TrackerAppContent = { tracker_id: trackerId };
      
      await createWidget(householdId, pendingWidgetType, content, {
        icon: widgetIcon,
        color: widgetColor,
        title: widgetTitle,
      });

      showToast('success', `${widgetTitle} added successfully`);
      onWidgetAdded();
      setShowTrackerSelect(false);
      setPendingWidgetType(null);
      onClose();
    } catch (error) {
      console.error('Failed to create tracker widget:', error);
      showToast('error', 'Failed to add tracker widget');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  // Show tracker select modal instead of main modal when selecting a tracker
  if (showTrackerSelect) {
    return (
      <SelectTrackerModal
        isOpen={showTrackerSelect}
        onClose={() => {
          setShowTrackerSelect(false);
          setPendingWidgetType(null);
        }}
        onSelect={handleTrackerSelected}
      />
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-white z-50 flex flex-col safe-top safe-bottom"
      style={{ overscrollBehavior: 'contain' }} // Prevent pull-to-refresh
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900">Add Widget</h2>
          <p className="text-sm text-gray-500 mt-0.5">Choose an app to add to your space</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ml-2"
          aria-label="Close"
        >
          <X size={24} className="text-gray-600" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white overflow-x-auto">
        <div className="flex gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors min-h-[44px] ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Widget Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {filteredWidgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 text-center">No widgets found</p>
            <p className="text-sm text-gray-400 mt-2">Try a different search term or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredWidgets.map((option) => {
              const Icon = option.icon;
              const currentColor = getWidgetColor(option.type as WidgetType);
              const colorInfo = WIDGET_COLOR_TOKENS[currentColor];
              const colorRgb = colorInfo.rgb;
              
              return (
                <div key={option.type} className="relative">
                  <button
                    onClick={(e) => handleWidgetClick(option, e)}
                    disabled={isCreating}
                    className={`${option.color} rounded-2xl p-4 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform min-h-[120px] w-full ${
                      isCreating ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <div 
                      className="p-3 rounded-xl bg-white relative"
                      style={{
                        backgroundColor: `rgba(${colorRgb}, 0.15)`,
                        border: `2px solid rgba(${colorRgb}, 0.4)`,
                      }}
                    >
                      <Icon size={32} style={{ color: `rgb(${colorRgb})` }} />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900 text-sm">{option.label}</p>
                      <p className="text-xs text-gray-600 mt-1">{option.description}</p>
                    </div>
                  </button>
                  {/* Settings icon for color customization */}
                  <button
                    data-settings-button
                    onClick={(e) => {
                      e.stopPropagation();
                      setColorPickerWidget(option);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-lg shadow-sm transition-colors z-10"
                    aria-label="Customize color"
                  >
                    <Settings size={16} className="text-gray-600" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Color Picker Modal */}
      {colorPickerWidget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            onClick={() => setColorPickerWidget(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Customize Color</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Choose a color for {colorPickerWidget.label}
                  </p>
                </div>
                <button
                  onClick={() => setColorPickerWidget(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-5 gap-3 max-h-96 overflow-y-auto">
                {(Object.keys(WIDGET_COLOR_TOKENS) as WidgetColorToken[]).map((colorKey) => {
                  const color = WIDGET_COLOR_TOKENS[colorKey];
                  const isSelected = getWidgetColor(colorPickerWidget.type as WidgetType) === colorKey;

                  return (
                    <button
                      key={colorKey}
                      onClick={() => handleColorSelect(colorKey)}
                      className={`group relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:bg-gray-50 ${
                        isSelected ? 'bg-gray-50 ring-2 ring-blue-600' : ''
                      }`}
                    >
                      <div
                        className="w-12 h-12 rounded-xl shadow-sm transition-transform group-hover:scale-110"
                        style={{ backgroundColor: `rgb(${color.rgb})` }}
                      />
                      <span className="text-xs font-medium text-gray-700">{color.label}</span>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={() => setColorPickerWidget(null)}
                className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isCreating && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-700 font-medium">Adding widget...</p>
          </div>
        </div>
      )}
    </div>
  );
}
