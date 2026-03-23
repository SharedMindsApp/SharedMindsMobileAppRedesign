import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { UserTool } from '../../../lib/guardrailsTypes';

interface AddToolModalProps {
  tool: UserTool | null;
  onClose: () => void;
  onSave: () => void;
}

export function AddToolModal({ tool, onClose, onSave }: AddToolModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tool) {
      setName(tool.name);
      setCategory(tool.category);
      setCost(tool.cost !== null ? tool.cost.toString() : '');
    }
  }, [tool]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const costValue = cost ? parseFloat(cost) : null;

      if (tool) {
        const { error } = await supabase
          .from('user_tools')
          .update({ name, category, cost: costValue })
          .eq('id', tool.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_tools')
          .insert({ user_id: user.id, name, category, cost: costValue });
        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (err) {
      console.error('Failed to save tool:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {tool ? 'Edit Tool' : 'Add Tool'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tool Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="e.g., Figma, VS Code, MacBook Pro"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="e.g., Software, Hardware, Service"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cost (Optional)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="e.g., 99.99"
            />
            <p className="text-xs text-gray-500 mt-1">How much did you pay for this tool</p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : tool ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
