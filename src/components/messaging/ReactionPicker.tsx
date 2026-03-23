import { useEffect, useRef } from 'react';

const DEFAULT_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  isOpen: boolean;
  anchorRef?: React.RefObject<HTMLElement>;
}

export function ReactionPicker({
  onSelect,
  onClose,
  isOpen,
  anchorRef,
}: ReactionPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        anchorRef?.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-slate-200 p-2 flex gap-1 z-50"
    >
      {DEFAULT_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-slate-100 rounded transition-colors"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

interface ReactionClusterProps {
  reactions: Array<{
    emoji: string;
    count: number;
    profiles: string[];
    hasUserReacted: boolean;
  }>;
  onReactionClick: (emoji: string) => void;
}

export function ReactionCluster({
  reactions,
  onReactionClick,
}: ReactionClusterProps) {
  if (reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => onReactionClick(reaction.emoji)}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors ${
            reaction.hasUserReacted
              ? 'bg-blue-100 border border-blue-300 text-blue-700'
              : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <span>{reaction.emoji}</span>
          <span className="text-xs font-medium">{reaction.count}</span>
        </button>
      ))}
    </div>
  );
}
