import { Leaf, ListChecks, Heart, Activity, Headphones, UserCheck } from 'lucide-react';

interface Question8Props {
  selected: string[];
  onSelect: (values: string[]) => void;
}

const options = [
  { value: 'quiet-time', label: 'Quiet time', icon: Leaf, color: 'from-green-500 to-emerald-600' },
  { value: 'clear-steps', label: 'Clear steps', icon: ListChecks, color: 'from-blue-500 to-indigo-600' },
  { value: 'reassurance', label: 'Reassurance', icon: Heart, color: 'from-pink-500 to-rose-600' },
  { value: 'movement', label: 'Movement', icon: Activity, color: 'from-orange-500 to-amber-600' },
  { value: 'music-sensory', label: 'Music or sensory tools', icon: Headphones, color: 'from-purple-500 to-violet-600' },
  { value: 'check-in', label: 'Someone checking in gently', icon: UserCheck, color: 'from-teal-500 to-cyan-600' },
];

export function Question8ResetTools({ selected, onSelect }: Question8Props) {
  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onSelect(selected.filter((v) => v !== value));
    } else {
      onSelect([...selected, value]);
    }
  };

  return (
    <div>
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
        What helps you reset?
      </h2>
      <p className="text-lg text-gray-600 mb-8">
        Choose all that work for you
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = selected.includes(option.value);

          return (
            <button
              key={option.value}
              onClick={() => handleToggle(option.value)}
              className={`group relative p-5 rounded-2xl border-2 transition-all duration-300 text-left ${
                isSelected
                  ? 'border-transparent shadow-xl scale-105'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {isSelected && (
                <div className={`absolute inset-0 bg-gradient-to-br ${option.color} opacity-10 rounded-2xl`}></div>
              )}

              <div className="relative z-10 flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br ${option.color} shadow-lg transition-all duration-300 ${
                  isSelected ? 'scale-110 animate-pulse' : ''
                }`}>
                  <Icon size={28} className="text-white" />
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {option.label}
                  </h3>
                </div>

                {isSelected && (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-br ${option.color} animate-in zoom-in duration-200`}>
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
