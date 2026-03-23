import { useState, useMemo } from 'react';
import {
  Plus,
  StickyNote,
  Bell,
  Calendar,
  Target,
  Zap,
  Image,
  Sparkles,
  X,
  Trash2,
  Frame,
  CheckCircle2,
  Trophy,
  UtensilsCrossed,
  ShoppingCart,
  Layers,
  FileText,
  Search,
  Folder,
  ImagePlus,
  Table,
  Palette,
} from 'lucide-react';
import { WidgetType } from '../../lib/fridgeCanvasTypes';
import { TrashViewer } from './TrashViewer';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import { WIDGET_COLOR_TOKENS, WidgetColorToken } from '../../lib/uiPreferencesTypes';

type ToolboxItemType = WidgetType | 'graphics';

interface WidgetToolboxProps {
  onAddWidget: (type: WidgetType) => void;
  onAddGroup: () => void;
  onOpenSVGUpload: () => void;
  householdId: string;
  isMobile?: boolean;
}

interface WidgetOption {
  type: ToolboxItemType;
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
    type: 'goal',
    icon: Target,
    label: 'Goal',
    color: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    category: 'Tracking',
    description: 'Track your goals',
  },
  {
    type: 'habit',
    icon: Zap,
    label: 'Habit',
    color: 'bg-amber-50',
    iconColor: 'text-amber-600',
    category: 'Tracking',
    description: 'Build daily habits',
  },
  {
    type: 'habit_tracker',
    icon: CheckCircle2,
    label: 'Habit Tracker',
    color: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    category: 'Tracking',
    description: 'Visualize habit streaks',
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

export function WidgetToolbox({ onAddWidget, onAddGroup, onOpenSVGUpload, householdId, isMobile = false }: WidgetToolboxProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [colorPickerWidget, setColorPickerWidget] = useState<WidgetType | null>(null);
  const { getWidgetColor, setWidgetColor } = useUIPreferences();

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

  const handleAddWidget = (type: ToolboxItemType) => {
    // Graphics is not a widget - open the upload modal instead
    if (type === 'graphics') {
      onOpenSVGUpload();
      setIsExpanded(false);
      setSearchTerm('');
      setSelectedCategory('All');
      return;
    }

    // Show color picker for the selected widget type
    setColorPickerWidget(type as WidgetType);
  };

  const handleColorSelect = async (color: WidgetColorToken) => {
    if (!colorPickerWidget) return;

    // Save the color preference
    await setWidgetColor(colorPickerWidget, color);

    // Create the widget
    onAddWidget(colorPickerWidget);

    // Reset state
    setColorPickerWidget(null);
    setIsExpanded(false);
    setSearchTerm('');
    setSelectedCategory('All');
  };

  const handleSkipColorPicker = () => {
    if (!colorPickerWidget) return;

    // Use default color and create widget
    onAddWidget(colorPickerWidget);

    // Reset state
    setColorPickerWidget(null);
    setIsExpanded(false);
    setSearchTerm('');
    setSelectedCategory('All');
  };

  const handleAddGroup = () => {
    onAddGroup();
    setIsExpanded(false);
  };

  if (isMobile) {
    return (
      <>
        {showTrash && <TrashViewer householdId={householdId} onClose={() => setShowTrash(false)} />}

        {isExpanded && (
          <div className="fixed inset-0 bg-white z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Add Widget</h3>
                <p className="text-xs text-gray-500 mt-0.5">Choose an app to add to your space</p>
              </div>
              <button
                onClick={() => {
                  setIsExpanded(false);
                  setSearchTerm('');
                  setSelectedCategory('All');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={22} className="text-gray-600" />
              </button>
            </div>

            <div className="px-4 py-3 bg-white sticky top-0 z-10 space-y-3 border-b border-gray-100">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white border border-transparent"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
              <div className="grid grid-cols-4 gap-6">
                {filteredWidgets.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.type}
                      onClick={() => handleAddWidget(option.type)}
                      className="flex flex-col items-center gap-2 active:opacity-60 transition-opacity"
                    >
                      <div className={`w-14 h-14 ${option.color} rounded-2xl flex items-center justify-center shadow-sm`}>
                        <Icon size={28} className={option.iconColor} strokeWidth={1.5} />
                      </div>
                      <span className="text-xs text-gray-900 text-center leading-tight font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>

              {filteredWidgets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Search size={48} className="mb-3 opacity-30" />
                  <p className="font-medium text-gray-500">No apps found</p>
                  <p className="text-sm text-gray-400">Try a different search or category</p>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-gray-200 space-y-3">
                <button
                  onClick={handleAddGroup}
                  className="w-full bg-white border border-gray-200 text-gray-700 rounded-xl py-3.5 transition-all active:bg-gray-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Frame size={20} />
                  <span className="text-sm font-medium">Add Group Frame</span>
                </button>
                <button
                  onClick={() => {
                    setShowTrash(true);
                    setIsExpanded(false);
                  }}
                  className="w-full bg-white border border-gray-200 text-gray-700 rounded-xl py-3.5 transition-all active:bg-gray-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Trash2 size={20} />
                  <span className="text-sm font-medium">View Trash</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-16 h-16 bg-gradient-to-br from-orange-400 to-rose-500 rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95"
          >
            <Plus size={28} className="text-white" strokeWidth={2.5} />
          </button>
        </div>

        {colorPickerWidget && (
          <div className="fixed inset-0 bg-white z-[60] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-rose-500 rounded-xl flex items-center justify-center">
                  <Palette size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Choose Color</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Pick a color for your widget</p>
                </div>
              </div>
              <button
                onClick={() => setColorPickerWidget(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={22} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
              <div className="grid grid-cols-5 gap-4">
                {(Object.keys(WIDGET_COLOR_TOKENS) as WidgetColorToken[]).map((colorKey) => {
                  const color = WIDGET_COLOR_TOKENS[colorKey];
                  const isCurrentDefault = getWidgetColor(colorPickerWidget) === colorKey;

                  return (
                    <button
                      key={colorKey}
                      onClick={() => handleColorSelect(colorKey)}
                      className="relative flex flex-col items-center gap-2 active:opacity-60 transition-opacity"
                    >
                      <div
                        className={`w-14 h-14 rounded-xl shadow-sm ${
                          isCurrentDefault ? 'ring-2 ring-gray-900' : ''
                        }`}
                        style={{ backgroundColor: `rgb(${color.rgb})` }}
                      />
                      <span className="text-xs font-medium text-gray-700 text-center">{color.label}</span>
                      {isCurrentDefault && (
                        <div className="absolute top-0 right-0 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-white space-y-3">
              <button
                onClick={handleSkipColorPicker}
                className="w-full px-4 py-3.5 bg-gradient-to-br from-orange-400 to-rose-500 text-white rounded-xl font-medium active:opacity-90 transition-opacity"
              >
                Use Default
              </button>
              <button
                onClick={() => setColorPickerWidget(null)}
                className="w-full px-4 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-medium active:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {showTrash && <TrashViewer householdId={householdId} onClose={() => setShowTrash(false)} />}

      {isExpanded && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div
            className="absolute inset-0"
            onClick={() => {
              setIsExpanded(false);
              setSearchTerm('');
              setSelectedCategory('All');
            }}
          ></div>

          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200 bg-white">
              <div>
                <h3 className="font-semibold text-gray-900 text-xl">Add Widget</h3>
                <p className="text-sm text-gray-500 mt-0.5">Choose an app to add to your space</p>
              </div>
              <button
                onClick={() => {
                  setIsExpanded(false);
                  setSearchTerm('');
                  setSelectedCategory('All');
                }}
                className="p-2.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={22} className="text-gray-600" />
              </button>
            </div>

            <div className="px-8 py-4 bg-white space-y-4 border-b border-gray-100">
              <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search"
                  className="w-full pl-12 pr-4 py-3 text-sm bg-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white border border-transparent transition-all"
                />
              </div>

              <div className="flex gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedCategory === cat
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-8 bg-gray-50">
              <div className="grid grid-cols-6 gap-8">
                {filteredWidgets.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.type}
                      onClick={() => handleAddWidget(option.type)}
                      className="flex flex-col items-center gap-2.5 hover:opacity-70 transition-opacity group"
                    >
                      <div className={`w-16 h-16 ${option.color} rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
                        <Icon size={32} className={option.iconColor} strokeWidth={1.5} />
                      </div>
                      <span className="text-sm text-gray-900 text-center leading-tight font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>

              {filteredWidgets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Search size={64} className="mb-4 opacity-30" />
                  <p className="font-medium text-lg text-gray-500">No apps found</p>
                  <p className="text-sm text-gray-400">Try a different search or category</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-10 pt-8 border-t border-gray-200">
                <button
                  onClick={handleAddGroup}
                  className="bg-white border border-gray-200 text-gray-700 rounded-2xl py-4 transition-all hover:bg-gray-50 hover:shadow-sm flex items-center justify-center gap-2.5 shadow-sm"
                >
                  <Frame size={22} />
                  <span className="text-sm font-medium">Add Group Frame</span>
                </button>
                <button
                  onClick={() => {
                    setShowTrash(true);
                    setIsExpanded(false);
                  }}
                  className="bg-white border border-gray-200 text-gray-700 rounded-2xl py-4 transition-all hover:bg-gray-50 hover:shadow-sm flex items-center justify-center gap-2.5 shadow-sm"
                >
                  <Trash2 size={22} />
                  <span className="text-sm font-medium">View Trash</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-8 right-8 z-40 group">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-20 h-20 bg-gradient-to-br from-orange-400 to-rose-500 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        >
          <Plus size={32} className="text-white" strokeWidth={2.5} />
        </button>

        <div className="absolute -top-14 right-0 bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-sm text-white font-medium">Add Widget</p>
        </div>
      </div>

      {colorPickerWidget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
          <div
            className="absolute inset-0"
            onClick={() => setColorPickerWidget(null)}
          ></div>

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-rose-500 rounded-xl flex items-center justify-center">
                  <Palette size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Choose Color</h3>
                  <p className="text-sm text-gray-500">Select a color for your {colorPickerWidget} widget</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-4 gap-3">
                {(Object.keys(WIDGET_COLOR_TOKENS) as WidgetColorToken[]).map((colorKey) => {
                  const color = WIDGET_COLOR_TOKENS[colorKey];
                  const isCurrentDefault = getWidgetColor(colorPickerWidget) === colorKey;

                  return (
                    <button
                      key={colorKey}
                      onClick={() => handleColorSelect(colorKey)}
                      className={`group relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:bg-gray-50 ${
                        isCurrentDefault ? 'bg-gray-50 ring-2 ring-gray-900' : ''
                      }`}
                    >
                      <div
                        className="w-12 h-12 rounded-xl shadow-sm transition-transform group-hover:scale-110"
                        style={{ backgroundColor: `rgb(${color.rgb})` }}
                      />
                      <span className="text-xs font-medium text-gray-700">{color.label}</span>
                      {isCurrentDefault && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setColorPickerWidget(null)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSkipColorPicker}
                className="flex-1 px-4 py-3 bg-gradient-to-br from-orange-400 to-rose-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                Use Default
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
