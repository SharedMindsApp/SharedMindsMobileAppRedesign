import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Loader2 } from 'lucide-react';
import { useConversationMessages } from '../../hooks/useConversationMessages';
import { useEncryption } from '../../contexts/EncryptionContext';
import { usePresence } from '../../hooks/usePresence';
import { useTypingIndicator } from '../../hooks/useTypingIndicator';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { ParticipantsDrawer } from './ParticipantsDrawer';
import { TypingIndicator } from './TypingIndicator';
import { AvatarGroup } from './Avatar';
import { setLastOpenedAt } from '../../hooks/useConversations';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ConversationDetails {
  id: string;
  type: 'household' | 'direct' | 'group';
  title: string | null;
  participants: Array<{
    profile_id: string;
    name: string;
    role: string;
    is_professional?: boolean;
  }>;
}

export function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isUnlocked } = useEncryption();
  const { messages, loading, error, hasMore, loadMore } = useConversationMessages(
    conversationId || ''
  );
  const { isOnline, getLastSeen } = usePresence(conversationId || null);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(conversationId || null);
  const [conversationDetails, setConversationDetails] =
    useState<ConversationDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (!conversationId) return;

    setLastOpenedAt(conversationId);

    const loadConversationDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select(
            `
            id,
            type,
            title,
            conversation_participants!inner (
              profile_id,
              role,
              profiles:profile_id (
                id,
                name,
                role
              )
            )
          `
          )
          .eq('id', conversationId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const participants = (data.conversation_participants || []).map(
            (p: any) => ({
              profile_id: p.profile_id,
              name: p.profiles?.name || 'Unknown',
              role: p.role,
              is_professional: p.profiles?.role === 'professional',
            })
          );

          setConversationDetails({
            id: data.id,
            type: data.type,
            title: data.title,
            participants,
          });
        }
      } catch (err) {
        console.error('Failed to load conversation details:', err);
      } finally {
        setLoadingDetails(false);
      }
    };

    loadConversationDetails();
  }, [conversationId]);

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setAutoScroll(isNearBottom);

    if (scrollTop === 0 && hasMore) {
      loadMore();
    }
  };

  const handleMessageSent = () => {
    setAutoScroll(true);
  };

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-slate-600">Invalid conversation</p>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
          <Users className="w-8 h-8 text-yellow-600" />
        </div>
        <p className="text-slate-900 font-medium">Encryption keys locked</p>
        <p className="text-slate-600 text-sm">
          Please unlock your encryption keys to view messages
        </p>
      </div>
    );
  }

  if (loadingDetails || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !conversationDetails) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-red-600">{error || 'Failed to load conversation'}</p>
        <button
          onClick={() => navigate('/messages')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Messages
        </button>
      </div>
    );
  }

  const getConversationTitle = () => {
    if (conversationDetails.title) return conversationDetails.title;

    if (conversationDetails.type === 'household') {
      return 'Household Chat';
    }

    if (conversationDetails.type === 'direct') {
      const otherParticipant = conversationDetails.participants.find(
        (p) => p.profile_id !== profile?.id
      );
      return otherParticipant?.name || 'Direct Message';
    }

    return 'Group Chat';
  };

  const canAddParticipants = conversationDetails.participants.some(
    (p) => p.profile_id === profile?.id && p.role === 'admin'
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-200 bg-white">
        <button
          onClick={() => navigate('/messages')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <AvatarGroup
          users={conversationDetails.participants.map((p) => ({
            userId: p.profile_id,
            name: p.name,
          }))}
          max={3}
          size="sm"
        />

        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-slate-900 truncate">
            {getConversationTitle()}
          </h1>
          <p className="text-sm text-slate-500">
            {conversationDetails.participants.length} participant
            {conversationDetails.participants.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          onClick={() => setShowParticipants(true)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <Users className="w-5 h-5" />
        </button>
      </div>

      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 bg-slate-50"
      >
        {hasMore && (
          <div className="flex justify-center mb-4">
            <button
              onClick={loadMore}
              className="text-sm text-blue-600 hover:text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50"
            >
              Load older messages
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <p className="text-lg mb-2">No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const sender = conversationDetails.participants.find(
                (p) => p.profile_id === message.sender_profile_id
              );

              return (
                <MessageBubble
                  key={message.id}
                  conversationId={conversationId}
                  messageId={message.id}
                  ciphertext={message.ciphertext}
                  nonce={message.nonce}
                  senderProfileId={message.sender_profile_id}
                  senderName={sender?.name}
                  senderRole={sender?.role}
                  senderIsProfessional={sender?.is_professional}
                  messageType={message.message_type}
                  createdAt={message.created_at}
                  isOnline={isOnline(message.sender_profile_id)}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <TypingIndicator typingUsers={typingUsers} />

      <MessageComposer
        conversationId={conversationId}
        onMessageSent={handleMessageSent}
        onTypingStart={startTyping}
        onTypingStop={stopTyping}
      />

      <ParticipantsDrawer
        conversationId={conversationId}
        participants={conversationDetails.participants}
        conversationType={conversationDetails.type}
        isOpen={showParticipants}
        onClose={() => setShowParticipants(false)}
        canAddParticipants={canAddParticipants}
      />
    </div>
  );
}
