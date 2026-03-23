import { useState, useMemo } from 'react';
import {
  Plus,
  StickyNote,
  Bell,
  Calendar,
  Image,
  Sparkles,
  X,
  Trash2,
  Frame,
  CheckSquare,
  Trophy,
  UtensilsCrossed,
  ShoppingCart,
  Layers,
  FileText,
  Search,
  Folder,
  ImagePlus,
  Table,
  Check,
  Activity,
  BookOpen,
} from 'lucide-react';
import { WidgetType } from '../../lib/fridgeCanvasTypes';
import { TrashViewer } from './TrashViewer';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import type { WidgetColorToken, WidgetTypeId } from '../../lib/uiPreferencesTypes';
import { WIDGET_COLOR_TOKENS } from '../../lib/uiPreferencesTypes';

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
  category: string;
  description: string;
}

const widgetOptions: WidgetOption[] = [
  { type: 'note', icon: StickyNote, label: 'Note', category: 'Content', description: 'Quick notes and memos' },
  { type: 'reminder', icon: Bell, label: 'Reminder', category: 'Planning', description: 'Set reminders and alerts' },
  { type: 'calendar', icon: Calendar, label: 'Calendar', category: 'Planning', description: 'View upcoming events' },
  { type: 'journal', icon: BookOpen, label: 'Journal', category: 'Content', description: 'Personal journal and gratitude entries' },
  { type: 'workspace', icon: FileText, label: 'Workspace', category: 'Content', description: 'Structured thinking and reference surface' },
  { type: 'achievements', icon: Trophy, label: 'Achievements', category: 'Tracking', description: 'View milestones and wins' },
  { type: 'photo', icon: Image, label: 'Photo', category: 'Media', description: 'Add photos and images' },
  { type: 'insight', icon: Sparkles, label: 'Insight', category: 'Content', description: 'Important insights' },
  { type: 'meal_planner', icon: UtensilsCrossed, label: 'Meal Planner', category: 'Planning', description: 'Plan weekly meals' },
  { type: 'grocery_list', icon: ShoppingCart, label: 'Grocery List', category: 'Planning', description: 'Shopping list' },
  { type: 'todos', icon: CheckSquare, label: 'To-Do List', category: 'Planning', description: 'Track tasks and todos' },
  { type: 'stack_card', icon: Layers, label: 'Stack Cards', category: 'Organization', description: 'Organize with cards' },
  { type: 'files', icon: FileText, label: 'Files', category: 'Organization', description: 'Manage your files' },
  { type: 'collections', icon: Folder, label: 'Collections', category: 'Organization', description: 'Curate and organize references' },
  { type: 'tables', icon: Table, label: 'Tables', category: 'Organization', description: 'Spreadsheet-style data tables' },
  { type: 'tracker_app', icon: Activity, label: 'Tracker App', category: 'Tracking', description: 'Add a tracker as a standalone app with its own icon' },
  { type: 'graphics', icon: ImagePlus, label: 'Graphics', category: 'Media', description: 'Upload and place SVG graphics' },
];

const categories = ['All', 'Content', 'Planning', 'Tracking', 'Media', 'Organization'];

const colorOptions: WidgetColorToken[] = [
  'cyan', 'blue', 'violet', 'pink', 'orange', 'green', 'yellow', 'neutral',
  'red', 'teal', 'emerald', 'amber', 'indigo', 'rose', 'sky', 'lime', 'fuchsia', 'slate'
];

export function WidgetToolboxWithColorPicker({ onAddWidget, onAddGroup, onOpenSVGUpload, householdId, isMobile = false }: WidgetToolboxProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedWidget, setSelectedWidget] = useState<ToolboxItemType | null>(null);
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
    if (type === 'graphics') {
      onOpenSVGUpload();
      setIsExpanded(false);
      setSearchTerm('');
      setSelectedCategory('All');
      setSelectedWidget(null);
      return;
    }

    onAddWidget(type as WidgetType);
    setIsExpanded(false);
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedWidget(null);
  };

  const handleWidgetClick = (type: ToolboxItemType) => {
    if (selectedWidget === type) {
      handleAddWidget(type);
    } else {
      setSelectedWidget(type);
    }
  };

  const handleColorSelect = async (color: WidgetColorToken) => {
    if (selectedWidget && selectedWidget !== 'graphics') {
      await setWidgetColor(selectedWidget as WidgetTypeId, color);
    }
  };

  const getColorForWidget = (type: ToolboxItemType): WidgetColorToken => {
    if (type === 'graphics' || type === 'task' || type === 'agreement' || type === 'custom') {
      return 'neutral';
    }
    return getWidgetColor(type as WidgetTypeId);
  };

  const getColorStyles = (color: WidgetColorToken) => {
    const { rgb } = WIDGET_COLOR_TOKENS[color];
    return {
      background: `rgba(${rgb}, 0.1)`,
      borderColor: `rgba(${rgb}, 0.3)`,
      color: `rgb(${rgb})`,
    };
  };

  const currentColor = selectedWidget ? getColorForWidget(selectedWidget) : 'neutral';

  if (isMobile) {
    return (
      <>
        {showTrash && <TrashViewer householdId={householdId} onClose={() => setShowTrash(false)} />}

        {isExpanded && (
          <div className="fixed inset-0 bg-white z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Add Widget</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedWidget ? 'Pick a colour and tap again to add' : 'Choose an app to add to your space'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsExpanded(false);
                  setSearchTerm('');
                  setSelectedCategory('All');
                  setSelectedWidget(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={22} className="text-gray-600" />
              </button>
            </div>

            {selectedWidget && selectedWidget !== 'graphics' && (
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-2">Widget Colour (applies to all {widgetOptions.find(w => w.type === selectedWidget)?.label} widgets)</p>
                <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                  {colorOptions.map((color) => {
                    const styles = getColorStyles(color);
                    const isActive = currentColor === color;
                    return (
                      <button
                        key={color}
                        onClick={() => handleColorSelect(color)}
                        className="flex-shrink-0 relative w-10 h-10 rounded-lg transition-transform active:scale-95"
                        style={{
                          background: styles.background,
                          border: `2px solid ${isActive ? styles.color : 'transparent'}`,
                        }}
                      >
                        {isActive && <Check size={18} style={{ color: styles.color }} className="absolute inset-0 m-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
                      selectedCategory === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
              <div className="grid grid-cols-5 gap-6">
                {filteredWidgets.map((option) => {
                  const Icon = option.icon;
                  const color = getColorForWidget(option.type);
                  const styles = getColorStyles(color);
                  const isSelected = selectedWidget === option.type;

                  return (
                    <button
                      key={option.type}
                      onClick={() => handleWidgetClick(option.type)}
                      className="flex flex-col items-center gap-2 active:opacity-60 transition-opacity relative"
                    >
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-all"
                        style={{
                          background: styles.background,
                          border: isSelected ? `2.5px solid ${styles.color}` : `1px solid ${styles.borderColor}`,
                        }}
                      >
                        <Icon size={28} style={{ color: styles.color }} strokeWidth={1.5} />
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
                  onClick={() => {
                    onAddGroup();
                    setIsExpanded(false);
                    setSelectedWidget(null);
                  }}
                  className="w-full bg-white border border-gray-200 text-gray-700 rounded-xl py-3.5 transition-all active:bg-gray-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Frame size={20} />
                  <span className="text-sm font-medium">Add Group Frame</span>
                </button>
                <button
                  onClick={() => {
                    setShowTrash(true);
                    setIsExpanded(false);
                    setSelectedWidget(null);
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
              setSelectedWidget(null);
            }}
          ></div>

          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200 bg-white">
              <div>
                <h3 className="font-semibold text-gray-900 text-xl">Add Widget</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {selectedWidget ? 'Choose a colour, then click again to add' : 'Choose an app to add to your space'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsExpanded(false);
                  setSearchTerm('');
                  setSelectedCategory('All');
                  setSelectedWidget(null);
                }}
                className="p-2.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={22} className="text-gray-600" />
              </button>
            </div>

            {selectedWidget && selectedWidget !== 'graphics' && (
              <div className="px-8 py-4 bg-gray-50 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Widget Colour <span className="text-gray-500">(applies to all {widgetOptions.find(w => w.type === selectedWidget)?.label} widgets)</span>
                </p>
                <div className="flex gap-3 flex-wrap max-h-64 overflow-y-auto">
                  {colorOptions.map((color) => {
                    const styles = getColorStyles(color);
                    const isActive = currentColor === color;
                    const { label } = WIDGET_COLOR_TOKENS[color];
                    return (
                      <button
                        key={color}
                        onClick={() => handleColorSelect(color)}
                        className="flex flex-col items-center gap-1.5 group"
                      >
                        <div
                          className="relative w-12 h-12 rounded-xl transition-all hover:scale-110"
                          style={{
                            background: styles.background,
                            border: `2px solid ${isActive ? styles.color : styles.borderColor}`,
                            boxShadow: isActive ? `0 0 0 3px ${styles.background}` : 'none',
                          }}
                        >
                          {isActive && <Check size={20} style={{ color: styles.color }} className="absolute inset-0 m-auto" />}
                        </div>
                        <span className="text-xs text-gray-600 font-medium">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
                      selectedCategory === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                  const color = getColorForWidget(option.type);
                  const styles = getColorStyles(color);
                  const isSelected = selectedWidget === option.type;

                  return (
                    <button
                      key={option.type}
                      onClick={() => handleWidgetClick(option.type)}
                      className="flex flex-col items-center gap-2.5 hover:opacity-70 transition-opacity group"
                    >
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all"
                        style={{
                          background: styles.background,
                          border: isSelected ? `2.5px solid ${styles.color}` : `1px solid ${styles.borderColor}`,
                        }}
                      >
                        <Icon size={32} style={{ color: styles.color }} strokeWidth={1.5} />
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
                  onClick={() => {
                    onAddGroup();
                    setIsExpanded(false);
                    setSelectedWidget(null);
                  }}
                  className="bg-white border border-gray-200 text-gray-700 rounded-2xl py-4 transition-all hover:bg-gray-50 hover:shadow-sm flex items-center justify-center gap-2.5 shadow-sm"
                >
                  <Frame size={22} />
                  <span className="text-sm font-medium">Add Group Frame</span>
                </button>
                <button
                  onClick={() => {
                    setShowTrash(true);
                    setIsExpanded(false);
                    setSelectedWidget(null);
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
    </>
  );
}
