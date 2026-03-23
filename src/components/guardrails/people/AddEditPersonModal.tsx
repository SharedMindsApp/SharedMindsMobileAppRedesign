import { useState, useEffect } from 'react';
import { X, Search, UserPlus } from 'lucide-react';
import { createPerson, updatePerson, checkPersonExistsInProject } from '../../../lib/guardrails/peopleService';
import { searchGlobalPeople } from '../../../lib/guardrails/globalPeopleService';
import type { Person, GlobalPerson } from '../../../lib/guardrails';

interface AddEditPersonModalProps {
  masterProjectId: string;
  person?: Person;
  onClose: () => void;
  onSave: () => void;
}

export function AddEditPersonModal({
  masterProjectId,
  person,
  onClose,
  onSave,
}: AddEditPersonModalProps) {
  const [name, setName] = useState(person?.name || '');
  const [email, setEmail] = useState(person?.email || '');
  const [role, setRole] = useState(person?.role || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalPerson[]>([]);
  const [selectedGlobalPerson, setSelectedGlobalPerson] = useState<GlobalPerson | null>(null);
  const [searching, setSearching] = useState(false);

  const isEditing = !!person;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  async function performSearch() {
    setSearching(true);
    try {
      const results = await searchGlobalPeople(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  }

  async function handleSelectGlobalPerson(globalPerson: GlobalPerson) {
    const exists = await checkPersonExistsInProject(masterProjectId, globalPerson.id);
    if (exists) {
      setError('This person is already in the project');
      return;
    }

    setSelectedGlobalPerson(globalPerson);
    setName(globalPerson.name);
    setEmail(globalPerson.email || '');
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  }

  function handleCreateNew() {
    setSelectedGlobalPerson(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address');
      return;
    }

    setSaving(true);

    try {
      if (isEditing) {
        await updatePerson(person.id, {
          name: name.trim(),
          email: email.trim() || undefined,
          role: role.trim() || undefined,
        });
      } else {
        await createPerson({
          masterProjectId,
          name: name.trim(),
          email: email.trim() || undefined,
          role: role.trim() || undefined,
          globalPersonId: selectedGlobalPerson?.id,
        });
      }
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save person');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Edit Person' : 'Add Person'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {!isEditing && !selectedGlobalPerson && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Existing People
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search by name or email..."
                />
              </div>
              {searching && (
                <div className="text-sm text-gray-500 mt-2">Searching...</div>
              )}
              {searchResults.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {searchResults.map((gp) => (
                    <button
                      key={gp.id}
                      type="button"
                      onClick={() => handleSelectGlobalPerson(gp)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{gp.name}</div>
                      {gp.email && (
                        <div className="text-xs text-gray-600">{gp.email}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <UserPlus size={16} />
                <span>Or create a new person below</span>
              </div>
            </div>
          )}

          {!isEditing && selectedGlobalPerson && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-blue-900">
                    Reusing: {selectedGlobalPerson.name}
                  </div>
                  {selectedGlobalPerson.email && (
                    <div className="text-xs text-blue-700">{selectedGlobalPerson.email}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Create New Instead
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="John Doe"
              required
              autoFocus={isEditing || !!selectedGlobalPerson}
              disabled={!!selectedGlobalPerson}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Editor, Reviewer, Designer, etc."
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional semantic role (not related to permissions)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="john@example.com"
              disabled={!!selectedGlobalPerson}
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional contact information
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Person'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
