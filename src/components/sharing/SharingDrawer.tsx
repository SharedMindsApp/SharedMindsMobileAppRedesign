/**
 * Universal Sharing Drawer
 * 
 * A reusable UI component for managing permissions on any entity.
 * Works via adapters - no hardcoded entity types.
 * 
 * Features:
 * - Slide-over drawer (mobile friendly)
 * - Tabs: Access | Visibility | Invites
 * - Search to add people (contacts + users) and groups/spaces
 * - Role, detail, and scope controls per grantee
 * - Effective access summary
 */

import { useState, useEffect } from 'react';
import { X, Search, UserPlus, Users, Mail, Trash2, ChevronDown } from 'lucide-react';
import type { ShareAdapter } from '../../lib/permissions/adapter';
import type {
  PermissionFlags,
  PermissionGrantWithDisplay,
  PermissionRole,
  PermissionSubjectType,
  DetailLevel,
  ShareScope,
} from '../../lib/permissions/types';
import { roleToFlags, flagsToRoleApprox } from '../../lib/permissions/types';
import { searchContacts } from '../../lib/contacts/contactsService';
import { supabase } from '../../lib/supabase';

type Tab = 'access' | 'visibility' | 'invites';

interface SharingDrawerProps {
  adapter: ShareAdapter;
  isOpen: boolean;
  onClose: () => void;
}

export function SharingDrawer({ adapter, isOpen, onClose }: SharingDrawerProps) {
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);
  const [activeTab, setActiveTab] = useState<Tab>('access');
  const [grants, setGrants] = useState<PermissionGrantWithDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityTitle, setEntityTitle] = useState<string>('');
  const [canManage, setCanManage] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    type: PermissionSubjectType;
    display_name: string;
    email?: string;
    avatar_url?: string;
  }>>([]);
  const [searching, setSearching] = useState(false);
  
  // New grant state
  const [selectedSubject, setSelectedSubject] = useState<{
    type: PermissionSubjectType;
    id: string;
    display_name: string;
  } | null>(null);
  const [newGrantRole, setNewGrantRole] = useState<PermissionRole>('viewer');
  const [newGrantDetail, setNewGrantDetail] = useState<DetailLevel>('detailed');
  const [newGrantScope, setNewGrantScope] = useState<ShareScope>('this_only');

  // Load data
  useEffect(() => {
    if (!isOpen || !adapter) return;
    
    loadData();
  }, [isOpen, adapter]);

  const loadData = async () => {
    if (!adapter) return;
    
    setLoading(true);
    try {
      const [title, currentGrants, manageCheck] = await Promise.all([
        adapter.getEntityTitle(),
        adapter.listGrants(),
        adapter.canManagePermissions(),
      ]);
      
      setEntityTitle(title);
      setGrants(currentGrants);
      setCanManage(manageCheck);
    } catch (err) {
      console.error('[SharingDrawer] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Search for contacts/users
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim() || !user) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      // Search contacts
      const contacts = await searchContacts(user.id, query);
      
      const results = contacts.map(contact => ({
        id: contact.id,
        type: 'contact' as PermissionSubjectType,
        display_name: contact.display_name,
        email: contact.email || undefined,
        avatar_url: contact.avatar_url || undefined,
      }));
      
      // TODO: Also search users/profiles if needed
      // For now, contacts only
      
      setSearchResults(results);
    } catch (err) {
      console.error('[SharingDrawer] Error searching:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddGrant = async () => {
    if (!selectedSubject || !adapter) return;
    
    try {
      const flags = roleToFlags(newGrantRole, {
        detail_level: newGrantDetail,
        scope: newGrantScope,
      });
      
      await adapter.upsertGrant({
        subject_type: selectedSubject.type,
        subject_id: selectedSubject.id,
        flags,
      });
      
      // Reload grants
      await loadData();
      
      // Reset form
      setSelectedSubject(null);
      setSearchQuery('');
      setSearchResults([]);
      setNewGrantRole('viewer');
      setNewGrantDetail('detailed');
      setNewGrantScope('this_only');
    } catch (err) {
      console.error('[SharingDrawer] Error adding grant:', err);
    }
  };

  const handleUpdateGrant = async (
    grantId: string,
    updates: Partial<PermissionFlags>
  ) => {
    if (!adapter) return;
    
    try {
      const grant = grants.find(g => g.id === grantId);
      if (!grant) return;
      
      const updatedFlags: PermissionFlags = {
        ...grant.flags,
        ...updates,
      };
      
      await adapter.upsertGrant({
        subject_type: grant.subject_type,
        subject_id: grant.subject_id,
        flags: updatedFlags,
      });
      
      await loadData();
    } catch (err) {
      console.error('[SharingDrawer] Error updating grant:', err);
    }
  };

  const handleRevokeGrant = async (
    subject_type: PermissionSubjectType,
    subject_id: string
  ) => {
    if (!adapter) return;
    
    try {
      await adapter.revokeGrant(subject_type, subject_id);
      await loadData();
    } catch (err) {
      console.error('[SharingDrawer] Error revoking grant:', err);
    }
  };

  if (!isOpen) return null;

  // Calculate effective access summary
  const effectiveAccess = grants.reduce((acc, grant) => {
    if (grant.flags.can_view) acc.can_view++;
    if (grant.flags.can_edit) acc.can_edit++;
    if (grant.flags.can_manage) acc.can_manage++;
    return acc;
  }, { can_view: 0, can_edit: 0, can_manage: 0 });

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Share {entityTitle}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage who can view and edit this {adapter.entityType}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Effective Access Summary */}
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-gray-600">Can view:</span>
              <span className="font-semibold ml-2">{effectiveAccess.can_view}</span>
            </div>
            <div>
              <span className="text-gray-600">Can edit:</span>
              <span className="font-semibold ml-2">{effectiveAccess.can_edit}</span>
            </div>
            <div>
              <span className="text-gray-600">Can manage:</span>
              <span className="font-semibold ml-2">{effectiveAccess.can_manage}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('access')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'access'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Access
          </button>
          <button
            onClick={() => setActiveTab('visibility')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'visibility'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Visibility
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'invites'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Invites
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-600">Loading...</div>
          ) : activeTab === 'access' ? (
            <AccessTab
              grants={grants}
              canManage={canManage}
              onUpdateGrant={handleUpdateGrant}
              onRevokeGrant={handleRevokeGrant}
            />
          ) : activeTab === 'visibility' ? (
            <VisibilityTab
              grants={grants}
              canManage={canManage}
              onUpdateGrant={handleUpdateGrant}
            />
          ) : (
            <InvitesTab
              searchQuery={searchQuery}
              onSearch={handleSearch}
              searchResults={searchResults}
              searching={searching}
              selectedSubject={selectedSubject}
              onSelectSubject={setSelectedSubject}
              newGrantRole={newGrantRole}
              onRoleChange={setNewGrantRole}
              newGrantDetail={newGrantDetail}
              onDetailChange={setNewGrantDetail}
              newGrantScope={newGrantScope}
              onScopeChange={setNewGrantScope}
              onAddGrant={handleAddGrant}
            />
          )}
        </div>
      </div>
    </>
  );
}

// Access Tab Component
function AccessTab({
  grants,
  canManage,
  onUpdateGrant,
  onRevokeGrant,
}: {
  grants: PermissionGrantWithDisplay[];
  canManage: boolean;
  onUpdateGrant: (grantId: string, updates: Partial<PermissionFlags>) => Promise<void>;
  onRevokeGrant: (subject_type: PermissionSubjectType, subject_id: string) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">People with Access</h3>
      
      {grants.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No one has been granted access yet.
        </div>
      ) : (
        <div className="space-y-2">
          {grants.map((grant) => (
            <GrantRow
              key={grant.id}
              grant={grant}
              canManage={canManage}
              onUpdate={(updates) => onUpdateGrant(grant.id, updates)}
              onRevoke={() => onRevokeGrant(grant.subject_type, grant.subject_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Grant Row Component
function GrantRow({
  grant,
  canManage,
  onUpdate,
  onRevoke,
}: {
  grant: PermissionGrantWithDisplay;
  canManage: boolean;
  onUpdate: (updates: Partial<PermissionFlags>) => Promise<void>;
  onRevoke: () => Promise<void>;
}) {
  const currentRole = flagsToRoleApprox(grant.flags);
  const [role, setRole] = useState<PermissionRole>(currentRole);
  const [updating, setUpdating] = useState(false);

  const handleRoleChange = async (newRole: PermissionRole) => {
    setRole(newRole);
    setUpdating(true);
    try {
      const newFlags = roleToFlags(newRole, {
        detail_level: grant.flags.detail_level,
        scope: grant.flags.scope,
      });
      await onUpdate(newFlags);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
          {grant.display_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="font-medium text-gray-900">{grant.display_name}</div>
          {grant.email && (
            <div className="text-sm text-gray-500">{grant.email}</div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {canManage ? (
          <>
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as PermissionRole)}
              disabled={updating}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="owner">Owner</option>
              <option value="editor">Editor</option>
              <option value="commenter">Commenter</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={onRevoke}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Remove access"
            >
              <Trash2 size={16} />
            </button>
          </>
        ) : (
          <span className="text-sm text-gray-600 capitalize">{role}</span>
        )}
      </div>
    </div>
  );
}

// Visibility Tab Component
function VisibilityTab({
  grants,
  canManage,
  onUpdateGrant,
}: {
  grants: PermissionGrantWithDisplay[];
  canManage: boolean;
  onUpdateGrant: (grantId: string, updates: Partial<PermissionFlags>) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Visibility Settings</h3>
      <p className="text-sm text-gray-600">
        Control how much detail people can see and what's included.
      </p>
      
      <div className="space-y-4">
        {grants.map((grant) => (
          <VisibilityGrantRow
            key={grant.id}
            grant={grant}
            canManage={canManage}
            onUpdate={(updates) => onUpdateGrant(grant.id, updates)}
          />
        ))}
      </div>
    </div>
  );
}

function VisibilityGrantRow({
  grant,
  canManage,
  onUpdate,
}: {
  grant: PermissionGrantWithDisplay;
  canManage: boolean;
  onUpdate: (updates: Partial<PermissionFlags>) => Promise<void>;
}) {
  const [detailLevel, setDetailLevel] = useState<DetailLevel>(grant.flags.detail_level);
  const [scope, setScope] = useState<ShareScope>(grant.flags.scope);
  const [updating, setUpdating] = useState(false);

  const handleDetailChange = async (newDetail: DetailLevel) => {
    setDetailLevel(newDetail);
    setUpdating(true);
    try {
      await onUpdate({ detail_level: newDetail });
    } finally {
      setUpdating(false);
    }
  };

  const handleScopeChange = async (newScope: ShareScope) => {
    setScope(newScope);
    setUpdating(true);
    try {
      await onUpdate({ scope: newScope });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="font-medium text-gray-900 mb-3">{grant.display_name}</div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Detail Level
          </label>
          {canManage ? (
            <select
              value={detailLevel}
              onChange={(e) => handleDetailChange(e.target.value as DetailLevel)}
              disabled={updating}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="overview">Overview (title and time only)</option>
              <option value="detailed">Detailed (full information)</option>
            </select>
          ) : (
            <div className="text-sm text-gray-600 capitalize">{detailLevel}</div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Scope
          </label>
          {canManage ? (
            <select
              value={scope}
              onChange={(e) => handleScopeChange(e.target.value as ShareScope)}
              disabled={updating}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="this_only">This only</option>
              <option value="include_children">Include children</option>
            </select>
          ) : (
            <div className="text-sm text-gray-600">
              {scope === 'this_only' ? 'This only' : 'Include children'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Invites Tab Component
function InvitesTab({
  searchQuery,
  onSearch,
  searchResults,
  searching,
  selectedSubject,
  onSelectSubject,
  newGrantRole,
  onRoleChange,
  newGrantDetail,
  onDetailChange,
  newGrantScope,
  onScopeChange,
  onAddGrant,
}: {
  searchQuery: string;
  onSearch: (query: string) => void;
  searchResults: Array<{
    id: string;
    type: PermissionSubjectType;
    display_name: string;
    email?: string;
    avatar_url?: string;
  }>;
  searching: boolean;
  selectedSubject: { type: PermissionSubjectType; id: string; display_name: string } | null;
  onSelectSubject: (subject: { type: PermissionSubjectType; id: string; display_name: string } | null) => void;
  newGrantRole: PermissionRole;
  onRoleChange: (role: PermissionRole) => void;
  newGrantDetail: DetailLevel;
  onDetailChange: (detail: DetailLevel) => void;
  newGrantScope: ShareScope;
  onScopeChange: (scope: ShareScope) => void;
  onAddGrant: () => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Add People</h3>
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search contacts or enter email..."
          value={searchQuery}
          onChange={(e) => {
            onSearch(e.target.value);
          }}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      {/* Search Results */}
      {searching && (
        <div className="text-sm text-gray-500 text-center py-4">Searching...</div>
      )}
      
      {!searching && searchResults.length > 0 && (
        <div className="space-y-2">
          {searchResults.map((result) => (
            <button
              key={result.id}
              onClick={() => onSelectSubject({
                type: result.type,
                id: result.id,
                display_name: result.display_name,
              })}
              className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                {result.display_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{result.display_name}</div>
                {result.email && (
                  <div className="text-sm text-gray-500">{result.email}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      
      {/* Selected Subject Form */}
      {selectedSubject && (
        <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
          <div className="font-medium text-gray-900 mb-4">
            Granting access to: {selectedSubject.display_name}
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={newGrantRole}
                onChange={(e) => onRoleChange(e.target.value as PermissionRole)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="owner">Owner</option>
                <option value="editor">Editor</option>
                <option value="commenter">Commenter</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Detail Level
              </label>
              <select
                value={newGrantDetail}
                onChange={(e) => onDetailChange(e.target.value as DetailLevel)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="overview">Overview</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scope
              </label>
              <select
                value={newGrantScope}
                onChange={(e) => onScopeChange(e.target.value as ShareScope)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="this_only">This only</option>
                <option value="include_children">Include children</option>
              </select>
            </div>
            
            <div className="flex gap-2 pt-2">
              <button
                onClick={onAddGrant}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Grant Access
              </button>
              <button
                onClick={() => onSelectSubject(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Invite by Email */}
      {searchQuery.includes('@') && searchResults.length === 0 && !searching && (
        <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center">
          <Mail className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-2">
            No contact found for {searchQuery}
          </p>
          <button
            onClick={() => {
              // TODO: Create contact and select
              onSelectSubject({
                type: 'contact',
                id: 'new', // Will be created
                display_name: searchQuery,
              });
            }}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Invite by email
          </button>
        </div>
      )}
    </div>
  );
}

