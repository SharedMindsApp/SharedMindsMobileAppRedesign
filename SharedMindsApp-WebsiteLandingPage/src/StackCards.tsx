import { useState, useRef } from 'react';
import { Layers, Plus, Trash2, Copy, ChevronLeft, ChevronRight, Minimize2, Target, StickyNote, CheckSquare } from 'lucide-react';

interface Card {
  id: string;
  content: string;
  order_index: number;
}

interface StackCardsProps {
  stackId: string;
  title: string;
  colorScheme: 'blue' | 'rose' | 'amber' | 'emerald' | 'violet' | 'cyan';
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onConvertToNote?: (content: string) => void;
  onConvertToTask?: (content: string) => void;
  onConvertToGoal?: (content: string) => void;
}

const colorSchemes = {
  blue: {
    bg: 'from-blue-50 to-blue-100',
    text: 'text-blue-900',
    border: 'border-blue-200',
    accent: 'bg-blue-500',
    hover: 'hover:bg-blue-200',
    shadow: 'shadow-blue-200/50'
  },
  rose: {
    bg: 'from-rose-50 to-rose-100',
    text: 'text-rose-900',
    border: 'border-rose-200',
    accent: 'bg-rose-500',
    hover: 'hover:bg-rose-200',
    shadow: 'shadow-rose-200/50'
  },
  amber: {
    bg: 'from-amber-50 to-amber-100',
    text: 'text-amber-900',
    border: 'border-amber-200',
    accent: 'bg-amber-500',
    hover: 'hover:bg-amber-200',
    shadow: 'shadow-amber-200/50'
  },
  emerald: {
    bg: 'from-emerald-50 to-emerald-100',
    text: 'text-emerald-900',
    border: 'border-emerald-200',
    accent: 'bg-emerald-500',
    hover: 'hover:bg-emerald-200',
    shadow: 'shadow-emerald-200/50'
  },
  violet: {
    bg: 'from-violet-50 to-violet-100',
    text: 'text-violet-900',
    border: 'border-violet-200',
    accent: 'bg-violet-500',
    hover: 'hover:bg-violet-200',
    shadow: 'shadow-violet-200/50'
  },
  cyan: {
    bg: 'from-cyan-50 to-cyan-100',
    text: 'text-cyan-900',
    border: 'border-cyan-200',
    accent: 'bg-cyan-500',
    hover: 'hover:bg-cyan-200',
    shadow: 'shadow-cyan-200/50'
  }
};

const MAX_CHARS = 300;

export default function StackCards({
  title,
  colorScheme,
  isCollapsed,
  onToggleCollapse,
  onConvertToNote,
  onConvertToTask,
  onConvertToGoal
}: StackCardsProps) {
  const [cards, setCards] = useState<Card[]>([
    { id: '1', content: 'Welcome to Stack Cards! These are quick, glanceable thinking cards for review and revision.', order_index: 0 },
    { id: '2', content: 'Each card has a 300 character limit. Keep them short, focused, and easy to digest at a glance.', order_index: 1 },
    { id: '3', content: 'Scroll or use arrow buttons to flick through cards. The stack animates smoothly as you navigate.', order_index: 2 }
  ]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showConvertMenu, setShowConvertMenu] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  const colors = colorSchemes[colorScheme];

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();

    if (isAnimating || isCollapsed) return;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      if (e.deltaY > 0 && activeIndex < cards.length - 1) {
        navigateCard(1);
      } else if (e.deltaY < 0 && activeIndex > 0) {
        navigateCard(-1);
      }
    }, 50);
  };

  const navigateCard = (direction: number) => {
    if (isAnimating) return;

    const newIndex = activeIndex + direction;
    if (newIndex >= 0 && newIndex < cards.length) {
      setIsAnimating(true);
      setActiveIndex(newIndex);
      setTimeout(() => setIsAnimating(false), 400);
    }
  };

  const addCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newCard: Card = {
      id: Date.now().toString(),
      content: '',
      order_index: cards.length
    };
    setCards([...cards, newCard]);
    setActiveIndex(cards.length);
    setIsEditing(true);
    setEditContent('');
  };

  const deleteCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cards.length <= 1) return;

    const newCards = cards.filter((_, idx) => idx !== activeIndex);
    newCards.forEach((card, idx) => card.order_index = idx);
    setCards(newCards);
    setActiveIndex(Math.max(0, activeIndex - 1));
  };

  const duplicateCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentCard = cards[activeIndex];
    const newCard: Card = {
      id: Date.now().toString(),
      content: currentCard.content,
      order_index: cards.length
    };
    setCards([...cards, newCard]);
    setActiveIndex(cards.length);
  };

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditContent(cards[activeIndex].content);
  };

  const saveEdit = () => {
    const newCards = [...cards];
    newCards[activeIndex].content = editContent;
    setCards(newCards);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
    } else if (e.key === 'Enter' && e.metaKey) {
      saveEdit();
    }
  };

  const handleConvert = (type: 'note' | 'task' | 'goal', e: React.MouseEvent) => {
    e.stopPropagation();
    const content = cards[activeIndex].content;

    if (type === 'note' && onConvertToNote) {
      onConvertToNote(content);
    } else if (type === 'task' && onConvertToTask) {
      onConvertToTask(content);
    } else if (type === 'goal' && onConvertToGoal) {
      onConvertToGoal(content);
    }

    setShowConvertMenu(false);
  };

  if (isCollapsed) {
    return (
      <div className="w-20 h-20 bg-white rounded-2xl shadow-lg border-2 border-slate-200 flex items-center justify-center group cursor-pointer hover:shadow-xl transition-all">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          className="flex flex-col items-center gap-1"
        >
          <Layers className={`w-6 h-6 ${colors.text}`} />
          <span className="text-xs text-slate-600 font-medium">{cards.length}</span>
        </button>
      </div>
    );
  }

  const currentCard = cards[activeIndex];

  return (
    <div
      onWheel={handleWheel}
      className="w-80 bg-white rounded-3xl shadow-2xl border-2 border-slate-200 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`${colors.accent} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-white" />
          <span className="text-white font-semibold">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowConvertMenu(!showConvertMenu);
            }}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors relative"
            title="Convert to..."
          >
            <Target className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {showConvertMenu && (
        <div className="absolute right-0 top-12 bg-white rounded-xl shadow-xl border-2 border-slate-200 p-2 z-50 min-w-[140px]">
          <button
            onClick={(e) => handleConvert('note', e)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors text-left"
          >
            <StickyNote className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-slate-700">To Note</span>
          </button>
          <button
            onClick={(e) => handleConvert('task', e)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors text-left"
          >
            <CheckSquare className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-slate-700">To Task</span>
          </button>
          <button
            onClick={(e) => handleConvert('goal', e)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors text-left"
          >
            <Target className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-slate-700">To Goal</span>
          </button>
        </div>
      )}

      <div className="p-6 relative h-80">
        <div className="relative h-full perspective-1000">
          {cards.map((card, index) => {
            const offset = index - activeIndex;
            const isActive = index === activeIndex;

            return (
              <div
                key={card.id}
                className={`absolute inset-0 rounded-2xl border-2 ${colors.border} bg-gradient-to-br ${colors.bg} ${colors.shadow} transition-all duration-400 ease-out`}
                style={{
                  transform: `
                    translateY(${offset * -8}px)
                    translateX(${offset * 4}px)
                    scale(${isActive ? 1 : 0.95 - Math.abs(offset) * 0.05})
                    rotateX(${offset * -2}deg)
                  `,
                  zIndex: cards.length - Math.abs(offset),
                  opacity: Math.abs(offset) > 2 ? 0 : 1 - Math.abs(offset) * 0.2,
                  pointerEvents: isActive ? 'auto' : 'none'
                }}
              >
                {isActive && (
                  <div className="h-full flex flex-col p-6">
                    {isEditing ? (
                      <div className="flex-1 flex flex-col gap-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => {
                            if (e.target.value.length <= MAX_CHARS) {
                              setEditContent(e.target.value);
                            }
                          }}
                          onKeyDown={handleKeyDown}
                          onBlur={saveEdit}
                          autoFocus
                          className={`flex-1 bg-white/50 border-2 ${colors.border} rounded-xl p-4 ${colors.text} resize-none focus:outline-none focus:ring-2 focus:ring-offset-2`}
                          placeholder="Type your card content..."
                        />
                        <div className="flex justify-between items-center">
                          <span className={`text-xs ${editContent.length >= MAX_CHARS ? 'text-red-600' : 'text-slate-500'}`}>
                            {editContent.length} / {MAX_CHARS}
                          </span>
                          <button
                            onClick={saveEdit}
                            className={`px-3 py-1 ${colors.accent} text-white rounded-lg text-xs font-medium hover:opacity-90`}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={startEditing}
                        className={`flex-1 ${colors.text} text-base leading-relaxed cursor-text hover:bg-white/30 rounded-lg p-4 transition-colors flex items-center justify-center text-center`}
                      >
                        {card.content || 'Click to edit...'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-6 pb-6 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={addCard}
            className={`p-2 ${colors.hover} rounded-lg transition-colors ${colors.text}`}
            title="Add card"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={duplicateCard}
            className={`p-2 ${colors.hover} rounded-lg transition-colors ${colors.text}`}
            title="Duplicate card"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={deleteCard}
            disabled={cards.length <= 1}
            className={`p-2 ${colors.hover} rounded-lg transition-colors ${colors.text} disabled:opacity-30 disabled:cursor-not-allowed`}
            title="Delete card"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateCard(-1);
            }}
            disabled={activeIndex === 0}
            className={`p-2 ${colors.hover} rounded-lg transition-colors ${colors.text} disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className={`text-sm font-medium ${colors.text}`}>
            {activeIndex + 1} / {cards.length}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateCard(1);
            }}
            disabled={activeIndex === cards.length - 1}
            className={`p-2 ${colors.hover} rounded-lg transition-colors ${colors.text} disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
