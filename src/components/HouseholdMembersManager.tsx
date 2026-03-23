import { useState, useEffect } from 'react';
import { Users, Mail, X, Check, Clock, Copy } from 'lucide-react';
import {
  getHouseholdMembersList,
  inviteHouseholdMember,
  removeHouseholdMember,
  getCurrentMembership,
  HouseholdMember,
} from '../lib/household';

type Props = {
  householdId: string;
};

export function HouseholdMembersManager({ householdId }: Props) {
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [currentMembership, setCurrentMembership] = useState<HouseholdMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const isOwner = currentMembership?.role === 'owner';

  useEffect(() => {
    loadMembers();
  }, [householdId]);

  async function loadMembers() {
    try {
      setLoading(true);
      const [membersList, membership] = await Promise.all([
        getHouseholdMembersList(householdId),
        getCurrentMembership(householdId),
      ]);
      setMembers(membersList);
      setCurrentMembership(membership);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!inviteEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setInviting(true);
      const result = await inviteHouseholdMember(householdId, inviteEmail);
      setSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
      await loadMembers();

      navigator.clipboard.writeText(result.inviteUrl);
      setCopiedUrl(result.inviteUrl);
      setTimeout(() => setCopiedUrl(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      await removeHouseholdMember(memberId);
      setSuccess('Member removed successfully');
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  }

  function copyInviteUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activeMembers = members.filter((m) => m.status === 'active');
  const pendingInvites = members.filter((m) => m.status === 'pending');

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-start gap-3">
          <X className="flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={20} />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 flex items-start gap-3">
          <Check className="flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-medium">Success</p>
            <p className="text-sm">{success}</p>
            {copiedUrl && (
              <p className="text-xs mt-2 flex items-center gap-2">
                <Copy size={14} />
                Invite link copied to clipboard
              </p>
            )}
          </div>
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <X size={20} />
          </button>
        </div>
      )}

      {isOwner && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Mail size={20} className="text-blue-600" />
            Invite New Member
          </h3>
          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter email address"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={inviting}
            />
            <button
              type="submit"
              disabled={inviting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users size={20} className="text-green-600" />
          Active Members ({activeMembers.length})
        </h3>
        <div className="space-y-3">
          {activeMembers.length === 0 ? (
            <p className="text-gray-500 text-sm">No active members yet</p>
          ) : (
            activeMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                    {member.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{member.email}</p>
                    <p className="text-xs text-gray-500">
                      {member.role === 'owner' ? 'Billing Owner' : 'Member'}
                      {member.accepted_at &&
                        ` • Joined ${new Date(member.accepted_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                {isOwner && member.role !== 'owner' && (
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {pendingInvites.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-amber-600" />
            Pending Invites ({pendingInvites.length})
          </h3>
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                    {invite.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{invite.email}</p>
                    <p className="text-xs text-gray-500">
                      Invited {new Date(invite.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isOwner && invite.invite_token && (
                    <button
                      onClick={() =>
                        copyInviteUrl(
                          `${window.location.origin}/invite/accept?token=${invite.invite_token}`
                        )
                      }
                      className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Copy size={14} />
                      {copiedUrl?.includes(invite.invite_token || '') ? 'Copied!' : 'Copy Link'}
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => handleRemove(invite.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isOwner && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            This household is managed by the billing owner. You have full access to assessments and
            insights, but billing and member management are controlled by them.
          </p>
        </div>
      )}
    </div>
  );
}
