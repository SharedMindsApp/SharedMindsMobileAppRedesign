import { useState, useRef } from 'react';
import { X, UserPlus, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from './Avatar';
import { ProfilePopover } from './ProfilePopover';
import { usePresence } from '../../hooks/usePresence';

interface Participant {
  profile_id: string;
  name: string;
  role: string;
  is_professional?: boolean;
}

interface ParticipantsDrawerProps {
  conversationId: string;
  participants: Participant[];
  conversationType: 'household' | 'direct' | 'group';
  isOpen: boolean;
  onClose: () => void;
  canAddParticipants?: boolean;
}

export function ParticipantsDrawer({
  conversationId,
  participants,
  conversationType,
  isOpen,
  onClose,
  canAddParticipants = false,
}: ParticipantsDrawerProps) {
  const navigate = useNavigate();
  const { isOnline, getLastSeen } = usePresence(conversationId);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const avatarRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  if (!isOpen) return null;

  const handleAddParticipants = () => {
    navigate(`/messages/${conversationId}/add`);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Participants</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {participants.map((participant) => (
              <div
                key={participant.profile_id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50"
              >
                <div
                  ref={(el) => {
                    if (el) avatarRefs.current.set(participant.profile_id, el);
                  }}
                >
                  <Avatar
                    userId={participant.profile_id}
                    name={participant.name}
                    size="md"
                    showOnline
                    isOnline={isOnline(participant.profile_id)}
                    onClick={() => setSelectedParticipant(participant)}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 truncate">
                      {participant.name}
                    </p>
                    {participant.role === 'admin' && (
                      <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="capitalize">{participant.role}</span>
                    {participant.is_professional && (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        Professional
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {canAddParticipants && conversationType === 'group' && (
          <div className="p-4 border-t border-slate-200">
            <button
              onClick={handleAddParticipants}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              <span>Add Participants</span>
            </button>
          </div>
        )}
      </div>

      {selectedParticipant && (
        <ProfilePopover
          profileId={selectedParticipant.profile_id}
          name={selectedParticipant.name}
          role={selectedParticipant.role}
          isProfessional={selectedParticipant.is_professional}
          isOnline={isOnline(selectedParticipant.profile_id)}
          lastSeen={getLastSeen(selectedParticipant.profile_id)}
          conversationId={conversationId}
          onClose={() => setSelectedParticipant(null)}
          anchorRef={{
            current: avatarRefs.current.get(selectedParticipant.profile_id) || null,
          }}
        />
      )}
    </>
  );
}
