import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, X, Crown } from 'lucide-react';
import { Avatar } from './Avatar';

interface ProfilePopoverProps {
  profileId: string;
  name: string;
  role: string;
  isProfessional?: boolean;
  isOnline?: boolean;
  lastSeen?: Date | null;
  conversationId?: string;
  canStartDirectChat?: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement>;
}

export function ProfilePopover({
  profileId,
  name,
  role,
  isProfessional = false,
  isOnline = false,
  lastSeen = null,
  conversationId,
  canStartDirectChat = true,
  onClose,
  anchorRef,
}: ProfilePopoverProps) {
  const navigate = useNavigate();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef?.current && popoverRef.current) {
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();

      let top = anchorRect.bottom + 8;
      let left = anchorRect.left;

      if (left + popoverRect.width > window.innerWidth) {
        left = window.innerWidth - popoverRect.width - 16;
      }

      if (top + popoverRect.height > window.innerHeight) {
        top = anchorRect.top - popoverRect.height - 8;
      }

      setPosition({ top, left });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        anchorRef?.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorRef]);

  const handleStartDirectChat = () => {
    navigate('/messages/new');
    onClose();
  };

  const getLastSeenText = () => {
    if (isOnline) return 'Online';
    if (!lastSeen) return 'Offline';

    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return lastSeen.toLocaleDateString();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={popoverRef}
        style={{
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
        className="z-50 w-80 bg-white rounded-lg shadow-2xl border border-slate-200"
      >
        <div className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar
                userId={profileId}
                name={name}
                size="lg"
                showOnline
                isOnline={isOnline}
              />
              <div>
                <h3 className="font-semibold text-slate-900">{name}</h3>
                <p className="text-sm text-slate-500">{getLastSeenText()}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
                Role
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-900 capitalize">{role}</span>
                {role === 'admin' && (
                  <Crown className="w-4 h-4 text-yellow-500" />
                )}
              </div>
            </div>

            {isProfessional && (
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
                  Type
                </p>
                <span className="inline-block bg-green-100 text-green-700 px-2 py-1 rounded text-sm">
                  Professional
                </span>
              </div>
            )}
          </div>

          {canStartDirectChat && (
            <div className="border-t border-slate-200 pt-4">
              <button
                onClick={handleStartDirectChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send Direct Message</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
