import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useCoreData } from '../../data/CoreDataContext';
import { SharingService, type SpaceMemberDetail, type Profile } from '../../services/SharingService';
import {
  PageGreeting,
  SurfaceCard,
  SectionHeader,
  PillButton,
  GradientButton,
  InputWell,
} from '../../ui/CorePage';

export function SharingPage() {
  const { state } = useCoreData();
  const activeSpace = state.spaces.find((s) => s.id === state.activeSpaceId);
  const [members, setMembers] = useState<SpaceMemberDetail[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!activeSpace) return;
    SharingService.getSpaceMembers(activeSpace.id).then(setMembers);
  }, [activeSpace]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length>= 3) {
        setIsSearching(true);
        SharingService.searchUsers(searchQuery).then((res) => {
          setSearchResults(res);
          setIsSearching(false);
        });
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleInvite = async (targetId: string) => {
    if (!activeSpace) return;
    try {
      await SharingService.inviteToSpace(activeSpace.id, targetId, 'collaborator');
      const updatedMembers = await SharingService.getSpaceMembers(activeSpace.id);
      setMembers(updatedMembers);
      setSearchQuery('');
    } catch {
      alert('Could not invite user. Ensure they are an accepted connection first.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* ── Greeting ────────────────────────────────────────── */}
      <PageGreeting
        greeting="Manage Sharing"
        subtitle={`Selective sharing for ${activeSpace?.name || 'this space'}. Add trusted connections to collaborate.`}
      />

      {/* ── Current Members ─────────────────────────────────── */}
      <SurfaceCard>
        <SectionHeader
          overline="Members"
          title="Current members"
        />
        {members.length === 0 ? (
          <SurfaceCard variant="nested" className="mt-4">
            <p className="text-sm stitch-text-primary">
              Only you have access.
            </p>
          </SurfaceCard>
        ) : (
          <div className="mt-4 space-y-2">
            {members.map((member) => (
              <SurfaceCard variant="nested" padding="sm" key={member.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold">
                      {member.profile?.display_name?.charAt(0) || '?'}
                    </div>
                    <span className="text-sm font-medium stitch-text-primary">
                      {member.profile?.display_name || 'Unknown User'}
                    </span>
                  </div>
                  <PillButton size="sm" tone="neutral">
                    {member.role}
                  </PillButton>
                </div>
              </SurfaceCard>
            ))}
          </div>
        )}
      </SurfaceCard>

      {/* ── Invite People ───────────────────────────────────── */}
      {activeSpace?.type === 'shared' && (
        <SurfaceCard>
          <SectionHeader
            overline="Invite"
            title="Add people"
          />
          <div className="mt-4">
            <InputWell
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by exact display name..."
            />
          </div>

          {isSearching && (
            <p className="mt-2 text-xs stitch-text-secondary">Searching...</p>
          )}

          {searchResults.length> 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.map((p) => {
                const isAlreadyMember = members.some((m) => m.user_id === p.id);
                return (
                  <SurfaceCard variant="nested" padding="sm" key={p.id}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium stitch-text-primary">
                        {p.display_name}
                      </span>
                      {isAlreadyMember ? (
                        <PillButton size="sm" tone="emerald">Added</PillButton>
                      ) : (
                        <GradientButton size="sm" onClick={() => handleInvite(p.id)}>
                          <span className="inline-flex items-center gap-1.5">
                            <UserPlus size={14} />
                            Add
                          </span>
                        </GradientButton>
                      )}
                    </div>
                  </SurfaceCard>
                );
              })}
            </div>
          )}
        </SurfaceCard>
      )}
    </div>
  );
}
