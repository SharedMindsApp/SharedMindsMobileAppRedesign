import { useState } from 'react';
import { X, Table } from 'lucide-react';

interface CreateTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, columnCount: number, rowCount: number) => void;
}

export function CreateTableModal({ isOpen, onClose, onCreate }: CreateTableModalProps) {
  const [name, setName] = useState('');
  const [columnCount, setColumnCount] = useState(5);
  const [rowCount, setRowCount] = useState(10);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim(), columnCount, rowCount);
      setName('');
      setColumnCount(5);
      setRowCount(10);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Table size={20} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Create New Table</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="table-name" className="block text-sm font-medium text-gray-700 mb-2">
              Table Name
            </label>
            <input
              id="table-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Monthly Budget, Expense Tracker"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="column-count" className="block text-sm font-medium text-gray-700 mb-2">
                Columns
              </label>
              <input
                id="column-count"
                type="number"
                min="1"
                max="20"
                value={columnCount}
                onChange={(e) => setColumnCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="row-count" className="block text-sm font-medium text-gray-700 mb-2">
                Rows
              </label>
              <input
                id="row-count"
                type="number"
                min="1"
                max="100"
                value={rowCount}
                onChange={(e) => setRowCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              This will create a blank table with <span className="font-medium text-gray-900">{columnCount} columns</span> and{' '}
              <span className="font-medium text-gray-900">{rowCount} rows</span>. You can add more later.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Create Table
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
