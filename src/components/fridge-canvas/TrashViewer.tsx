import { useState, useEffect } from 'react';
import { X, RotateCcw, Trash2 } from 'lucide-react';
import { FridgeWidget } from '../../lib/fridgeCanvasTypes';
import { getDeletedWidgets, restoreWidget, permanentlyDeleteWidget } from '../../lib/fridgeCanvas';

interface TrashViewerProps {
  householdId: string;
  onClose: () => void;
}

export function TrashViewer({ householdId, onClose }: TrashViewerProps) {
  const [deletedWidgets, setDeletedWidgets] = useState<FridgeWidget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeletedWidgets();
  }, [householdId]);

  const loadDeletedWidgets = async () => {
    try {
      setLoading(true);
      const widgets = await getDeletedWidgets(householdId);
      setDeletedWidgets(widgets);
    } catch (err) {
      console.error('Error loading trash:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (widgetId: string) => {
    try {
      await restoreWidget(widgetId);
      setDeletedWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    } catch (err) {
      console.error('Error restoring widget:', err);
    }
  };

  const handlePermanentDelete = async (widgetId: string) => {
    if (!confirm('Permanently delete this widget? This cannot be undone.')) return;

    try {
      await permanentlyDeleteWidget(widgetId);
      setDeletedWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    } catch (err) {
      console.error('Error deleting widget:', err);
    }
  };

  const getTimeRemaining = (deletedAt: string) => {
    const deletedTime = new Date(deletedAt).getTime();
    const expiryTime = deletedTime + 48 * 60 * 60 * 1000;
    const now = Date.now();
    const remaining = expiryTime - now;

    if (remaining <= 0) return 'Expired';

    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) return `${days}d ${remainingHours}h remaining`;
    return `${hours}h remaining`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Trash</h2>
            <p className="text-sm text-gray-600 mt-1">
              Deleted widgets are kept for 48 hours
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading trash...</div>
          ) : deletedWidgets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Trash2 size={48} className="mx-auto mb-4 opacity-30" />
              <p>Trash is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deletedWidgets.map((widget) => (
                <div
                  key={widget.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg border-2 border-gray-200 flex items-center justify-center text-2xl">
                    {widget.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {widget.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {widget.deleted_at && getTimeRemaining(widget.deleted_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestore(widget.id)}
                      className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                      title="Restore widget"
                    >
                      <RotateCcw size={18} />
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(widget.id)}
                      className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                      title="Delete permanently"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
