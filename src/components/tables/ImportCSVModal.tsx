import { useState } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (name: string, csvContent: string) => void;
}

export function ImportCSVModal({ isOpen, onClose, onImport }: ImportCSVModalProps) {
  const [name, setName] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFileName(file.name);
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      if (!name) {
        setName(file.name.replace('.csv', ''));
      }
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && csvContent) {
      onImport(name.trim(), csvContent);
      setName('');
      setCsvContent('');
      setFileName('');
      setError('');
    }
  };

  const previewLines = csvContent.split('\n').slice(0, 5);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Upload size={20} className="text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Import CSV File</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-file-input"
              />
              <label
                htmlFor="csv-file-input"
                className="flex items-center justify-center gap-3 px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <FileText size={24} className="text-gray-400" />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">
                    {fileName || 'Click to select a CSV file'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    First row will be used as column headers
                  </p>
                </div>
              </label>
            </div>
            {error && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {csvContent && (
            <>
              <div>
                <label htmlFor="import-table-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Table Name
                </label>
                <input
                  id="import-table-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter a name for this table"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview (First 5 rows)
                </label>
                <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs text-gray-700 font-mono whitespace-pre">
                    {previewLines.join('\n')}
                  </pre>
                </div>
              </div>
            </>
          )}

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
              disabled={!name.trim() || !csvContent}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Import Table
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
