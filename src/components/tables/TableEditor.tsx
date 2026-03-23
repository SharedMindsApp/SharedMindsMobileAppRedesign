import { useState, useEffect, useRef } from 'react';
import { X, Plus, Download, Trash2, Edit2, Check } from 'lucide-react';
import { tablesService, Table, TableColumn, TableRow } from '../../lib/tablesService';
import { CreateTableModal } from './CreateTableModal';
import { ImportCSVModal } from './ImportCSVModal';

interface TableEditorProps {
  spaceId: string;
  spaceType: 'personal' | 'shared';
  initialTableId?: string;
  onClose: () => void;
  onTableSelect?: (tableId: string) => void;
}

export function TableEditor({ spaceId, spaceType, initialTableId, onClose, onTableSelect }: TableEditorProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [activeTableId, setActiveTableId] = useState<string | null>(initialTableId || null);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [cellValue, setCellValue] = useState('');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [tabName, setTabName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const cellInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTables();
  }, [spaceId]);

  useEffect(() => {
    if (activeTableId) {
      loadTableData(activeTableId);
    }
  }, [activeTableId]);

  useEffect(() => {
    if (editingCell && cellInputRef.current) {
      cellInputRef.current.focus();
    }
  }, [editingCell]);

  const loadTables = async () => {
    try {
      setLoading(true);
      const data = await tablesService.getTablesBySpace(spaceId);
      setTables(data);
      if (data.length > 0 && !activeTableId) {
        setActiveTableId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async (tableId: string) => {
    try {
      const [cols, rowData] = await Promise.all([
        tablesService.getColumns(tableId),
        tablesService.getRows(tableId),
      ]);
      setColumns(cols);
      setRows(rowData);
    } catch (error) {
      console.error('Failed to load table data:', error);
    }
  };

  const handleCreateTable = async (name: string, columnCount: number, rowCount: number) => {
    try {
      const table = await tablesService.createTable({
        spaceId,
        spaceType,
        name,
        columnCount,
        rowCount,
      });
      setTables([...tables, table]);
      setActiveTableId(table.id);
      setShowCreateModal(false);
      onTableSelect?.(table.id);
    } catch (error) {
      console.error('Failed to create table:', error);
    }
  };

  const handleImportCSV = async (name: string, csvContent: string) => {
    try {
      const table = await tablesService.importFromCSV(spaceId, spaceType, name, csvContent);
      setTables([...tables, table]);
      setActiveTableId(table.id);
      setShowImportModal(false);
      onTableSelect?.(table.id);
    } catch (error) {
      console.error('Failed to import CSV:', error);
    }
  };

  const handleExportCSV = async () => {
    if (!activeTableId) return;
    try {
      const csv = await tablesService.exportToCSV(activeTableId);
      const activeTable = tables.find(t => t.id === activeTableId);
      const fileName = `${activeTable?.name || 'table'}.csv`;

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Are you sure you want to delete this table? This cannot be undone.')) return;
    try {
      await tablesService.deleteTable(tableId);
      const newTables = tables.filter(t => t.id !== tableId);
      setTables(newTables);
      if (activeTableId === tableId) {
        setActiveTableId(newTables[0]?.id || null);
      }
    } catch (error) {
      console.error('Failed to delete table:', error);
    }
  };

  const handleCellClick = (rowId: string, columnId: string) => {
    const row = rows.find(r => r.id === rowId);
    const value = row?.data[columnId] || '';
    setCellValue(String(value));
    setEditingCell({ rowId, columnId });
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    try {
      await tablesService.updateCell(editingCell.rowId, editingCell.columnId, cellValue);
      const updatedRows = rows.map(row => {
        if (row.id === editingCell.rowId) {
          return {
            ...row,
            data: {
              ...row.data,
              [editingCell.columnId]: cellValue,
            },
          };
        }
        return row;
      });
      setRows(updatedRows);
      setEditingCell(null);
      setCellValue('');
    } catch (error) {
      console.error('Failed to save cell:', error);
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellSave();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setCellValue('');
    }
  };

  const handleAddRow = async () => {
    if (!activeTableId) return;
    try {
      const newRow = await tablesService.addRow(activeTableId);
      setRows([...rows, newRow]);
    } catch (error) {
      console.error('Failed to add row:', error);
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    try {
      await tablesService.deleteRow(rowId);
      setRows(rows.filter(r => r.id !== rowId));
    } catch (error) {
      console.error('Failed to delete row:', error);
    }
  };

  const handleUpdateColumnName = async (columnId: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await tablesService.updateColumn(columnId, { name: newName.trim() });
      setColumns(columns.map(c => c.id === columnId ? { ...c, name: newName.trim() } : c));
    } catch (error) {
      console.error('Failed to update column:', error);
    }
  };

  const handleRenameTab = async () => {
    if (!editingTabId || !tabName.trim()) return;
    try {
      await tablesService.updateTable(editingTabId, { name: tabName.trim() });
      setTables(tables.map(t => t.id === editingTabId ? { ...t, name: tabName.trim() } : t));
      setEditingTabId(null);
      setTabName('');
    } catch (error) {
      console.error('Failed to rename table:', error);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <>
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Tables</h2>
            {/* Phase 2D: Ensure close button is reachable and clear */}
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close table editor"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Plus size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tables Yet</h3>
            <p className="text-gray-600 mb-6 max-w-md">
              Create a new table or import a CSV file to get started with tracking and organizing your data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Create Table
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Import CSV
              </button>
            </div>
          </div>
        </div>
        <CreateTableModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTable}
        />
        <ImportCSVModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImportCSV}
        />
      </>
    );
  }

  const activeTable = tables.find(t => t.id === activeTableId);

  return (
    <>
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Tables</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={!activeTableId}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download size={16} />
              Export CSV
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              + New Table
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Import CSV
            </button>
            {/* Phase 2D: Ensure close button is reachable and clear */}
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close table editor"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-gray-50 overflow-x-auto">
          {tables.map(table => (
            <div key={table.id} className="relative group flex-shrink-0">
              {editingTabId === table.id ? (
                <div className="flex items-center gap-1 bg-white px-3 py-2 rounded-t-lg border-b-2 border-blue-600">
                  <input
                    type="text"
                    value={tabName}
                    onChange={(e) => setTabName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameTab();
                      if (e.key === 'Escape') { setEditingTabId(null); setTabName(''); }
                    }}
                    onBlur={handleRenameTab}
                    className="px-2 py-1 text-sm border border-gray-300 rounded"
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  onClick={() => setActiveTableId(table.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                    activeTableId === table.id
                      ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900'
                  }`}
                >
                  {table.name}
                  {activeTableId === table.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTabId(table.id);
                          setTabName(table.name);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTable(table.id);
                        }}
                        className="p-1 hover:bg-red-100 rounded text-red-600"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>

        {activeTable && (
          <div className="flex-1 overflow-auto">
            <div className="min-w-max">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="w-12 border border-gray-200 p-2 text-xs text-gray-500">#</th>
                    {columns.map((column, index) => (
                      <th
                        key={column.id}
                        className="border border-gray-200 p-2 text-left text-sm font-medium text-gray-700 min-w-[150px]"
                      >
                        <input
                          type="text"
                          defaultValue={column.name}
                          onBlur={(e) => {
                            if (e.target.value !== column.name) {
                              handleUpdateColumnName(column.id, e.target.value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          className="w-full bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
                        />
                      </th>
                    ))}
                    <th className="border border-gray-200 p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 p-2 text-xs text-gray-500 text-center bg-gray-50">
                        {rowIndex + 1}
                      </td>
                      {columns.map(column => {
                        const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;
                        const value = row.data[column.id] || '';
                        return (
                          <td
                            key={column.id}
                            className="border border-gray-200 p-0"
                            onClick={() => !isEditing && handleCellClick(row.id, column.id)}
                          >
                            {isEditing ? (
                              <input
                                ref={cellInputRef}
                                type="text"
                                value={cellValue}
                                onChange={(e) => setCellValue(e.target.value)}
                                onKeyDown={handleCellKeyDown}
                                onBlur={handleCellSave}
                                className="w-full h-full px-2 py-1 text-sm border-2 border-blue-500 outline-none"
                              />
                            ) : (
                              <div className="px-2 py-1 text-sm min-h-[32px] cursor-text">
                                {value}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="border border-gray-200 p-1 text-center">
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 p-4">
          <button
            onClick={handleAddRow}
            disabled={!activeTableId}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus size={16} />
            Add Row
          </button>
        </div>
      </div>

      <CreateTableModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateTable}
      />
      <ImportCSVModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportCSV}
      />
    </>
  );
}
