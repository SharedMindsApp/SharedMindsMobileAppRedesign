interface Question10Props {
  selected: string[];
  onSelect: (values: string[]) => void;
}

const options = [
  {
    value: 'quiet-morning',
    emoji: '🌅',
    label: 'Quiet start to the day',
    gradient: 'from-orange-200 to-amber-200',
  },
  {
    value: 'peaceful-night',
    emoji: '🌙',
    label: 'Peaceful nights',
    gradient: 'from-indigo-200 to-purple-200',
  },
  {
    value: 'creative-moments',
    emoji: '✨',
    label: 'Creative moments',
    gradient: 'from-pink-200 to-rose-200',
  },
  {
    value: 'learning',
    emoji: '📚',
    label: 'Learning something new',
    gradient: 'from-blue-200 to-cyan-200',
  },
  {
    value: 'deep-conversations',
    emoji: '🤝',
    label: 'Deep conversations',
    gradient: 'from-teal-200 to-emerald-200',
  },
  {
    value: 'fully-absorbed',
    emoji: '🎮',
    label: 'When fully absorbed in something',
    gradient: 'from-violet-200 to-purple-200',
  },
];

export function Question10PeakMoments({ selected, onSelect }: Question10Props) {
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
        When do you feel most yourself?
      </h2>
      <p className="text-lg text-gray-600 mb-8">
        Choose all the moments that resonate
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((option) => {
          const isSelected = selected.includes(option.value);

          return (
            <button
              key={option.value}
              onClick={() => handleToggle(option.value)}
              className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 text-center overflow-hidden ${
                isSelected
                  ? 'border-transparent shadow-2xl scale-105'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${option.gradient} transition-opacity ${
                isSelected ? 'opacity-60' : 'opacity-0 group-hover:opacity-20'
              }`}></div>

              <div className="relative z-10">
                <div className={`text-5xl mb-3 transition-transform ${
                  isSelected ? 'scale-125 animate-pulse' : 'group-hover:scale-110'
                }`}>
                  {option.emoji}
                </div>

                <h3 className="font-semibold text-lg text-gray-900">
                  {option.label}
                </h3>

                {isSelected && (
                  <div className="absolute top-4 right-4 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-200">
                    <svg className="w-4 h-4 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
