import { useState } from 'react';
import { Plus, StickyNote, Bell, Calendar, Target, Zap, Image, Sparkles, X, Trash2, Frame, CheckCircle2, Trophy, UtensilsCrossed, ShoppingCart, Layers, FileText } from 'lucide-react';
import { WidgetType } from '../../lib/fridgeCanvasTypes';
import { TrashViewer } from './TrashViewer';

interface WidgetToolboxProps {
  onAddWidget: (type: WidgetType) => void;
  onAddGroup: () => void;
  householdId: string;
  isMobile?: boolean;
}

const widgetOptions = [
  { type: 'note' as WidgetType, icon: StickyNote, label: 'Note', color: 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900' },
  { type: 'reminder' as WidgetType, icon: Bell, label: 'Reminder', color: 'bg-rose-400 hover:bg-rose-500 text-rose-900' },
  { type: 'calendar' as WidgetType, icon: Calendar, label: 'Calendar', color: 'bg-blue-400 hover:bg-blue-500 text-blue-900' },
  { type: 'goal' as WidgetType, icon: Target, label: 'Goal', color: 'bg-emerald-400 hover:bg-emerald-500 text-emerald-900' },
  { type: 'habit' as WidgetType, icon: Zap, label: 'Habit', color: 'bg-amber-400 hover:bg-amber-500 text-amber-900' },
  { type: 'habit_tracker' as WidgetType, icon: CheckCircle2, label: 'Habit Tracker', color: 'bg-cyan-400 hover:bg-cyan-500 text-cyan-900' },
  { type: 'achievements' as WidgetType, icon: Trophy, label: 'Achievements', color: 'bg-amber-400 hover:bg-amber-500 text-amber-900' },
  { type: 'photo' as WidgetType, icon: Image, label: 'Photo', color: 'bg-gray-400 hover:bg-gray-500 text-gray-900' },
  { type: 'insight' as WidgetType, icon: Sparkles, label: 'Insight', color: 'bg-violet-400 hover:bg-violet-500 text-violet-900' },
  { type: 'meal_planner' as WidgetType, icon: UtensilsCrossed, label: 'Meal Planner', color: 'bg-orange-400 hover:bg-orange-500 text-orange-900' },
  { type: 'grocery_list' as WidgetType, icon: ShoppingCart, label: 'Grocery List', color: 'bg-teal-400 hover:bg-teal-500 text-teal-900' },
  { type: 'stack_card' as WidgetType, icon: Layers, label: 'Stack Cards', color: 'bg-sky-400 hover:bg-sky-500 text-sky-900' },
  { type: 'files' as WidgetType, icon: FileText, label: 'Files', color: 'bg-slate-400 hover:bg-slate-500 text-slate-900' },
];

export function WidgetToolbox({ onAddWidget, onAddGroup, householdId, isMobile = false }: WidgetToolboxProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTrash, setShowTrash] = useState(false);

  const handleAddWidget = (type: WidgetType) => {
    onAddWidget(type);
    setIsExpanded(false);
  };

  const handleAddGroup = () => {
    onAddGroup();
    setIsExpanded(false);
  };

  if (isMobile) {
    return (
      <>
        {showTrash && <TrashViewer householdId={householdId} onClose={() => setShowTrash(false)} />}

        <div className="fixed bottom-6 right-6 z-50">
          {isExpanded && (
            <div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsExpanded(false)}
            ></div>
          )}

          {isExpanded ? (
            <div className="relative">
              <div className="absolute bottom-16 right-0 bg-white rounded-2xl shadow-2xl border-2 border-orange-300 p-3 min-w-[280px]">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                  <h3 className="font-bold text-gray-900 text-sm">Add Widget</h3>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {widgetOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.type}
                        onClick={() => handleAddWidget(option.type)}
                        className={`${option.color} rounded-xl p-3 shadow-md transition-all active:scale-95 flex flex-col items-center gap-1`}
                      >
                        <Icon size={20} />
                        <span className="text-xs font-semibold">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={handleAddGroup}
                  className="w-full mt-2 bg-teal-400 hover:bg-teal-500 text-teal-900 rounded-xl p-3 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Frame size={18} />
                  <span className="text-xs font-semibold">Add Group Frame</span>
                </button>
                <button
                  onClick={() => {
                    setShowTrash(true);
                    setIsExpanded(false);
                  }}
                  className="w-full mt-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl p-3 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  <span className="text-xs font-semibold">View Trash</span>
                </button>
              </div>
            </div>
          ) : null}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-16 h-16 bg-gradient-to-br from-orange-400 to-rose-500 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-4 border-white"
          >
            {isExpanded ? (
              <X size={28} className="text-white" />
            ) : (
              <Plus size={28} className="text-white" />
            )}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {showTrash && <TrashViewer householdId={householdId} onClose={() => setShowTrash(false)} />}

      <div className="fixed bottom-8 right-8 z-50">
        {isExpanded && (
          <div
            className="fixed inset-0"
            onClick={() => setIsExpanded(false)}
          ></div>
        )}

        <div className="relative">
          {isExpanded && (
            <div className="absolute bottom-24 right-0">
              <div className="flex flex-col gap-3 items-end">
                {widgetOptions.map((option, index) => {
                  const Icon = option.icon;
                  const angle = (index / widgetOptions.length) * Math.PI;
                  const radius = 140;
                  const x = Math.cos(angle + Math.PI) * radius;
                  const y = Math.sin(angle + Math.PI) * radius;

                  return (
                    <div
                      key={option.type}
                      className="relative animate-in fade-in slide-in-from-right-10 duration-300"
                      style={{
                        animationDelay: `${index * 50}ms`,
                      }}
                    >
                      <button
                        onClick={() => handleAddWidget(option.type)}
                        className={`${option.color} rounded-2xl px-4 py-3 shadow-xl transition-all hover:scale-110 active:scale-95 flex items-center gap-3 border-2 border-white`}
                      >
                        <Icon size={20} />
                        <span className="font-semibold text-sm whitespace-nowrap">{option.label}</span>
                      </button>
                    </div>
                  );
                })}
                <div className="relative animate-in fade-in slide-in-from-right-10 duration-300"
                  style={{
                    animationDelay: `${widgetOptions.length * 50}ms`,
                  }}
                >
                  <button
                    onClick={handleAddGroup}
                    className="bg-teal-400 hover:bg-teal-500 text-teal-900 rounded-2xl px-4 py-3 shadow-xl transition-all hover:scale-110 active:scale-95 flex items-center gap-3 border-2 border-white"
                  >
                    <Frame size={20} />
                    <span className="font-semibold text-sm whitespace-nowrap">Add Group Frame</span>
                  </button>
                </div>
                <div className="relative animate-in fade-in slide-in-from-right-10 duration-300"
                  style={{
                    animationDelay: `${(widgetOptions.length + 1) * 50}ms`,
                  }}
                >
                  <button
                    onClick={() => {
                      setShowTrash(true);
                      setIsExpanded(false);
                    }}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-2xl px-4 py-3 shadow-xl transition-all hover:scale-110 active:scale-95 flex items-center gap-3 border-2 border-white"
                  >
                    <Trash2 size={20} />
                    <span className="font-semibold text-sm whitespace-nowrap">View Trash</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-20 h-20 bg-gradient-to-br from-orange-400 to-rose-500 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-4 border-white ${
              isExpanded ? 'rotate-45' : 'rotate-0'
            }`}
          >
            <Plus size={32} className="text-white" strokeWidth={3} />
          </button>

          <div className="absolute -top-14 right-0 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-orange-200 whitespace-nowrap pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
            <p className="text-xs text-gray-700 font-medium">Add Widget</p>
          </div>
        </div>
      </div>
    </>
  );
}
