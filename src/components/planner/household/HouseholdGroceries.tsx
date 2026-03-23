import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Check, X, Search, Filter, Trash2, Edit, User, ShoppingBag, CheckCircle2, RefreshCcw, Sparkles, Zap, Package, ChevronRight, TrendingUp, Clock, DollarSign, Repeat, Archive } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { PlannerShell } from '../PlannerShell';
import * as groceryService from '../../../lib/intelligentGrocery';
import type { GroceryItem, GroceryTemplate, SmartSuggestion } from '../../../lib/intelligentGrocery';

type CategoryType = 'produce' | 'dairy' | 'meat' | 'bakery' | 'pantry' | 'frozen' | 'beverages' | 'snacks' | 'household' | 'other';

const CATEGORIES: { value: CategoryType; label: string; emoji: string }[] = [
  { value: 'produce', label: 'Produce', emoji: '🥬' },
  { value: 'dairy', label: 'Dairy', emoji: '🥛' },
  { value: 'meat', label: 'Meat & Seafood', emoji: '🥩' },
  { value: 'bakery', label: 'Bakery', emoji: '🍞' },
  { value: 'pantry', label: 'Pantry', emoji: '🥫' },
  { value: 'frozen', label: 'Frozen', emoji: '❄️' },
  { value: 'beverages', label: 'Beverages', emoji: '🥤' },
  { value: 'snacks', label: 'Snacks', emoji: '🍿' },
  { value: 'household', label: 'Household', emoji: '🧹' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

export function HouseholdGroceries() {
  const { user } = useAuth();
  const [householdId, setHouseholdId] = useState<string>('');
  const [memberId, setMemberId] = useState<string>('');
  const [memberName, setMemberName] = useState<string>('');
  const [listId, setListId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'category'>('all');
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [searchTemplates, setSearchTemplates] = useState<GroceryTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  // Form state
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState<CategoryType>('other');
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDays, setRecurrenceDays] = useState(7);
  const [estimatedPrice, setEstimatedPrice] = useState('');

  useEffect(() => {
    loadHousehold();
  }, [user]);

  useEffect(() => {
    if (householdId) {
      loadList();
      loadSmartSuggestions();
    }
  }, [householdId]);

  useEffect(() => {
    if (listId) {
      loadItems();
    }
  }, [listId]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery.length > 1) {
        searchForTemplates();
      } else {
        setSearchTemplates([]);
        setShowTemplates(false);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  async function loadHousehold() {
    if (!user) return;

    try {
      const { supabase } = await import('../../../lib/supabase');
      const { data, error } = await supabase
        .from('household_members')
        .select('household_id, id, name')
        .eq('auth_user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setHouseholdId(data.household_id || '');
        setMemberId(data.id || '');
        setMemberName(data.name || 'Unknown');
      }
    } catch (error) {
      console.error('Failed to load household:', error);
    }
  }

  async function loadList() {
    try {
      const list = await groceryService.getOrCreateDefaultList(
        householdId,
        memberId || undefined
      );
      setListId(list.id);
    } catch (error) {
      console.error('Failed to load list:', error);
    }
  }

  async function loadItems() {
    setLoading(true);
    try {
      const data = await groceryService.getGroceryItems(householdId, listId || undefined);
      setItems(data);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSmartSuggestions() {
    try {
      const suggestions = await groceryService.getSmartSuggestions(householdId, 15);
      setSmartSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  }

  async function searchForTemplates() {
    try {
      const templates = await groceryService.searchTemplates(searchQuery, 8);
      setSearchTemplates(templates);
      setShowTemplates(templates.length > 0);
    } catch (error) {
      console.error('Failed to search templates:', error);
    }
  }

  async function handleSaveItem() {
    if (!itemName.trim()) return;

    try {
      if (editingItem) {
        await groceryService.updateGroceryItem(editingItem.id, {
          item_name: itemName,
          quantity: quantity || null,
          category: category,
          notes: notes || null,
          is_recurring: isRecurring,
          recurrence_days: isRecurring ? recurrenceDays : null,
          estimated_price: estimatedPrice ? parseFloat(estimatedPrice) : null,
        });
      } else {
        await groceryService.addGroceryItem({
          householdId,
          listId: listId || undefined,
          itemName,
          quantity: quantity || undefined,
          category,
          notes: notes || undefined,
          isRecurring,
          recurrenceDays: isRecurring ? recurrenceDays : undefined,
          estimatedPrice: estimatedPrice ? parseFloat(estimatedPrice) : undefined,
          memberId: memberId || undefined,
          memberName: memberName || undefined,
        });
      }

      await loadItems();
      resetForm();
    } catch (error) {
      console.error('Failed to save item:', error);
    }
  }

  async function handleToggleCheck(itemId: string, currentChecked: boolean) {
    try {
      await groceryService.toggleItemChecked(itemId, !currentChecked);
      await loadItems();
    } catch (error) {
      console.error('Failed to toggle check:', error);
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm('Remove this item from the list?')) return;

    try {
      await groceryService.deleteGroceryItem(itemId);
      await loadItems();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  }

  async function handleClearCompleted() {
    if (!confirm('Remove all checked items from the list?')) return;

    try {
      await groceryService.clearCheckedItems(householdId, listId || undefined);
      await loadItems();
    } catch (error) {
      console.error('Failed to clear completed:', error);
    }
  }

  async function handleAddFromTemplate(template: GroceryTemplate) {
    try {
      await groceryService.addFromTemplate(
        template,
        householdId,
        listId || undefined,
        memberId || undefined,
        memberName || undefined
      );
      await loadItems();
      setSearchQuery('');
      setShowTemplates(false);
    } catch (error) {
      console.error('Failed to add from template:', error);
    }
  }

  async function handleAddSuggestion(suggestion: SmartSuggestion) {
    try {
      await groceryService.addGroceryItem({
        householdId,
        listId: listId || undefined,
        itemName: suggestion.item_name,
        quantity: suggestion.typical_quantity || undefined,
        category: suggestion.category as CategoryType,
        source: 'suggestion',
        memberId: memberId || undefined,
        memberName: memberName || undefined,
      });
      await loadItems();
      await loadSmartSuggestions();
    } catch (error) {
      console.error('Failed to add suggestion:', error);
    }
  }

  async function handleBulkAddSuggestions() {
    if (!confirm(`Add all ${smartSuggestions.length} suggested items to your list?`)) return;

    try {
      await groceryService.bulkAddFromSuggestions(
        smartSuggestions,
        householdId,
        listId || undefined,
        memberId || undefined,
        memberName || undefined
      );
      await loadItems();
      await loadSmartSuggestions();
      setShowSmartSuggestions(false);
    } catch (error) {
      console.error('Failed to bulk add suggestions:', error);
    }
  }

  function resetForm() {
    setItemName('');
    setQuantity('');
    setCategory('other');
    setNotes('');
    setIsRecurring(false);
    setRecurrenceDays(7);
    setEstimatedPrice('');
    setEditingItem(null);
    setShowAddModal(false);
  }

  function handleEditItem(item: GroceryItem) {
    setEditingItem(item);
    setItemName(item.item_name);
    setQuantity(item.quantity || '');
    setCategory((item.category as CategoryType) || 'other');
    setNotes(item.notes || '');
    setIsRecurring(item.is_recurring);
    setRecurrenceDays(item.recurrence_days || 7);
    setEstimatedPrice(item.estimated_price ? item.estimated_price.toString() : '');
    setShowAddModal(true);
  }

  function filterItems(items: GroceryItem[]): GroceryItem[] {
    let filtered = items;

    if (searchQuery && !showTemplates) {
      filtered = filtered.filter(item =>
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (!showCompleted) {
      filtered = filtered.filter(item => !item.checked);
    }

    return filtered;
  }

  function groupItemsByCategory(items: GroceryItem[]): Record<string, GroceryItem[]> {
    const grouped: Record<string, GroceryItem[]> = {};
    CATEGORIES.forEach(cat => {
      grouped[cat.value] = [];
    });

    items.forEach(item => {
      const cat = item.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    return grouped;
  }

  const filteredItems = filterItems(items);
  const uncheckedCount = items.filter(i => !i.checked).length;
  const checkedCount = items.filter(i => i.checked).length;
  const groupedItems = groupItemsByCategory(filteredItems);
  const totalEstimatedCost = items
    .filter(i => !i.checked && i.estimated_price)
    .reduce((sum, i) => sum + (i.estimated_price || 0), 0);

  const getCategoryInfo = (categoryValue: string) => {
    return CATEGORIES.find(c => c.value === categoryValue) || CATEGORIES[CATEGORIES.length - 1];
  };

  return (
    <PlannerShell>
      <div className="h-full flex flex-col bg-emerald-50">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <ShoppingCart size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Smart Grocery List</h2>
                <p className="text-emerald-100 text-sm">
                  {uncheckedCount} items needed • {checkedCount} in cart
                  {totalEstimatedCost > 0 && ` • ~$${totalEstimatedCost.toFixed(2)}`}
                </p>
              </div>
            </div>

            {smartSuggestions.length > 0 && (
              <button
                onClick={() => setShowSmartSuggestions(true)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <Sparkles size={18} />
                {smartSuggestions.length} Smart Suggestions
              </button>
            )}
          </div>

          {/* View Mode Tabs */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setViewMode('all')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                viewMode === 'all'
                  ? 'bg-white text-emerald-600 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <ShoppingBag size={18} />
              All Items
            </button>
            <button
              onClick={() => setViewMode('category')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                viewMode === 'category'
                  ? 'bg-white text-emerald-600 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Filter size={18} />
              By Category
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or add items..."
              className="w-full pl-10 pr-4 py-2 bg-white/20 backdrop-blur text-white placeholder-white/60 rounded-lg focus:outline-none focus:bg-white/30 transition-colors"
            />

            {/* Template Suggestions Dropdown */}
            {showTemplates && searchTemplates.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border-2 border-emerald-200 z-50 max-h-80 overflow-y-auto">
                <div className="p-2 border-b border-gray-200 bg-emerald-50">
                  <p className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                    <Zap size={16} />
                    Quick Add Suggestions
                  </p>
                </div>
                {searchTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleAddFromTemplate(template)}
                    className="w-full px-4 py-3 hover:bg-emerald-50 transition-colors flex items-center justify-between text-left border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCategoryInfo(template.category).emoji}</span>
                      <div>
                        <p className="font-semibold text-gray-900">{template.item_name}</p>
                        <p className="text-sm text-gray-600">
                          {getCategoryInfo(template.category).label}
                          {template.typical_quantity && ` • ${template.typical_quantity}`}
                        </p>
                      </div>
                    </div>
                    <Plus size={20} className="text-emerald-600" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                showCompleted
                  ? 'bg-white text-emerald-600 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {showCompleted ? 'Hide Checked' : 'Show Checked'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-emerald-600 font-medium">Loading groceries...</div>
            </div>
          ) : (
            <>
              {/* Add Item Button */}
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full mb-6 px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Plus size={20} />
                Add Item to List
              </button>

              {/* Quick Actions */}
              {checkedCount > 0 && (
                <div className="mb-6 p-4 bg-white rounded-xl border-2 border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-emerald-600" />
                    <span className="text-gray-700 font-medium">
                      {checkedCount} {checkedCount === 1 ? 'item' : 'items'} in cart
                    </span>
                  </div>
                  <button
                    onClick={handleClearCompleted}
                    className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <RefreshCcw size={16} />
                    Clear Checked
                  </button>
                </div>
              )}

              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <ShoppingCart size={48} className="mb-4 text-gray-300" />
                  <p className="text-lg font-medium">
                    {searchQuery ? 'No items match your search' : 'No items on your list'}
                  </p>
                  <p className="text-sm">
                    {searchQuery ? 'Try a different search term' : 'Add items to start shopping'}
                  </p>
                </div>
              ) : viewMode === 'category' ? (
                /* Category View */
                <div className="space-y-6">
                  {CATEGORIES.map(cat => {
                    const categoryItems = groupedItems[cat.value];
                    if (categoryItems.length === 0) return null;

                    return (
                      <div key={cat.value}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">{cat.emoji}</span>
                          <h3 className="text-lg font-bold text-gray-900">{cat.label}</h3>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                            {categoryItems.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {categoryItems.map(item => (
                            <ItemCard
                              key={item.id}
                              item={item}
                              onToggleCheck={handleToggleCheck}
                              onEdit={handleEditItem}
                              onDelete={handleDeleteItem}
                              getCategoryInfo={getCategoryInfo}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* All Items View */
                <div className="space-y-2">
                  {filteredItems.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onToggleCheck={handleToggleCheck}
                      onEdit={handleEditItem}
                      onDelete={handleDeleteItem}
                      getCategoryInfo={getCategoryInfo}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-4 flex items-center justify-between sticky top-0">
              <h2 className="text-xl font-bold text-white">
                {editingItem ? 'Edit Item' : 'Add Item'}
              </h2>
              <button
                onClick={resetForm}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g., Milk, Bread, Eggs"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="text"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g., 2, 1 lb"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Est. Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={estimatedPrice}
                    onChange={(e) => setEstimatedPrice(e.target.value)}
                    placeholder="5.99"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`py-2 px-3 rounded-lg font-medium transition-all text-left flex items-center gap-2 ${
                        category === cat.value
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span className="text-lg">{cat.emoji}</span>
                      <span className="text-sm">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special notes..."
                  rows={2}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors resize-none"
                />
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Repeat size={16} className="text-emerald-600" />
                      <span className="font-semibold text-gray-900">Recurring Item</span>
                    </div>
                    <p className="text-sm text-gray-600">Auto-add this item regularly</p>
                  </div>
                </label>

                {isRecurring && (
                  <div className="mt-3 ml-8">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Every (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={recurrenceDays}
                      onChange={(e) => setRecurrenceDays(parseInt(e.target.value) || 7)}
                      className="w-32 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveItem}
                  disabled={!itemName.trim()}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Smart Suggestions Modal */}
      {showSmartSuggestions && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <Sparkles size={24} className="text-white" />
                <div>
                  <h2 className="text-xl font-bold text-white">Smart Suggestions</h2>
                  <p className="text-amber-100 text-sm">Based on your shopping history</p>
                </div>
              </div>
              <button
                onClick={() => setShowSmartSuggestions(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {smartSuggestions.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600">No suggestions yet. Keep shopping to build your history!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {smartSuggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-2xl">{getCategoryInfo(suggestion.category).emoji}</span>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{suggestion.item_name}</h4>
                            <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                              <span className="flex items-center gap-1">
                                <Package size={14} />
                                {getCategoryInfo(suggestion.category).label}
                              </span>
                              {suggestion.typical_quantity && (
                                <>
                                  <span>•</span>
                                  <span>{suggestion.typical_quantity}</span>
                                </>
                              )}
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
                                {suggestion.days_since_last_purchase} days ago
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddSuggestion(suggestion)}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Plus size={16} />
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {smartSuggestions.length > 0 && (
              <div className="border-t p-4 flex gap-3 flex-shrink-0">
                <button
                  onClick={() => setShowSmartSuggestions(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleBulkAddSuggestions}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all"
                >
                  Add All {smartSuggestions.length} Items
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </PlannerShell>
  );
}

// Item Card Component
interface ItemCardProps {
  item: GroceryItem;
  onToggleCheck: (id: string, currentChecked: boolean) => void;
  onEdit: (item: GroceryItem) => void;
  onDelete: (id: string) => void;
  getCategoryInfo: (categoryValue: string) => { value: CategoryType; label: string; emoji: string };
}

function ItemCard({ item, onToggleCheck, onEdit, onDelete, getCategoryInfo }: ItemCardProps) {
  const categoryInfo = getCategoryInfo(item.category || 'other');

  return (
    <div className={`bg-white rounded-lg p-4 shadow-sm border-2 transition-all ${
      item.checked
        ? 'border-gray-200 opacity-60'
        : 'border-emerald-100 hover:border-emerald-300'
    }`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggleCheck(item.id, item.checked)}
          className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
            item.checked
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-gray-300 hover:border-emerald-500'
          }`}
        >
          {item.checked && <Check size={16} className="text-white" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1">
              <h4 className={`font-semibold text-gray-900 ${item.checked ? 'line-through' : ''}`}>
                {item.item_name}
              </h4>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <span className="text-base">{categoryInfo.emoji}</span>
                <span>{categoryInfo.label}</span>
                {item.quantity && (
                  <>
                    <span>•</span>
                    <span className="font-medium">{item.quantity}</span>
                  </>
                )}
                {item.estimated_price && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <DollarSign size={14} />
                      {item.estimated_price.toFixed(2)}
                    </span>
                  </>
                )}
                {item.is_recurring && (
                  <>
                    <span>•</span>
                    <Repeat size={14} className="text-blue-500" title="Recurring item" />
                  </>
                )}
                {item.source === 'suggestion' && (
                  <>
                    <span>•</span>
                    <Sparkles size={14} className="text-amber-500" title="From suggestions" />
                  </>
                )}
              </div>
              {item.notes && (
                <p className="text-sm text-gray-500 mt-1 italic">{item.notes}</p>
              )}
              {item.added_by_name && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <User size={12} />
                  <span>{item.added_by_name}</span>
                </div>
              )}
            </div>
            {!item.checked && (
              <div className="flex gap-1">
                <button
                  onClick={() => onEdit(item)}
                  className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                  title="Edit item"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete item"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
