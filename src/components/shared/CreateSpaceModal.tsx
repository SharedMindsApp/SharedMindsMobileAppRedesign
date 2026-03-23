/**
 * Create Space Modal Component
 * 
 * Unified creation flow for Households and Teams
 */

import { useState, useEffect } from 'react';
import { Home, Users, X, Plus, Mail } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { createHousehold, createTeam, canCreateHousehold, type CreateSpaceInput } from '../../lib/spaceCreation';
import { useActiveData } from '../../contexts/ActiveDataContext';
import { useToasts, showToast } from '../Toast';

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'household' | 'team';
  onSpaceCreated?: (spaceId: string, spaceName: string, type: 'household' | 'team') => void;
}

type Step = 'type' | 'details' | 'invites';

export function CreateSpaceModal({
  isOpen,
  onClose,
  defaultType,
  onSpaceCreated,
}: CreateSpaceModalProps) {
  const { setSpaceContext } = useActiveData();
  const [step, setStep] = useState<Step>(defaultType ? 'details' : 'type');
  const [spaceType, setSpaceType] = useState<'household' | 'team'>(defaultType || 'household');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [invites, setInvites] = useState<Array<{ email: string; role: 'admin' | 'member' }>>([]);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteRole, setNewInviteRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canCreate, setCanCreate] = useState<{ allowed: boolean; reason?: string } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setStep(defaultType ? 'details' : 'type');
      setSpaceType(defaultType || 'household');
      setName('');
      setDescription('');
      setInvites([]);
      setNewInviteEmail('');
      setError(null);
      
      // Check if user can create household
      if (spaceType === 'household' || !defaultType) {
        checkCanCreate();
      } else {
        setCanCreate({ allowed: true });
      }
    }
  }, [isOpen, defaultType, spaceType]);

  const checkCanCreate = async () => {
    const result = await canCreateHousehold();
    setCanCreate(result);
  };

  const handleTypeSelect = (type: 'household' | 'team') => {
    setSpaceType(type);
    if (type === 'household') {
      checkCanCreate();
    } else {
      setCanCreate({ allowed: true });
    }
    setStep('details');
  };

  const handleAddInvite = () => {
    if (!newInviteEmail.trim()) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newInviteEmail.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    if (invites.some(inv => inv.email.toLowerCase() === newInviteEmail.toLowerCase())) {
      setError('This email is already in the invite list');
      return;
    }

    setInvites([...invites, { email: newInviteEmail.trim(), role: newInviteRole }]);
    setNewInviteEmail('');
    setError(null);
  };

  const handleRemoveInvite = (index: number) => {
    setInvites(invites.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (name.length > 100) {
      setError('Name must be 100 characters or less');
      return;
    }

    if (!canCreate?.allowed) {
      setError(canCreate?.reason || 'Cannot create space');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const input: CreateSpaceInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        type: spaceType,
        invites: invites.length > 0 ? invites : undefined,
      };

      let result;
      if (spaceType === 'household') {
        result = await createHousehold(input);
      } else {
        result = await createTeam(input);
      }

      // Switch to the new space
      setSpaceContext('shared', result.spaceId);

      // Show success toast
      showToast(
        'success',
        `${spaceType === 'household' ? 'Household' : 'Team'} "${result.spaceName}" created successfully!`
      );

      // Call callback
      if (onSpaceCreated) {
        onSpaceCreated(result.spaceId, result.spaceName, spaceType);
      }

      // Close modal
      onClose();
    } catch (err) {
      console.error('Error creating space:', err);
      setError(err instanceof Error ? err.message : 'Failed to create space');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = name.trim().length > 0 && name.length <= 100 && canCreate?.allowed;

  // Mobile: Use BottomSheet
  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={step === 'type' ? 'Create Space' : step === 'details' ? `Create ${spaceType === 'household' ? 'Household' : 'Team'}` : 'Invite Members'}
        maxHeight="90vh"
        showCloseButton={true}
      >
        {renderContent()}
      </BottomSheet>
    );
  }

  // Desktop: Modal
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center safe-top safe-bottom">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900">
            {step === 'type' ? 'Create Space' : step === 'details' ? `Create ${spaceType === 'household' ? 'Household' : 'Team'}` : 'Invite Members'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );

  function renderContent() {
    if (step === 'type') {
      return (
        <div className="space-y-4">
          <p className="text-gray-600 mb-6">Choose the type of space you want to create:</p>
          
          <button
            onClick={() => handleTypeSelect('household')}
            className="w-full flex items-center gap-4 p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left min-h-[44px]"
          >
            <div className="p-3 bg-blue-50 rounded-lg">
              <Home size={24} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Household</h3>
              <p className="text-sm text-gray-600">For families and shared living spaces</p>
            </div>
          </button>

          <button
            onClick={() => handleTypeSelect('team')}
            className="w-full flex items-center gap-4 p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left min-h-[44px]"
          >
            <div className="p-3 bg-purple-50 rounded-lg">
              <Users size={24} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Team</h3>
              <p className="text-sm text-gray-600">For work teams, clubs, and groups</p>
            </div>
          </button>
        </div>
      );
    }

    if (step === 'details') {
      return (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type indicator */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            {spaceType === 'household' ? (
              <Home size={20} className="text-blue-600" />
            ) : (
              <Users size={20} className="text-purple-600" />
            )}
            <span className="font-medium text-gray-900">
              Creating a {spaceType === 'household' ? 'Household' : 'Team'}
            </span>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              {spaceType === 'household' ? 'Household' : 'Team'} Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder={`Enter ${spaceType === 'household' ? 'household' : 'team'} name`}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
              maxLength={100}
              required
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">{name.length}/100 characters</p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`What is this ${spaceType === 'household' ? 'household' : 'team'} for?`}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              maxLength={500}
            />
            <p className="mt-1 text-xs text-gray-500">{description.length}/500 characters</p>
          </div>

          {/* Invite Members Section */}
          <div className="border-t border-gray-200 pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Invite Members (optional)
            </label>
            <p className="text-xs text-gray-500 mb-4">
              Add members now or invite them later from the space settings
            </p>

            {/* Add Invite Form */}
            <div className="flex gap-2 mb-4">
              <input
                type="email"
                value={newInviteEmail}
                onChange={(e) => {
                  setNewInviteEmail(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddInvite();
                  }
                }}
                placeholder="Enter email address"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
              />
              <select
                value={newInviteRole}
                onChange={(e) => setNewInviteRole(e.target.value as 'admin' | 'member')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="button"
                onClick={handleAddInvite}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium min-h-[44px] flex items-center gap-2"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Add</span>
              </button>
            </div>

            {/* Invite List */}
            {invites.length > 0 && (
              <div className="space-y-2 mb-4">
                {invites.map((invite, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Mail size={16} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-900 truncate">{invite.email}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 flex-shrink-0">
                        {invite.role}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveInvite(index)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Remove invite"
                    >
                      <X size={16} className="text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Limit warning */}
          {!canCreate?.allowed && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">{canCreate?.reason}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canProceed || loading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      );
    }

    return null;
  }
}
