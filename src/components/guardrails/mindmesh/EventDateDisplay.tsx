import { Calendar } from 'lucide-react';

interface EventDateDisplayProps {
  startDate?: string | null;
  endDate?: string | null;
  isGhost: boolean;
}

export function EventDateDisplay({ startDate, endDate, isGhost }: EventDateDisplayProps) {
  if (!startDate) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();

      if (isToday) {
        return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
      }

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = date.toDateString() === tomorrow.toDateString();

      if (isTomorrow) {
        return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
      }

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const formatDateRange = () => {
    const start = formatDate(startDate);

    if (!endDate) {
      return start;
    }

    try {
      const startD = new Date(startDate);
      const endD = new Date(endDate);

      if (startD.toDateString() === endD.toDateString()) {
        const endTime = endD.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        return `${start} - ${endTime}`;
      }

      return `${start} → ${formatDate(endDate)}`;
    } catch (e) {
      return `${start} → ${formatDate(endDate)}`;
    }
  };

  return (
    <div className={`flex items-center gap-1 text-xs ${isGhost ? 'text-gray-500' : 'text-gray-600'} mt-1`}>
      <Calendar size={12} />
      <span>{formatDateRange()}</span>
    </div>
  );
}
