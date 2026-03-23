import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquarePlus, Search, Loader2, MessageSquare } from 'lucide-react';
import { useConversations, hasUnreadMessages } from '../../hooks/useConversations';
import { useDecryptMessage } from '../../contexts/EncryptionContext';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from './Avatar';

interface ConversationListItemProps {
  conversation: any;
  onClick: () => void;
}

function ConversationListItem({ conversation, onClick }: ConversationListItemProps) {
  const { profile } = useAuth();
  const { decrypt } = useDecryptMessage(conversation.id);
  const [lastMessagePreview, setLastMessagePreview] = useState<string>('');
  const [decrypting, setDecrypting] = useState(false);

  const isUnread = hasUnreadMessages(conversation);

  useEffect(() => {
    if (!conversation.last_message) {
      setLastMessagePreview('No messages yet');
      return;
    }

    let mounted = true;

    const decryptPreview = async () => {
      try {
        setDecrypting(true);
        const plaintext = await decrypt(
          conversation.last_message.ciphertext,
          conversation.last_message.nonce
        );
        if (mounted) {
          const preview =
            plaintext.length > 50 ? plaintext.substring(0, 50) + '...' : plaintext;
          setLastMessagePreview(preview);
        }
      } catch {
        if (mounted) {
          setLastMessagePreview('Failed to decrypt');
        }
      } finally {
        if (mounted) {
          setDecrypting(false);
        }
      }
    };

    decryptPreview();

    return () => {
      mounted = false;
    };
  }, [conversation.last_message, decrypt]);

  const getConversationTitle = () => {
    if (conversation.title) return conversation.title;

    if (conversation.type === 'household') {
      return 'Household Chat';
    }

    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants.find(
        (p: any) => p.profile_id !== profile?.id
      );
      return otherParticipant?.name || 'Direct Message';
    }

    return 'Group Chat';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getAvatarUser = () => {
    if (conversation.type === 'direct') {
      const otherUser = conversation.participants.find(
        (p: any) => p.profile_id !== profile?.id
      );
      return {
        id: otherUser?.profile_id || conversation.id,
        name: otherUser?.name || 'Unknown',
      };
    }
    return {
      id: conversation.id,
      name: getConversationTitle(),
    };
  };

  const avatarUser = getAvatarUser();

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
    >
      <Avatar
        userId={avatarUser.id}
        name={avatarUser.name}
        size="lg"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3
            className={`font-semibold truncate ${
              isUnread ? 'text-slate-900' : 'text-slate-700'
            }`}
          >
            {getConversationTitle()}
          </h3>
          {conversation.last_message && (
            <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
              {formatTime(conversation.last_message.created_at)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <p
            className={`text-sm truncate ${
              isUnread ? 'text-slate-900 font-medium' : 'text-slate-500'
            }`}
          >
            {decrypting ? 'Decrypting...' : lastMessagePreview}
          </p>
          {isUnread && (
            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
          )}
        </div>
      </div>
    </button>
  );
}

export function ConversationListPage() {
  const navigate = useNavigate();
  const { conversations, loading, error } = useConversations();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;

    const title = conv.title || '';
    const participantNames = conv.participants
      .map((p: any) => p.name)
      .join(' ')
      .toLowerCase();

    return (
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      participantNames.includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
          <button
            onClick={() => navigate('/messages/new')}
            className="ml-auto p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
            <p className="text-red-600 text-center">{error}</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
            <MessageSquare className="w-16 h-16 text-slate-300" />
            {searchQuery ? (
              <>
                <p className="text-lg font-medium">No conversations found</p>
                <p className="text-sm">Try a different search term</p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium">No conversations yet</p>
                <p className="text-sm">Start a new conversation to get started</p>
                <button
                  onClick={() => navigate('/messages/new')}
                  className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start New Conversation
                </button>
              </>
            )}
          </div>
        ) : (
          <div>
            {filteredConversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                onClick={() => navigate(`/messages/${conversation.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
