import { useEffect, useState, useRef } from 'react';
import { useDecryptMessage } from '../../contexts/EncryptionContext';
import { useAuth } from '../../contexts/AuthContext';
import { useReactions } from '../../hooks/useReactions';
import { Loader2, Smile } from 'lucide-react';
import { Avatar } from './Avatar';
import { ProfilePopover } from './ProfilePopover';
import { ReactionPicker, ReactionCluster } from './ReactionPicker';

interface MessageBubbleProps {
  conversationId: string;
  messageId: string;
  ciphertext: string;
  nonce: string;
  senderProfileId: string;
  senderName?: string;
  senderRole?: string;
  senderIsProfessional?: boolean;
  messageType: 'text' | 'system' | 'info';
  createdAt: string;
  isOnline?: boolean;
}

export function MessageBubble({
  conversationId,
  messageId,
  ciphertext,
  nonce,
  senderProfileId,
  senderName = 'Unknown',
  senderRole,
  senderIsProfessional = false,
  messageType,
  createdAt,
  isOnline = false,
}: MessageBubbleProps) {
  const { profile } = useAuth();
  const { decrypt } = useDecryptMessage(conversationId);
  const { groupedReactions, toggleReaction } = useReactions(messageId);
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(true);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  const isOwn = profile?.id === senderProfileId;
  const isSystem = messageType === 'system' || messageType === 'info';

  useEffect(() => {
    let mounted = true;

    const decryptMessage = async () => {
      try {
        setDecrypting(true);
        const decrypted = await decrypt(ciphertext, nonce);
        if (mounted) {
          setPlaintext(decrypted);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Decryption failed');
        }
      } finally {
        if (mounted) {
          setDecrypting(false);
        }
      }
    };

    decryptMessage();

    return () => {
      mounted = false;
    };
  }, [messageId, ciphertext, nonce, decrypt]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-sm">
          {decrypting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Decrypting...</span>
            </span>
          ) : error ? (
            <span className="text-red-600">Failed to decrypt message</span>
          ) : (
            plaintext
          )}
        </div>
      </div>
    );
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowReactionPicker(true);
  };

  return (
    <div className={`flex mb-3 gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && (
        <div ref={avatarRef}>
          <Avatar
            userId={senderProfileId}
            name={senderName}
            size="sm"
            showOnline
            isOnline={isOnline}
            onClick={() => setShowProfilePopover(true)}
          />
        </div>
      )}

      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isOwn && (
          <span className="text-xs text-slate-500 mb-1 px-3">{senderName}</span>
        )}
        <div className="relative" ref={messageRef}>
          <div
            onContextMenu={handleContextMenu}
            className={`rounded-2xl px-4 py-2 relative group ${
              isOwn
                ? 'bg-blue-600 text-white rounded-br-md'
                : 'bg-slate-100 text-slate-900 rounded-bl-md'
            }`}
          >
            {decrypting ? (
              <span className="flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Decrypting...</span>
              </span>
            ) : error ? (
              <span className="text-sm text-red-600">Failed to decrypt</span>
            ) : (
              <p className="text-sm whitespace-pre-wrap break-words">{plaintext}</p>
            )}
            <div
              className={`text-xs mt-1 ${
                isOwn ? 'text-blue-200' : 'text-slate-500'
              }`}
            >
              {formatTime(createdAt)}
            </div>

            <button
              onClick={() => setShowReactionPicker(true)}
              className={`absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/10 ${
                isOwn ? 'text-white' : 'text-slate-600'
              }`}
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>

          <ReactionPicker
            isOpen={showReactionPicker}
            onSelect={toggleReaction}
            onClose={() => setShowReactionPicker(false)}
            anchorRef={messageRef}
          />

          <ReactionCluster
            reactions={groupedReactions}
            onReactionClick={toggleReaction}
          />
        </div>
      </div>

      {showProfilePopover && !isOwn && (
        <ProfilePopover
          profileId={senderProfileId}
          name={senderName}
          role={senderRole || 'member'}
          isProfessional={senderIsProfessional}
          isOnline={isOnline}
          conversationId={conversationId}
          onClose={() => setShowProfilePopover(false)}
          anchorRef={avatarRef}
        />
      )}
    </div>
  );
}
