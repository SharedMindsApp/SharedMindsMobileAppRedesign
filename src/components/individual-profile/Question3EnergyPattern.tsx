import { Sunrise, Sun, Sunset, Shuffle, TrendingUp } from 'lucide-react';

interface Question3Props {
  selected: string;
  onSelect: (value: string) => void;
}

const options = [
  { value: 'morning', label: 'Morning peak', icon: Sunrise, color: 'from-yellow-400 to-orange-400' },
  { value: 'afternoon', label: 'Afternoon peak', icon: Sun, color: 'from-orange-400 to-amber-500' },
  { value: 'evening', label: 'Evening peak', icon: Sunset, color: 'from-purple-400 to-pink-500' },
  { value: 'unpredictable', label: 'Unpredictable', icon: Shuffle, color: 'from-gray-400 to-slate-500' },
  { value: 'up-and-down', label: 'Up and down all day', icon: TrendingUp, color: 'from-teal-400 to-cyan-500' },
];

export function Question3EnergyPattern({ selected, onSelect }: Question3Props) {
  return (
    <div>
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
        How does your energy flow throughout the day?
      </h2>
      <p className="text-lg text-gray-600 mb-8">
        When do you feel most alive?
      </p>

      <div className="grid grid-cols-1 gap-3">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={`group relative p-5 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden ${
                isSelected
                  ? 'border-transparent shadow-xl scale-102'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {isSelected && (
                <div className={`absolute inset-0 bg-gradient-to-r ${option.color} opacity-10`}></div>
              )}

              <div className="relative z-10 flex items-center gap-4">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-br ${option.color} shadow-lg transition-transform ${
                  isSelected ? 'scale-110' : 'group-hover:scale-105'
                }`}>
                  <Icon size={32} className="text-white" />
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-xl text-gray-900">
                    {option.label}
                  </h3>
                </div>

                {isSelected && (
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center animate-in zoom-in duration-200">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
