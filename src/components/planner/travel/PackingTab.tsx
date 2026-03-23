import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Plus, Check, X, Edit2, Trash2, ShoppingBag, User, Users, Loader2 } from 'lucide-react';
import * as travelService from '../../../lib/travelService';
import type { TripPackingList, TripPackingItem } from '../../../lib/travelService';
import { showToast } from '../../Toast';
import { ConfirmDialogInline } from '../../ConfirmDialogInline';

const PACKING_CATEGORIES = [
  { value: 'clothing', label: 'Clothing', icon: '👕' },
  { value: 'toiletries', label: 'Toiletries', icon: '🧴' },
  { value: 'documents', label: 'Documents', icon: '📄' },
  { value: 'electronics', label: 'Electronics', icon: '📱' },
  { value: 'medication', label: 'Medication', icon: '💊' },
  { value: 'other', label: 'Other', icon: '🎒' },
];

interface PackingTabProps {
  tripId: string;
  userId: string;
  canManage: boolean;
}

export function PackingTab({ tripId, userId, canManage }: PackingTabProps) {
  const { user } = useAuth();
  const [lists, setLists] = useState<TripPackingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [items, setItems] = useState<TripPackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TripPackingItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadPackingData();
  }, [tripId]);

  useEffect(() => {
    if (selectedListId) {
      loadItems(selectedListId);
    }
  }, [selectedListId]);

  async function loadPackingData() {
    try {
      setLoading(true);
      const packingLists = await travelService.getTripPackingLists(tripId);
      setLists(packingLists);

      // Select master list if available, otherwise first list
      const masterList = packingLists.find(list => list.is_master);
      if (masterList) {
        setSelectedListId(masterList.id);
      } else if (packingLists.length > 0) {
        setSelectedListId(packingLists[0].id);
      } else {
        // Create master list if none exists
        const newMasterList = await travelService.createPackingList({
          trip_id: tripId,
          name: 'Master List',
          owner_id: null,
          is_master: true,
          is_template: false,
        });
        setLists([newMasterList]);
        setSelectedListId(newMasterList.id);
      }
    } catch (error) {
      console.error('Error loading packing data:', error);
      showToast('error', 'Failed to load packing lists');
    } finally {
      setLoading(false);
    }
  }

  async function loadItems(listId: string) {
    try {
      const packingItems = await travelService.getPackingItems(listId);
      setItems(packingItems);
    } catch (error) {
      console.error('Error loading items:', error);
      showToast('error', 'Failed to load packing items');
    }
  }

  async function handleCreatePersonalList() {
    if (!user) return;

    try {
      const personalList = await travelService.createPackingList({
        trip_id: tripId,
        name: `${user.email?.split('@')[0] || 'My'}'s List`,
        owner_id: user.id,
        is_master: false,
        is_template: false,
      });
      setLists([...lists, personalList]);
      setSelectedListId(personalList.id);
      showToast('success', 'Personal list created');
    } catch (error) {
      console.error('Error creating personal list:', error);
      showToast('error', 'Failed to create personal list');
    }
  }

  async function handleSaveItem(formData: { name: string; category: string; quantity: number; notes?: string }) {
    if (!selectedListId) return;

    try {
      if (editingItem) {
        await travelService.updatePackingItem(editingItem.id, {
          item_name: formData.name,
          category: formData.category as any,
          quantity: formData.quantity,
          notes: formData.notes || null,
        });
        showToast('success', 'Item updated');
      } else {
        const maxOrderIndex = items.length > 0 ? Math.max(...items.map(i => i.order_index), 0) : 0;
        await travelService.createPackingItem({
          packing_list_id: selectedListId,
          item_name: formData.name,
          category: formData.category as any,
          quantity: formData.quantity,
          notes: formData.notes || null,
          packed: false,
          order_index: maxOrderIndex + 1,
        });
        showToast('success', 'Item added');
      }
      await loadItems(selectedListId);
      setShowAddModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving item:', error);
      showToast('error', 'Failed to save item');
    }
  }

  async function handleToggleReady(itemId: string, currentReady: boolean) {
    try {
      await travelService.updatePackingItem(itemId, {
        packed: !currentReady,
      });
      await loadItems(selectedListId!);
    } catch (error) {
      console.error('Error toggling ready status:', error);
      showToast('error', 'Failed to update item');
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      await travelService.deletePackingItem(itemId);
      await loadItems(selectedListId!);
      setDeleteConfirm(null);
      showToast('success', 'Item deleted');
    } catch (error) {
      console.error('Error deleting item:', error);
      showToast('error', 'Failed to delete item');
    }
  }

  const selectedList = lists.find(l => l.id === selectedListId);
  const isMasterList = selectedList?.is_master;
  const isPersonalList = selectedList?.owner_id === userId;

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, TripPackingItem[]>);

  const readyCount = items.filter(i => i.packed).length;
  const totalCount = items.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* List Selector & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-slate-700">List:</label>
          <select
            value={selectedListId || ''}
            onChange={(e) => setSelectedListId(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
          >
            {lists.map(list => (
              <option key={list.id} value={list.id}>
                {list.is_master ? '📋 Master' : '👤 ' + list.name}
              </option>
            ))}
          </select>
          {!lists.some(l => l.owner_id === userId && !l.is_master) && (
            <button
              onClick={handleCreatePersonalList}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-cyan-600 hover:text-cyan-700 border border-cyan-300 rounded-lg hover:bg-cyan-50 transition-colors"
            >
              <Plus size={14} />
              <span>Create Personal List</span>
            </button>
          )}
        </div>

        {canManage && (
          <button
            onClick={() => {
              setEditingItem(null);
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
          >
            <Plus size={16} />
            <span>Add Item</span>
          </button>
        )}
      </div>

      {/* Progress Summary */}
      {totalCount > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Progress</span>
            <span className="text-sm text-slate-600">{readyCount} / {totalCount} ready</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalCount > 0 ? (readyCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Packing Items by Category */}
      {items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No items yet</h3>
          <p className="text-sm text-gray-600 mb-6">Start adding items to your packing list</p>
          {canManage && (
            <button
              onClick={() => {
                setEditingItem(null);
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              <Plus size={18} />
              <span>Add First Item</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {PACKING_CATEGORIES.map(category => {
            const categoryItems = groupedItems[category.value] || [];
            if (categoryItems.length === 0) return null;

            return (
              <div key={category.value} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <span>{category.icon}</span>
                    <span>{category.label}</span>
                    <span className="text-xs text-gray-500 font-normal">({categoryItems.length})</span>
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {categoryItems.map(item => (
                    <div key={item.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Ready Toggle */}
                        <button
                          onClick={() => handleToggleReady(item.id, item.packed)}
                          disabled={!canManage && !isPersonalList}
                          className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                            item.packed
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-gray-400'
                          } ${(!canManage && !isPersonalList) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          title={item.packed ? 'Ready' : 'Not ready'}
                        >
                          {item.packed && <Check size={14} />}
                        </button>

                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className={`flex items-center gap-2 ${item.packed ? 'line-through text-gray-500' : 'text-slate-800'}`}>
                                <span className="font-medium">{item.item_name}</span>
                                {item.quantity > 1 && (
                                  <span className="text-xs text-gray-500">×{item.quantity}</span>
                                )}
                              </div>
                              {item.notes && (
                                <p className="text-xs text-gray-600 mt-1">{item.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        {(canManage || isPersonalList) && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setShowAddModal(true);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(item.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Item Modal */}
      {showAddModal && (
        <ItemModal
          item={editingItem}
          onSave={handleSaveItem}
          onClose={() => {
            setShowAddModal(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialogInline
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDeleteItem(deleteConfirm)}
          title="Delete Item"
          message="Are you sure you want to delete this item?"
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      )}
    </div>
  );
}

// Item Add/Edit Modal
function ItemModal({
  item,
  onSave,
  onClose,
}: {
  item: TripPackingItem | null;
  onSave: (data: { name: string; category: string; quantity: number; notes?: string }) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: item?.item_name || '',
    category: item?.category || 'other',
    quantity: item?.quantity || 1,
    notes: item?.notes || '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave({
      name: formData.name.trim(),
      category: formData.category,
      quantity: formData.quantity,
      notes: formData.notes.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            {item ? 'Edit Item' : 'Add Item'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Item Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Passport, Charger, Toothbrush..."
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                {PACKING_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quantity</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes (optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional details..."
                rows={2}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium text-sm"
              >
                {item ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
