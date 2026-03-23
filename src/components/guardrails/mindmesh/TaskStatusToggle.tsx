import { useState } from 'react';
import { Check, Circle, Clock } from 'lucide-react';

type TaskStatus = 'pending' | 'in_progress' | 'completed';

interface TaskStatusToggleProps {
  status: TaskStatus;
  isCompleted: boolean;
  canEdit: boolean;
  onStatusChange: (newStatus: string) => void;
}

export function TaskStatusToggle({ status, isCompleted, canEdit, onStatusChange }: TaskStatusToggleProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getStatusDisplay = (s: TaskStatus) => {
    switch (s) {
      case 'completed':
        return {
          icon: <Check size={12} />,
          label: 'Done',
          color: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-300',
        };
      case 'in_progress':
        return {
          icon: <Clock size={12} />,
          label: 'In Progress',
          color: 'text-blue-700',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-300',
        };
      case 'pending':
      default:
        return {
          icon: <Circle size={12} />,
          label: 'To Do',
          color: 'text-gray-700',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-300',
        };
    }
  };

  const currentDisplay = getStatusDisplay(status);

  const handleStatusClick = (newStatus: TaskStatus) => {
    onStatusChange(newStatus);
    setShowMenu(false);
  };

  if (!canEdit) {
    return (
      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${currentDisplay.bgColor} ${currentDisplay.color} border ${currentDisplay.borderColor} ${isCompleted ? 'opacity-50' : ''}`}>
        {currentDisplay.icon}
        <span className="text-[10px] font-medium">{currentDisplay.label}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${currentDisplay.bgColor} ${currentDisplay.color} border ${currentDisplay.borderColor} hover:ring-2 hover:ring-blue-300 transition-all ${isCompleted ? 'opacity-50' : ''}`}
        title="Click to change status"
      >
        {currentDisplay.icon}
        <span className="text-[10px] font-medium">{currentDisplay.label}</span>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStatusClick('pending');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 text-left"
            >
              <Circle size={12} className="text-gray-700" />
              <span>To Do</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStatusClick('in_progress');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 text-left"
            >
              <Clock size={12} className="text-blue-700" />
              <span>In Progress</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStatusClick('completed');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 text-left"
            >
              <Check size={12} className="text-green-700" />
              <span>Done</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
