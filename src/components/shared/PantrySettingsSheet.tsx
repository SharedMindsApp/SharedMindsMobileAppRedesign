import { useEffect, useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, MapPinned, Printer, RefreshCcw, UserPlus, Users, Wallet, X } from 'lucide-react';
import { SharingService, type Profile, type SpaceMemberDetail } from '../../core/services/SharingService';
import { showToast } from '../Toast';
import { BottomSheet } from './BottomSheet';

type PantrySettingsSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  itemCount: number;
  totalEstimatedValue: number;
  valuedItemCount: number;
  onManageLocations: () => void;
  onPrintChecklist: () => void;
  onPrintBudgetReport: () => void;
  onExportCsv: () => void;
  autoReplaceEnabled: boolean;
  autoReplaceLoading?: boolean;
  onAutoReplaceToggle: (enabled: boolean) => Promise<void> | void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 2,
  }).format(value);
}

export function PantrySettingsSheet({
  isOpen,
  onClose,
  spaceId,
  itemCount,
  totalEstimatedValue,
  valuedItemCount,
  onManageLocations,
  onPrintChecklist,
  onPrintBudgetReport,
  onExportCsv,
  autoReplaceEnabled,
  autoReplaceLoading = false,
  onAutoReplaceToggle,
}: PantrySettingsSheetProps) {
  const [members, setMembers] = useState<SpaceMemberDetail[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedRole, setSelectedRole] = useState<'collaborator' | 'viewer'>('collaborator');
  const [memberActionId, setMemberActionId] = useState<string | null>(null);
  const [sharingExpanded, setSharingExpanded] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedRole('collaborator');
      setSharingExpanded(false);
      return;
    }

    const loadMembers = async () => {
      try {
        setMemberLoading(true);
        const nextMembers = await SharingService.getSpaceMembers(spaceId);
        setMembers(nextMembers);
      } catch (error) {
        console.error('Failed to load Pantry members:', error);
        showToast('error', 'Failed to load Pantry sharing settings');
      } finally {
        setMemberLoading(false);
      }
    };

    loadMembers();
  }, [isOpen, spaceId]);

  useEffect(() => {
    if (!isOpen || searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        const results = await SharingService.searchUsers(searchQuery.trim());
        const activeUserIds = new Set(members.map((member) => member.user_id));
        setSearchResults(results.filter((result) => !activeUserIds.has(result.id)));
      } catch (error) {
        console.error('Failed to search Pantry users:', error);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [isOpen, searchQuery, members]);

  const refreshMembers = async () => {
    const nextMembers = await SharingService.getSpaceMembers(spaceId);
    setMembers(nextMembers);
  };

  const handleInvite = async (userId: string) => {
    try {
      setMemberActionId(userId);
      await SharingService.inviteToSpace(spaceId, userId, selectedRole);
      await refreshMembers();
      setSearchQuery('');
      setSearchResults([]);
      showToast('success', selectedRole === 'collaborator' ? 'Pantry edit access granted' : 'Pantry view access granted');
    } catch (error: any) {
      console.error('Failed to add Pantry member:', error);
      showToast('error', error?.message || 'Failed to add user to Pantry');
    } finally {
      setMemberActionId(null);
    }
  };

  const handleRoleChange = async (memberId: string, role: 'collaborator' | 'viewer') => {
    try {
      setMemberActionId(memberId);
      await SharingService.updateSpaceMemberRole(memberId, role);
      await refreshMembers();
      showToast('success', role === 'collaborator' ? 'Set to edit writes' : 'Set to view only');
    } catch (error: any) {
      console.error('Failed to update Pantry role:', error);
      showToast('error', error?.message || 'Failed to update Pantry access');
    } finally {
      setMemberActionId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      setMemberActionId(memberId);
      await SharingService.removeFromSpace(memberId);
      await refreshMembers();
      showToast('success', 'Pantry access removed');
    } catch (error: any) {
      console.error('Failed to remove Pantry member:', error);
      showToast('error', error?.message || 'Failed to remove Pantry access');
    } finally {
      setMemberActionId(null);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Pantry settings"
      footer={
        <button
          onClick={onClose}
          className="w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800 min-h-[48px]"
        >
          Done
        </button>
      }
    >
      <div className="space-y-5">
        <div className="rounded-[1.75rem] border border-stone-200 bg-[linear-gradient(135deg,#fafaf9,#f5f5f4)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Reports</p>
              <h3 className="mt-2 text-xl font-semibold text-stone-900">Export a usable Pantry record</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Print a walk-through checklist for audits, export the raw list, or create a budget summary for stock value.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <Download size={20} className="text-stone-700" />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Inventory lines</div>
              <div className="mt-2 text-2xl font-black text-stone-900">{itemCount}</div>
            </div>
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Valued lines</div>
              <div className="mt-2 text-2xl font-black text-stone-900">{valuedItemCount}</div>
            </div>
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Estimated value</div>
              <div className="mt-2 text-2xl font-black text-stone-900">{formatCurrency(totalEstimatedValue)}</div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[1.75rem] border border-stone-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-stone-100 p-3 text-stone-700">
                  <RefreshCcw size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Automation</p>
                  <h3 className="mt-1 text-lg font-semibold text-stone-900">Auto-add replacements</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    When stock is used up or reduced, automatically place the replacement into Shopping so the list stays current.
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={autoReplaceEnabled}
                onClick={() => void onAutoReplaceToggle(!autoReplaceEnabled)}
                disabled={autoReplaceLoading}
                className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${
                  autoReplaceEnabled ? 'bg-stone-900' : 'bg-stone-300'
                } ${autoReplaceLoading ? 'cursor-wait opacity-60' : ''}`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${
                    autoReplaceEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50/70 px-3 py-3 text-sm text-stone-600">
              Example: reduce `4 cans` of tomatoes to `3 cans`, and one tomato item is added to the Shopping list automatically.
            </div>
          </div>

          <button
            onClick={onPrintChecklist}
            className="flex w-full items-start gap-3 rounded-[1.5rem] border border-stone-200 bg-white px-4 py-4 text-left transition-colors hover:bg-stone-50"
          >
            <div className="rounded-2xl bg-stone-100 p-3 text-stone-700">
              <Printer size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-stone-900">Print audit checklist</div>
              <div className="mt-1 text-sm text-stone-500">
                Printable location-by-location checklist with tick boxes for manual stock checks.
              </div>
            </div>
          </button>

          <button
            onClick={onPrintBudgetReport}
            className="flex w-full items-start gap-3 rounded-[1.5rem] border border-stone-200 bg-white px-4 py-4 text-left transition-colors hover:bg-stone-50"
          >
            <div className="rounded-2xl bg-stone-100 p-3 text-stone-700">
              <Wallet size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-stone-900">Print budget report</div>
              <div className="mt-1 text-sm text-stone-500">
                Printable stock valuation report with totals by category and location.
              </div>
            </div>
          </button>

          <button
            onClick={onExportCsv}
            className="flex w-full items-start gap-3 rounded-[1.5rem] border border-stone-200 bg-white px-4 py-4 text-left transition-colors hover:bg-stone-50"
          >
            <div className="rounded-2xl bg-stone-100 p-3 text-stone-700">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-stone-900">Export CSV</div>
              <div className="mt-1 text-sm text-stone-500">
                Download the full Pantry list for spreadsheets, manual review, or offline backup.
              </div>
            </div>
          </button>

          <button
            onClick={onManageLocations}
            className="flex w-full items-start gap-3 rounded-[1.5rem] border border-stone-200 bg-white px-4 py-4 text-left transition-colors hover:bg-stone-50"
          >
            <div className="rounded-2xl bg-stone-100 p-3 text-stone-700">
              <MapPinned size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-stone-900">Manage locations</div>
              <div className="mt-1 text-sm text-stone-500">
                Update the storage zones used in exports, audits, and day-to-day Pantry tracking.
              </div>
            </div>
          </button>
        </div>

        <div className="rounded-[1.75rem] border border-stone-200 bg-white">
          <button
            type="button"
            onClick={() => setSharingExpanded((value) => !value)}
            className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-stone-50 rounded-[1.75rem]"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-stone-100 p-3 shadow-sm">
                <Users size={20} className="text-stone-700" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Sharing</p>
                <h3 className="mt-1 text-xl font-semibold text-stone-900">Share this Pantry space</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Add trusted people with `Edit writes` or `View only` access.
                </p>
              </div>
            </div>
            <ChevronDown
              size={18}
              className={`mt-1 text-stone-500 transition-transform ${sharingExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          {sharingExpanded && (
            <div className="border-t border-stone-200 px-4 pb-4 pt-4 space-y-4">
              <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50/70 p-4 space-y-3">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                    Add user
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
                  />
                  <p className="mt-1 text-xs text-stone-500">
                    Search for an existing user, then choose whether they can edit or only view.
                  </p>
                </div>

                <div className="flex gap-2">
                  {([
                    { value: 'collaborator' as const, label: 'Edit writes' },
                    { value: 'viewer' as const, label: 'View only' },
                  ]).map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setSelectedRole(role.value)}
                      className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                        selectedRole === role.value
                          ? 'bg-stone-900 text-white'
                          : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-stone-900">{result.display_name || 'Unnamed user'}</div>
                          <div className="text-xs text-stone-500">Existing user</div>
                        </div>
                        <button
                          onClick={() => handleInvite(result.id)}
                          disabled={memberActionId === result.id}
                          className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
                        >
                          <UserPlus size={16} />
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Current access</div>
                {memberLoading ? (
                  <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">
                    Loading Pantry members...
                  </div>
                ) : members.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">
                    No Pantry members yet.
                  </div>
                ) : (
                  members.map((member) => {
                    const isOwner = member.role === 'owner';
                    const isBusy = memberActionId === member.id;
                    return (
                      <div
                        key={member.id}
                        className="rounded-[1.5rem] border border-stone-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-stone-900">
                              {member.profile?.display_name || 'Unnamed user'}
                            </div>
                            <div className="mt-1 text-xs text-stone-500">
                              {isOwner
                                ? 'Owner'
                                : member.role === 'collaborator'
                                  ? 'Edit writes'
                                  : 'View only'}
                            </div>
                          </div>
                          {!isOwner && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              disabled={isBusy}
                              className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50"
                              aria-label="Remove access"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        {!isOwner && (
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleRoleChange(member.id, 'collaborator')}
                              disabled={isBusy}
                              className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                                member.role === 'collaborator'
                                  ? 'bg-stone-900 text-white'
                                  : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                              }`}
                            >
                              Edit writes
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRoleChange(member.id, 'viewer')}
                              disabled={isBusy}
                              className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                                member.role === 'viewer'
                                  ? 'bg-stone-900 text-white'
                                  : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                              }`}
                            >
                              View only
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
