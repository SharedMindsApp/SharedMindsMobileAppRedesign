interface Question6Props {
  selected: string[];
  onSelect: (values: string[]) => void;
}

const options = [
  {
    value: 'bright-bold',
    label: 'Bright & bold',
    emoji: '💡',
    description: 'I love vivid colors and high energy',
    bgGradient: 'from-yellow-200 to-orange-200',
  },
  {
    value: 'soft-quiet',
    label: 'Soft & quiet',
    emoji: '🌫',
    description: 'I prefer muted tones and calm spaces',
    bgGradient: 'from-gray-100 to-slate-200',
  },
  {
    value: 'noisy-energising',
    label: 'Noisy but energising',
    emoji: '🔊',
    description: 'I thrive in bustling environments',
    bgGradient: 'from-red-200 to-pink-200',
  },
  {
    value: 'low-noise-cosy',
    label: 'Low-noise & cosy',
    emoji: '🎧',
    description: 'I need peaceful, comfortable spaces',
    bgGradient: 'from-blue-100 to-indigo-100',
  },
  {
    value: 'easily-overstimulated',
    label: 'Easily overstimulated',
    emoji: '🌀',
    description: 'Too much input overwhelms me quickly',
    bgGradient: 'from-purple-100 to-pink-100',
  },
];

export function Question6SensoryWorld({ selected, onSelect }: Question6Props) {
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
        Which sensory world feels most like you?
      </h2>
      <p className="text-lg text-gray-600 mb-8">
        Choose all that apply
      </p>

      <div className="grid grid-cols-1 gap-4">
        {options.map((option) => {
          const isSelected = selected.includes(option.value);

          return (
            <button
              key={option.value}
              onClick={() => handleToggle(option.value)}
              className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden ${
                isSelected
                  ? 'border-transparent shadow-xl scale-102'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${option.bgGradient} transition-opacity ${
                isSelected ? 'opacity-40' : 'opacity-0 group-hover:opacity-10'
              }`}></div>

              <div className="relative z-10 flex items-center gap-4">
                <div className="text-5xl">
                  {option.emoji}
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-xl text-gray-900 mb-1">
                    {option.label}
                  </h3>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </div>

                {isSelected && (
                  <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center animate-in zoom-in duration-200">
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
