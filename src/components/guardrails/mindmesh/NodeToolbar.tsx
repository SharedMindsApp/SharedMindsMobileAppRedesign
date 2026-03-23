import { Plus, Download, Upload, SidebarIcon } from 'lucide-react';

interface Props {
  onCreateNode: () => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleSidebar: () => void;
  showSidebar: boolean;
}

export function NodeToolbar({ onCreateNode, onExport, onImport, onToggleSidebar, showSidebar }: Props) {
  return (
    <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
      <button
        onClick={onCreateNode}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
        title="Create Node"
      >
        <Plus size={18} />
        <span className="font-medium">New Node</span>
      </button>

      <button
        onClick={onExport}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
        title="Export Graph"
      >
        <Download size={18} />
      </button>

      <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-lg hover:bg-gray-50 transition-colors cursor-pointer">
        <Upload size={18} />
        <input
          type="file"
          accept=".json"
          onChange={onImport}
          className="hidden"
        />
      </label>

      <button
        onClick={onToggleSidebar}
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg shadow-lg transition-colors ${
          showSidebar
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white border-gray-300 hover:bg-gray-50'
        }`}
        title={showSidebar ? 'Hide Sidebar' : 'Show Sidebar'}
      >
        <SidebarIcon size={18} />
      </button>
    </div>
  );
}
