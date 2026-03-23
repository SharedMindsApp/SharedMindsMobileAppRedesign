import { useState, useEffect } from 'react';
import { Heart, Plus, Lock, Users, Trash2, Pin } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { motivationService, type MotivationItem } from '../../../lib/personalDevelopmentService';

export function MotivationBoardView() {
  const { user } = useAuth();
  const [items, setItems] = useState<MotivationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    item_type: 'quote' as const,
    content: '',
    is_private: true
  });

  useEffect(() => {
    if (user) {
      loadItems();
    }
  }, [user]);

  const loadItems = async () => {
    if (!user) return;
    try {
      const data = await motivationService.getAll(user.id);
      setItems(data);
    } catch (error) {
      console.error('Error loading motivation items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!user || !newItem.content.trim()) return;

    try {
      await motivationService.create({
        user_id: user.id,
        space_id: null,
        item_type: newItem.item_type,
        content: newItem.content,
        position_x: 0,
        position_y: 0,
        is_pinned: false,
        display_order: items.length,
        is_private: newItem.is_private
      });

      setNewItem({
        item_type: 'quote',
        content: '',
        is_private: true
      });
      setShowAddModal(false);
      loadItems();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to remove this item?')) return;

    try {
      await motivationService.delete(id);
      loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleTogglePin = async (item: MotivationItem) => {
    try {
      await motivationService.update(item.id, { is_pinned: !item.is_pinned });
      loadItems();
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const typeColors = {
    text: 'bg-blue-50 border-blue-200',
    quote: 'bg-purple-50 border-purple-200',
    image: 'bg-green-50 border-green-200',
    affirmation: 'bg-pink-50 border-pink-200'
  };

  const typeLabels = {
    text: 'Note',
    quote: 'Quote',
    image: 'Image',
    affirmation: 'Affirmation'
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-slate-600">Loading motivation board...</div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Motivation Board</h2>
          <p className="text-slate-600 mt-1">Visual inspiration and emotional grounding</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <Heart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Your board is empty</h3>
          <p className="text-slate-500 mb-4">Add quotes, affirmations, or notes that inspire you</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          >
            Add Your First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={`relative p-6 rounded-xl border-2 ${typeColors[item.item_type]} hover:shadow-md transition-shadow`}
            >
              {item.is_pinned && (
                <div className="absolute top-3 right-3">
                  <Pin className="w-4 h-4 text-pink-500 fill-pink-500" />
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-medium text-slate-600">{typeLabels[item.item_type]}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePin(item)}
                    className="p-1 text-slate-400 hover:text-pink-500 transition-colors"
                  >
                    <Pin className={`w-4 h-4 ${item.is_pinned ? 'fill-pink-500 text-pink-500' : ''}`} />
                  </button>
                  {item.is_private ? (
                    <Lock className="w-4 h-4 text-slate-400" />
                  ) : (
                    <Users className="w-4 h-4 text-pink-500" />
                  )}
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                {item.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
            <h3 className="text-2xl font-bold text-slate-800 mb-6">Add Motivation Item</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type
                </label>
                <select
                  value={newItem.item_type}
                  onChange={(e) => setNewItem({ ...newItem, item_type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  <option value="quote">Quote</option>
                  <option value="affirmation">Affirmation</option>
                  <option value="text">Note</option>
                  <option value="image">Image</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Content *
                </label>
                <textarea
                  value={newItem.content}
                  onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent h-32"
                  placeholder="Enter your quote, affirmation, or note..."
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <input
                  type="checkbox"
                  id="private"
                  checked={newItem.is_private}
                  onChange={(e) => setNewItem({ ...newItem, is_private: e.target.checked })}
                  className="w-4 h-4 text-pink-500 rounded"
                />
                <label htmlFor="private" className="text-sm text-slate-700 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Keep this item private
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                disabled={!newItem.content.trim()}
                className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
