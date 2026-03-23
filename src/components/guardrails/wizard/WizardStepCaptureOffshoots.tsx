import { useState } from 'react';
import { Plus, X, Lightbulb, Zap } from 'lucide-react';

interface OffshootIdea {
  id: string;
  title: string;
  description: string;
}

interface Props {
  offshoots: OffshootIdea[];
  onOffshootsChange: (offshoots: OffshootIdea[]) => void;
}

export function WizardStepCaptureOffshoots({ offshoots, onOffshootsChange }: Props) {
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleAdd() {
    if (!newTitle.trim()) return;

    const newOffshoot: OffshootIdea = {
      id: Math.random().toString(36).substring(7),
      title: newTitle.trim(),
      description: newDescription.trim(),
    };

    onOffshootsChange([...offshoots, newOffshoot]);
    setNewTitle('');
    setNewDescription('');
  }

  function handleRemove(id: string) {
    onOffshootsChange(offshoots.filter(o => o.id !== id));
  }

  function handleUpdate(id: string, title: string, description: string) {
    onOffshootsChange(
      offshoots.map(o =>
        o.id === id ? { ...o, title, description } : o
      )
    );
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
          <Zap size={32} className="text-orange-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Capture Early Offshoot Ideas
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Got some side ideas or tangential thoughts? Capture them now so they don't distract you later.
          You can review and organize these in Mind Mesh or convert them to tracks when ready.
        </p>
      </div>

      <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <Lightbulb size={20} className="text-orange-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-orange-900 mb-1">What are Offshoot Ideas?</h3>
            <p className="text-sm text-orange-800">
              Offshoots are ideas that sit outside your main project tracks. They might be:
            </p>
            <ul className="text-sm text-orange-800 mt-2 space-y-1 list-disc list-inside">
              <li>Related features for later</li>
              <li>Experimental concepts to explore</li>
              <li>Adjacent opportunities</li>
              <li>Things you want to remember but not act on now</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Add Offshoot Ideas (Optional)</h3>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Idea Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTitle.trim()) {
                  handleAdd();
                }
              }}
              placeholder="e.g., Add dark mode, Explore AI integration, Mobile app version"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              placeholder="Quick notes about this idea..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={!newTitle.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={18} />
            Add Offshoot
          </button>
        </div>

        {offshoots.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h4 className="font-medium text-gray-900 mb-3">
              Captured Offshoots ({offshoots.length})
            </h4>
            <div className="space-y-3">
              {offshoots.map(offshoot => (
                <div
                  key={offshoot.id}
                  className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4"
                >
                  {editingId === offshoot.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        defaultValue={offshoot.title}
                        onBlur={(e) =>
                          handleUpdate(offshoot.id, e.target.value, offshoot.description)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        autoFocus
                      />
                      <textarea
                        defaultValue={offshoot.description}
                        onBlur={(e) =>
                          handleUpdate(offshoot.id, offshoot.title, e.target.value)
                        }
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => setEditingId(offshoot.id)}
                      >
                        <h5 className="font-medium text-gray-900 mb-1">{offshoot.title}</h5>
                        {offshoot.description && (
                          <p className="text-sm text-gray-600">{offshoot.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemove(offshoot.id)}
                        className="text-gray-400 hover:text-red-600 flex-shrink-0"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Pro tip:</strong> Don't overthink it! Capture anything that comes to mind.
          You can always refine, convert, or archive these later in Mind Mesh.
        </p>
      </div>
    </div>
  );
}
