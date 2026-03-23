interface Question5Props {
  selected: string;
  onSelect: (value: string) => void;
}

const options = [
  { value: 'slow', label: 'Slow and steady', emoji: '🐢', speed: 'slow' },
  { value: 'calm', label: 'Calm pace', emoji: '🚶', speed: 'medium' },
  { value: 'fast', label: 'Fast thinker', emoji: '🏃', speed: 'fast' },
  { value: 'lightning', label: 'Lightning-speed thoughts', emoji: '⚡', speed: 'ultra' },
];

export function Question5ThinkingSpeed({ selected, onSelect }: Question5Props) {
  return (
    <div>
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
        How fast does your mind move?
      </h2>
      <p className="text-lg text-gray-600 mb-8">
        There's no better or worse — just different speeds
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((option) => {
          const isSelected = selected === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 text-center overflow-hidden ${
                isSelected
                  ? 'border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50 shadow-xl scale-105'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className={`text-6xl mb-4 transition-all duration-300 ${
                option.speed === 'slow' ? isSelected ? 'animate-pulse' : '' :
                option.speed === 'medium' ? isSelected ? 'animate-bounce' : '' :
                option.speed === 'fast' ? isSelected ? 'animate-bounce' : '' :
                option.speed === 'ultra' ? isSelected ? 'animate-ping' : '' :
                ''
              }`}>
                <span className="inline-block">{option.emoji}</span>
              </div>

              <h3 className="font-semibold text-xl text-gray-900 mb-1">
                {option.label}
              </h3>

              {isSelected && (
                <div className="absolute top-4 right-4 w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center animate-in zoom-in duration-200">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
