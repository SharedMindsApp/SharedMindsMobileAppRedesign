import { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Palette,
  GripVertical,
  Edit3,
} from 'lucide-react';
import {
  getStackCard,
  updateStackCard,
  deleteStackCard,
  createStackCardItem,
  updateStackCardItem,
  deleteStackCardItem,
  reorderStackCardItems,
  COLOR_SCHEMES,
  MAX_CARD_CHARACTERS,
  type StackCardWithItems,
  type StackCardItem,
  type ColorScheme,
} from '../../lib/stackCards';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';

interface StackCardsWidgetProps {
  stackId: string;
  onDelete?: () => void;
}

export function StackCardsWidget({
  stackId,
  onDelete,
}: StackCardsWidgetProps) {
  const { appTheme } = useUIPreferences();
  const isNeonMode = appTheme === 'neon-dark';
  const [stack, setStack] = useState<StackCardWithItems | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newCardColor, setNewCardColor] = useState<ColorScheme>('cyan');
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadStack();
  }, [stackId]);

  useEffect(() => {
    if (titleInputRef.current && editingCard) {
      titleInputRef.current.focus();
    }
  }, [editingCard]);

  async function loadStack() {
    try {
      setLoading(true);
      const data = await getStackCard(stackId);
      setStack(data);
      if (data && data.items.length > 0 && currentIndex >= data.items.length) {
        setCurrentIndex(data.items.length - 1);
      }
    } catch (error) {
      console.error('Failed to load stack:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCard() {
    if (!stack) return;

    try {
      await createStackCardItem({
        stack_id: stack.id,
        title: '',
        content: '',
        color_scheme: newCardColor,
        card_order: stack.items.length,
      });
      setIsAdding(false);
      await loadStack();
      setCurrentIndex(stack.items.length);
    } catch (error) {
      console.error('Failed to add card:', error);
    }
  }

  async function handleSaveCard(itemId: string) {
    try {
      await updateStackCardItem(itemId, {
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      setEditingCard(null);
      setEditTitle('');
      setEditContent('');
      await loadStack();
    } catch (error) {
      console.error('Failed to update card:', error);
    }
  }

  async function handleDeleteCard(itemId: string) {
    if (!stack) return;
    if (!confirm('Delete this card?')) return;

    try {
      await deleteStackCardItem(itemId);
      if (currentIndex >= stack.items.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
      await loadStack();
    } catch (error) {
      console.error('Failed to delete card:', error);
    }
  }

  async function handleChangeCardColor(itemId: string, colorScheme: ColorScheme) {
    try {
      await updateStackCardItem(itemId, { color_scheme: colorScheme });
      await loadStack();
      setShowColorPicker(null);
    } catch (error) {
      console.error('Failed to change color:', error);
    }
  }

  async function handleDeleteStack() {
    if (!confirm('Delete this entire stack? This cannot be undone.')) return;

    try {
      await deleteStackCard(stackId);
      onDelete?.();
    } catch (error) {
      console.error('Failed to delete stack:', error);
    }
  }

  function handleNavigate(direction: 'prev' | 'next') {
    if (!stack || isTransitioning) return;

    setIsTransitioning(true);
    setTimeout(() => {
      if (direction === 'prev' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (direction === 'next' && currentIndex < stack.items.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
      setIsTransitioning(false);
    }, 150);
  }

  function handleWheel(e: React.WheelEvent) {
    if (!stack || isTransitioning || editingCard) return;

    if (Math.abs(e.deltaY) > 10) {
      if (e.deltaY > 0 && currentIndex < stack.items.length - 1) {
        handleNavigate('next');
      } else if (e.deltaY < 0 && currentIndex > 0) {
        handleNavigate('prev');
      }
    }
  }

  async function handleDragStart(e: React.DragEvent, item: StackCardItem) {
    setDraggedItem(item.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  async function handleDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault();
    if (!stack || !draggedItem) return;

    const draggedIndex = stack.items.findIndex(item => item.id === draggedItem);
    if (draggedIndex === targetIndex) return;

    const newItems = [...stack.items];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, removed);

    try {
      await reorderStackCardItems(stack.id, newItems.map(item => item.id));
      await loadStack();
      setCurrentIndex(targetIndex);
    } catch (error) {
      console.error('Failed to reorder cards:', error);
    }

    setDraggedItem(null);
    setDragOverIndex(null);
  }

  function startEditing(card: StackCardItem) {
    setEditingCard(card.id);
    setEditTitle(card.title);
    setEditContent(card.content);
  }

  function cancelEditing() {
    setEditingCard(null);
    setEditTitle('');
    setEditContent('');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  if (!stack) {
    return (
      <div className="p-4 text-center text-gray-500">
        Stack not found
      </div>
    );
  }

  const currentCard = stack.items[currentIndex];
  const hasCards = stack.items.length > 0;

  return (
    <div className={`flex flex-col h-full ${
      isNeonMode
        ? 'neon-dark-widget'
        : 'bg-white rounded-xl'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-gray-500" />
          <h3 className="font-semibold text-gray-900 text-sm">{stack.title}</h3>
          <span className="text-xs text-gray-400 font-medium">
            {hasCards ? `${currentIndex + 1}/${stack.items.length}` : ''}
          </span>
        </div>
        <button
          onClick={handleDeleteStack}
          className="p-1 hover:bg-red-50 rounded transition-colors"
          title="Delete stack"
        >
          <Trash2 size={14} className="text-red-500" />
        </button>
      </div>

      {/* Main Card Display Area */}
      <div
        className="flex-1 p-6 relative overflow-hidden"
        onWheel={handleWheel}
      >
        {hasCards ? (
          <div className="relative h-full">
            {/* Stacked cards in background - cleaner design */}
            <div className="absolute inset-0 flex items-center justify-center">
              {stack.items.slice(currentIndex + 1, currentIndex + 4).map((item, idx) => {
                const colorScheme = COLOR_SCHEMES[item.color_scheme];
                const offset = (idx + 1) * 6;
                const scale = 1 - (idx + 1) * 0.03;
                return (
                  <div
                    key={`stack-${idx}`}
                    className={`absolute w-[88%] max-w-md h-[82%] ${colorScheme.bg} rounded-xl shadow-md`}
                    style={{
                      transform: `translateY(${offset}px) scale(${scale})`,
                      opacity: 0.5 - idx * 0.15,
                      zIndex: -idx - 1,
                      backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, rgba(0,0,0,0.06) 31px, rgba(0,0,0,0.06) 32px)`,
                    }}
                  />
                );
              })}
            </div>

            {/* Current Card */}
            {currentCard && (
              <div
                className={`relative h-full flex items-center justify-center transition-all duration-200 ${
                  isTransitioning ? 'scale-95 opacity-50' : 'scale-100 opacity-100'
                }`}
              >
                <div
                  className={`w-[88%] max-w-md h-[82%] ${COLOR_SCHEMES[currentCard.color_scheme].bg} rounded-xl shadow-xl border border-black/5 overflow-hidden relative`}
                  style={{
                    backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, rgba(0,0,0,0.08) 31px, rgba(0,0,0,0.08) 32px)`,
                  }}
                >
                  {/* Card Actions - integrated into card */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 z-20">
                    {!editingCard && (
                      <button
                        onClick={() => startEditing(currentCard)}
                        className={`p-2 ${COLOR_SCHEMES[currentCard.color_scheme].bg} hover:bg-white/90 rounded-lg transition-all shadow-sm border border-black/10`}
                        title="Edit card"
                      >
                        <Edit3 size={14} className="text-gray-700" />
                      </button>
                    )}
                    <button
                      onClick={() => setShowColorPicker(showColorPicker === currentCard.id ? null : currentCard.id)}
                      className={`p-2 ${COLOR_SCHEMES[currentCard.color_scheme].bg} hover:bg-white/90 rounded-lg transition-all shadow-sm border border-black/10`}
                      title="Change color"
                    >
                      <Palette size={14} className="text-gray-700" />
                    </button>
                    <button
                      onClick={() => handleDeleteCard(currentCard.id)}
                      className={`p-2 ${COLOR_SCHEMES[currentCard.color_scheme].bg} hover:bg-red-50 rounded-lg transition-all shadow-sm border border-black/10`}
                      title="Delete card"
                    >
                      <Trash2 size={14} className="text-red-600" />
                    </button>
                  </div>

                  {/* Color Picker */}
                  {showColorPicker === currentCard.id && (
                    <div className="absolute top-14 right-3 bg-white border border-gray-200 rounded-xl shadow-2xl p-2 z-30 grid grid-cols-3 gap-1.5">
                      {(Object.keys(COLOR_SCHEMES) as ColorScheme[]).map((color) => (
                        <button
                          key={color}
                          onClick={() => handleChangeCardColor(currentCard.id, color)}
                          className={`w-9 h-9 rounded-lg ${COLOR_SCHEMES[color].bg} hover:scale-110 transition-all shadow-sm ${
                            currentCard.color_scheme === color ? 'ring-2 ring-gray-900 ring-offset-1' : ''
                          }`}
                          title={COLOR_SCHEMES[color].name}
                        />
                      ))}
                    </div>
                  )}

                  {/* Card Content */}
                  <div className="relative h-full flex flex-col p-6 pt-16">
                    {editingCard === currentCard.id ? (
                      <>
                        {/* Edit Mode */}
                        <input
                          ref={titleInputRef}
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value.slice(0, 100))}
                          placeholder="Card title..."
                          className={`w-full ${COLOR_SCHEMES[currentCard.color_scheme].bg} ${COLOR_SCHEMES[currentCard.color_scheme].text} text-lg font-bold mb-3 px-2 py-1 rounded border-2 border-dashed border-gray-400 focus:border-gray-600 focus:outline-none bg-white/30`}
                        />
                        <textarea
                          ref={contentTextareaRef}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value.slice(0, MAX_CARD_CHARACTERS))}
                          placeholder="Type your card content..."
                          className={`flex-1 w-full ${COLOR_SCHEMES[currentCard.color_scheme].bg} ${COLOR_SCHEMES[currentCard.color_scheme].text} resize-none focus:outline-none text-sm leading-8 px-2 py-1 rounded border-2 border-dashed border-gray-400 focus:border-gray-600 bg-white/30`}
                        />
                        <div className="flex items-center justify-between pt-3">
                          <span className="text-xs text-gray-600 font-medium bg-white/60 px-2 py-1 rounded">
                            {editContent.length}/{MAX_CARD_CHARACTERS}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={cancelEditing}
                              className="px-3 py-1.5 text-xs text-gray-700 bg-white/80 hover:bg-white rounded-lg transition-colors shadow-sm font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveCard(currentCard.id)}
                              className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm font-medium"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* View Mode */}
                        <div className="mb-3">
                          {currentCard.title ? (
                            <h4 className={`${COLOR_SCHEMES[currentCard.color_scheme].text} text-lg font-bold leading-tight`}>
                              {currentCard.title}
                            </h4>
                          ) : (
                            <div className="text-gray-400 italic text-xs">No title</div>
                          )}
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          {currentCard.content ? (
                            <p className={`${COLOR_SCHEMES[currentCard.color_scheme].text} text-sm leading-8 whitespace-pre-wrap`}>
                              {currentCard.content}
                            </p>
                          ) : (
                            <div className="text-gray-400 italic text-xs">Click edit to add content</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Navigation Arrows - floating outside */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none" style={{ padding: '0 -12px' }}>
                  <button
                    onClick={() => handleNavigate('prev')}
                    disabled={currentIndex === 0}
                    className={`p-2.5 rounded-full bg-white shadow-lg pointer-events-auto transition-all ${
                      currentIndex === 0
                        ? 'opacity-0 cursor-not-allowed'
                        : 'hover:bg-gray-50 hover:scale-110 hover:shadow-xl'
                    }`}
                  >
                    <ChevronLeft size={20} className="text-gray-800" />
                  </button>
                  <button
                    onClick={() => handleNavigate('next')}
                    disabled={currentIndex === stack.items.length - 1}
                    className={`p-2.5 rounded-full bg-white shadow-lg pointer-events-auto transition-all ${
                      currentIndex === stack.items.length - 1
                        ? 'opacity-0 cursor-not-allowed'
                        : 'hover:bg-gray-50 hover:scale-110 hover:shadow-xl'
                    }`}
                  >
                    <ChevronRight size={20} className="text-gray-800" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Layers size={40} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm font-medium">No cards yet</p>
              <p className="text-gray-400 text-xs">Add your first card below</p>
            </div>
          </div>
        )}
      </div>

      {/* Card Thumbnails */}
      {hasCards && (
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {stack.items.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={() => {
                  setDraggedItem(null);
                  setDragOverIndex(null);
                }}
                className={`flex-shrink-0 w-11 h-14 ${COLOR_SCHEMES[item.color_scheme].bg} rounded-md shadow-sm cursor-pointer hover:scale-110 transition-all relative border ${
                  currentIndex === index ? 'border-gray-800 shadow-md scale-105' : 'border-black/10'
                } ${dragOverIndex === index ? 'ring-2 ring-blue-400' : ''}`}
                onClick={() => setCurrentIndex(index)}
                style={{
                  backgroundImage: `repeating-linear-gradient(transparent, transparent 5px, rgba(0,0,0,0.06) 5px, rgba(0,0,0,0.06) 6px)`,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                  <GripVertical size={10} className="text-gray-700" />
                </div>
                <div className="absolute bottom-0.5 right-0.5 bg-white/80 text-[8px] font-bold text-gray-700 rounded px-1 leading-tight">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Card Section - Simple Plus Icon */}
      <div className="border-t border-gray-100 px-4 py-3">
        {isAdding ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium text-gray-600">Color:</span>
              {(Object.keys(COLOR_SCHEMES) as ColorScheme[]).map((color) => (
                <button
                  key={color}
                  onClick={() => setNewCardColor(color)}
                  className={`w-7 h-7 rounded-md ${COLOR_SCHEMES[color].bg} hover:scale-110 transition-transform shadow-sm ${
                    newCardColor === color ? 'ring-2 ring-gray-900 ring-offset-1 scale-110' : ''
                  }`}
                  title={COLOR_SCHEMES[color].name}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCard}
                className="flex-1 px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Add Card
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium"
          >
            <Plus size={14} />
            <span>Add Card</span>
          </button>
        )}
      </div>
    </div>
  );
}
