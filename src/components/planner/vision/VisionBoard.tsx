import { PlannerShell } from '../PlannerShell';
import { Image, Plus, Edit2, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getVisionBoardItems, createVisionBoardItem, updateVisionBoardItem, deleteVisionBoardItem, type VisionBoardItem } from '../../../lib/visionService';

export function VisionBoard() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<VisionBoardItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<VisionBoardItem | null>(null);
  const [formData, setFormData] = useState({
    image_url: '',
    caption: '',
    quote: '',
    position_x: 0,
    position_y: 0,
    width: 300,
    height: 300,
    is_visible: true
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await getVisionBoardItems();
      setItems(data);
    } catch (error) {
      console.error('Error loading board items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateVisionBoardItem(editingItem.id, formData);
      } else {
        await createVisionBoardItem(formData);
      }
      await loadItems();
      resetForm();
    } catch (error) {
      console.error('Error saving board item:', error);
      alert('Failed to save item. Please try again.');
    }
  };

  const handleEdit = (item: VisionBoardItem) => {
    setEditingItem(item);
    setFormData({
      image_url: item.image_url || '',
      caption: item.caption || '',
      quote: item.quote || '',
      position_x: item.position_x,
      position_y: item.position_y,
      width: item.width,
      height: item.height,
      is_visible: item.is_visible
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this item from your vision board?')) return;
    try {
      await deleteVisionBoardItem(id);
      await loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData({
      image_url: '',
      caption: '',
      quote: '',
      position_x: 0,
      position_y: 0,
      width: 300,
      height: 300,
      is_visible: true
    });
  };

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-7xl mx-auto p-8">
          <p className="text-slate-600">Loading...</p>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Image className="w-6 h-6 text-slate-700" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800">Vision Board</h1>
              </div>
              <p className="text-slate-600">Visual inspiration in a calm, private space</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl p-6 border border-slate-200 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              {editingItem ? 'Edit Board Item' : 'Add to Vision Board'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Optional. Link to an image that inspires you.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Caption
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                  value={formData.caption}
                  onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                  placeholder="A brief description or reminder"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Quote or Affirmation
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={3}
                  placeholder="A meaningful quote, phrase, or affirmation"
                  value={formData.quote}
                  onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800"
                >
                  {editingItem ? 'Update Item' : 'Add to Board'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <Image className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Your vision board is empty</h3>
            <p className="text-slate-600 mb-4">
              Digital, minimal visual inspiration without Pinterest overload
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800"
            >
              Add Your First Item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-xl overflow-hidden border border-slate-200 hover:shadow-lg transition-shadow">
                {item.image_url && (
                  <div className="aspect-square bg-slate-100 overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.caption || 'Vision board item'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="p-4">
                  {item.caption && (
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">{item.caption}</h3>
                  )}

                  {item.quote && (
                    <p className="text-sm text-slate-600 italic mb-4">"{item.quote}"</p>
                  )}

                  <div className="flex gap-2 pt-3 border-t border-slate-200">
                    <button
                      onClick={() => handleEdit(item)}
                      className="flex-1 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-600 text-center">
              This is your private space. No algorithms, no comparisons, just your vision.
            </p>
          </div>
        )}
      </div>
    </PlannerShell>
  );
}
