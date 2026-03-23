import { useMemo } from 'react';

interface AvatarProps {
  userId: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  imageUrl?: string;
  showOnline?: boolean;
  isOnline?: boolean;
  onClick?: () => void;
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

const onlineIndicatorSizes = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4',
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getAvatarColor(userId: string): string {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-pink-500 to-pink-600',
    'from-red-500 to-red-600',
    'from-orange-500 to-orange-600',
    'from-yellow-500 to-yellow-600',
    'from-green-500 to-green-600',
    'from-teal-500 to-teal-600',
    'from-cyan-500 to-cyan-600',
    'from-indigo-500 to-indigo-600',
  ];

  const hash = hashString(userId);
  return colors[hash % colors.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({
  userId,
  name,
  size = 'md',
  imageUrl,
  showOnline = false,
  isOnline = false,
  onClick,
  className = '',
}: AvatarProps) {
  const initials = useMemo(() => getInitials(name), [name]);
  const gradientColor = useMemo(() => getAvatarColor(userId), [userId]);

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div
        onClick={onClick}
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-semibold bg-gradient-to-br ${gradientColor} ${
          onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
        }`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {showOnline && (
        <div
          className={`absolute bottom-0 right-0 ${
            onlineIndicatorSizes[size]
          } rounded-full border-2 border-white ${
            isOnline ? 'bg-green-500' : 'bg-slate-400'
          }`}
        />
      )}
    </div>
  );
}

interface AvatarGroupProps {
  users: Array<{ userId: string; name: string; imageUrl?: string }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function AvatarGroup({
  users,
  max = 3,
  size = 'md',
  className = '',
}: AvatarGroupProps) {
  const displayedUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  const overlapClasses = {
    xs: '-space-x-1',
    sm: '-space-x-2',
    md: '-space-x-2',
    lg: '-space-x-3',
    xl: '-space-x-4',
  };

  return (
    <div className={`flex items-center ${overlapClasses[size]} ${className}`}>
      {displayedUsers.map((user) => (
        <div key={user.userId} className="ring-2 ring-white rounded-full">
          <Avatar
            userId={user.userId}
            name={user.name}
            imageUrl={user.imageUrl}
            size={size}
          />
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={`${sizeClasses[size]} rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-semibold ring-2 ring-white text-xs`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
