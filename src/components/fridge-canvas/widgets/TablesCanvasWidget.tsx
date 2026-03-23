import { useState, useEffect } from 'react';
import { Table, Plus, ExternalLink, AlertCircle, Upload, FolderOpen } from 'lucide-react';
import { TablesContent, SizeMode } from '../../../lib/fridgeCanvasTypes';
import { supabase } from '../../../lib/supabase';
import { TableEditor } from '../../tables/TableEditor';

interface TablesCanvasWidgetProps {
  widgetId: string;
  content: TablesContent;
  sizeMode: SizeMode;
  spaceId: string;
  spaceType: 'personal' | 'shared';
  onUpdate: (content: TablesContent) => void;
  onNavigate?: (tableId: string) => void;
}

interface TableData {
  id: string;
  name: string;
  description: string | null;
  row_count?: number;
  column_count?: number;
}

export function TablesCanvasWidget({
  widgetId,
  content,
  sizeMode,
  spaceId,
  spaceType,
  onUpdate,
  onNavigate,
}: TablesCanvasWidgetProps) {
  const [table, setTable] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    loadTable();
  }, [content.tableId]);

  const loadTable = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!content.tableId) {
        setError('No table selected');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('tables')
        .select('*')
        .eq('id', content.tableId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError('Table not found');
        return;
      }

      setTable(data);

      const rowCount = data.row_count ?? 0;
      const columnCount = data.column_count ?? 0;

      if (rowCount !== content.rowCount || columnCount !== content.columnCount) {
        onUpdate({
          ...content,
          rowCount,
          columnCount,
        });
      }
    } catch (err) {
      console.error('Error loading table:', err);
      setError('Failed to load table');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTable = () => {
    setShowEditor(true);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !table) {
    return (
      <>
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-gray-500">
          {error === 'No table selected' ? (
            <>
              <Table size={32} className="mb-3 text-blue-400" />
              <p className="text-sm text-center mb-4 text-gray-700 font-medium">No table selected</p>
              <div className="flex flex-col gap-2 w-full max-w-[200px]">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  onClick={() => setShowEditor(true)}
                >
                  <FolderOpen size={16} />
                  Browse Tables
                </button>
                <button
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  onClick={() => setShowEditor(true)}
                >
                  <Plus size={16} />
                  Create Table
                </button>
                <button
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  onClick={() => setShowEditor(true)}
                >
                  <Upload size={16} />
                  Import CSV
                </button>
              </div>
            </>
          ) : (
            <>
              <AlertCircle size={32} className="mb-2 text-red-500" />
              <p className="text-sm text-center">{error || 'Table not found'}</p>
            </>
          )}
        </div>
        {showEditor && (
          <TableEditor
            spaceId={spaceId}
            spaceType={spaceType}
            initialTableId={content.tableId}
            onClose={() => {
              setShowEditor(false);
              loadTable();
            }}
            onTableSelect={(tableId) => {
              onUpdate({
                ...content,
                tableId,
              });
            }}
          />
        )}
      </>
    );
  }

  if (sizeMode === 'icon') {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Table size={24} className="text-blue-600" />
      </div>
    );
  }

  if (sizeMode === 'mini') {
    return (
      <button
        onClick={handleOpenTable}
        className="w-full h-full flex flex-col items-center justify-center p-3 hover:bg-blue-50 transition-colors group"
      >
        <Table size={32} className="text-blue-600 mb-2" />
        <p className="text-xs font-medium text-gray-900 line-clamp-2 text-center">{table.name}</p>
        <p className="text-xs text-gray-500 mt-1">
          {table.row_count ?? 0} rows, {table.column_count ?? 0} cols
        </p>
      </button>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{table.name}</h3>
          {table.description && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{table.description}</p>
          )}
        </div>
        <button
          onClick={handleOpenTable}
          className="ml-2 p-2 hover:bg-blue-100 rounded-lg transition-colors"
          title="Open table"
        >
          <ExternalLink size={16} className="text-blue-600" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full">
          <div className="grid grid-cols-3 gap-px bg-gray-200 text-xs">
            {Array.from({ length: Math.min(table.column_count ?? 0, 3) }).map((_, i) => (
              <div key={i} className="bg-gray-50 p-2 font-medium text-gray-700 truncate">
                Column {i + 1}
              </div>
            ))}
          </div>
          {sizeMode === 'large' || sizeMode === 'xlarge' ? (
            <div className="text-xs text-gray-400 p-3 text-center">
              {Array.from({ length: Math.min(table.row_count ?? 0, 3) }).map((_, i) => (
                <div key={i} className="grid grid-cols-3 gap-px bg-gray-100 mb-px">
                  {Array.from({ length: Math.min(table.column_count ?? 0, 3) }).map((_, j) => (
                    <div key={j} className="bg-white p-2">
                      ...
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>
          {table.row_count ?? 0} rows, {table.column_count ?? 0} columns
        </span>
        <button
          onClick={handleOpenTable}
          className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          Open <ExternalLink size={12} />
        </button>
      </div>

      {showEditor && (
        <TableEditor
          spaceId={spaceId}
          spaceType={spaceType}
          initialTableId={content.tableId}
          onClose={() => {
            setShowEditor(false);
            loadTable();
          }}
          onTableSelect={(tableId) => {
            onUpdate({
              ...content,
              tableId,
            });
          }}
        />
      )}
    </div>
  );
}
