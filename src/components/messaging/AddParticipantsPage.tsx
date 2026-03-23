import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Loader2, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useEncryption } from '../../contexts/EncryptionContext';
import { addParticipantsToConversation } from '../../lib/encryptionUtils';
import { fetchPublicKeys } from '../../lib/encryptionHelpers';
import { encryptConversationKeyForMultipleRecipients } from '../../lib/encryption';
import { supabase } from '../../lib/supabase';

interface AvailableUser {
  profile_id: string;
  name: string;
  role: string;
  is_professional?: boolean;
}

export function AddParticipantsPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { getConversationKey, isUnlocked } = useEncryption();
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAvailableUsers = async () => {
      if (!profile || !conversationId) return;

      try {
        setLoading(true);

        const { data: conversation } = await supabase
          .from('conversations')
          .select('household_id, type')
          .eq('id', conversationId)
          .maybeSingle();

        if (!conversation) {
          setError('Conversation not found');
          return;
        }

        const { data: existingParticipants } = await supabase
          .from('conversation_participants')
          .select('profile_id')
          .eq('conversation_id', conversationId)
          .is('left_at', null);

        const existingIds =
          existingParticipants?.map((p) => p.profile_id) || [];

        const { data: householdMemberships } = await supabase
          .from('space_members')
          .select('space_id')
          .eq('user_id', profile.id);

        const householdIds =
          householdMemberships?.map((hm) => hm.space_id) || [];

        let users: AvailableUser[] = [];

        if (householdIds.length > 0) {
          const { data: householdMembers } = await supabase
            .from('space_members')
            .select(
              `
              user_id,
              role,
              profiles:user_id (
                id,
                full_name,
                role
              )
            `
            )
            .in('space_id', householdIds)
            .not('user_id', 'in', `(${existingIds.join(',')})`);

          if (householdMembers) {
            users = householdMembers.map((hm: any) => ({
              profile_id: hm.user_id,
              name: hm.profiles?.full_name || 'Unknown',
              role: hm.role,
              is_professional: hm.profiles?.role === 'professional',
            }));
          }

          const { data: professionals } = await supabase
            .from('professional_household_access')
            .select(
              `
              professional_profile_id,
              profiles:professional_profile_id (
                id,
                name,
                role
              )
            `
            )
            .in('household_id', householdIds)
            .eq('status', 'approved')
            .not('professional_profile_id', 'in', `(${existingIds.join(',')})`);

          if (professionals) {
            const professionalUsers = professionals
              .filter((p: any) => p.profiles?.role === 'professional')
              .map((p: any) => ({
                profile_id: p.professional_profile_id,
                name: p.profiles?.name || 'Unknown',
                role: 'professional',
                is_professional: true,
              }));

            users = [...users, ...professionalUsers];
          }
        }

        const uniqueUsers = Array.from(
          new Map(users.map((u) => [u.profile_id, u])).values()
        );

        setAvailableUsers(uniqueUsers);
      } catch (err) {
        console.error('Failed to load available users:', err);
        setError('Failed to load available users');
      } finally {
        setLoading(false);
      }
    };

    loadAvailableUsers();
  }, [profile, conversationId]);

  const toggleUser = (profileId: string) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(profileId)) {
        newSet.delete(profileId);
      } else {
        newSet.add(profileId);
      }
      return newSet;
    });
  };

  const handleAdd = async () => {
    if (!conversationId || !isUnlocked) {
      setError('Unable to add participants');
      return;
    }

    if (selectedUsers.size === 0) {
      setError('Please select at least one participant');
      return;
    }

    try {
      setAdding(true);
      setError(null);

      const conversationKey = await getConversationKey(conversationId);
      if (!conversationKey) {
        setError('Failed to load conversation key');
        return;
      }

      const participantIds = Array.from(selectedUsers);
      const publicKeys = await fetchPublicKeys(participantIds);

      const encryptedKeys = await encryptConversationKeyForMultipleRecipients(
        conversationKey,
        publicKeys
      );

      const result = await addParticipantsToConversation(
        conversationId,
        participantIds,
        encryptedKeys
      );

      if (result.success) {
        navigate(`/messages/${conversationId}`);
      } else {
        setError(result.error || 'Failed to add participants');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add participants');
    } finally {
      setAdding(false);
    }
  };

  const filteredUsers = availableUsers.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(`/messages/${conversationId}`)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Add Participants</h1>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500 p-4">
            <p className="text-lg font-medium">No users available</p>
            <p className="text-sm text-center">
              {searchQuery
                ? 'Try a different search term'
                : 'All household members are already in this conversation'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filteredUsers.map((user) => {
              const isSelected = selectedUsers.has(user.profile_id);

              return (
                <button
                  key={user.profile_id}
                  onClick={() => toggleUser(user.profile_id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border-2 border-blue-600'
                      : 'bg-white border-2 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 text-left">
                    <p className="font-medium text-slate-900">{user.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 capitalize">
                        {user.role}
                      </span>
                      {user.is_professional && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Professional
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 bg-white">
        <button
          onClick={handleAdd}
          disabled={selectedUsers.size === 0 || adding || !isUnlocked}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
        >
          {adding ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Adding...
            </span>
          ) : (
            `Add ${selectedUsers.size} Participant${selectedUsers.size !== 1 ? 's' : ''}`
          )}
        </button>
      </div>
    </div>
  );
}
