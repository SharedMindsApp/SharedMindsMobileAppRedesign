interface Question2Props {
  selected: string;
  onSelect: (value: string) => void;
}

const options = [
  {
    value: 'hyperfocus',
    label: 'Deep, intense focus',
    description: 'Like a spotlight - when I\'m in, I\'m all in',
    gradient: 'from-blue-500 to-indigo-600',
    animation: 'pulse',
  },
  {
    value: 'distractible',
    label: 'Easily pulled away',
    description: 'My attention bounces around like a ping pong ball',
    gradient: 'from-amber-500 to-orange-600',
    animation: 'bounce',
  },
  {
    value: 'steady',
    label: 'Calm and steady',
    description: 'Like a gentle river - consistent and flowing',
    gradient: 'from-teal-500 to-emerald-600',
    animation: 'flow',
  },
  {
    value: 'scattered',
    label: 'Scattered thoughts',
    description: 'Like clouds drifting - hard to pin down',
    gradient: 'from-purple-500 to-pink-600',
    animation: 'drift',
  },
];

export function Question2FocusType({ selected, onSelect }: Question2Props) {
  return (
    <div>
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
        What does focus feel like for you?
      </h2>
      <p className="text-lg text-gray-600 mb-8">
        Choose the one that feels most true
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((option) => {
          const isSelected = selected === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden ${
                isSelected
                  ? 'border-transparent shadow-2xl scale-105'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {isSelected && (
                <div className={`absolute inset-0 bg-gradient-to-br ${option.gradient} opacity-10`}></div>
              )}

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${option.gradient} shadow-lg`}>
                    <div className={`w-4 h-4 bg-white rounded-full ${
                      option.animation === 'pulse' ? 'animate-pulse' :
                      option.animation === 'bounce' ? 'animate-bounce' :
                      ''
                    }`}></div>
                  </div>
                  {isSelected && (
                    <div className="ml-auto w-6 h-6 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center animate-in zoom-in duration-200">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>

                <h3 className="font-semibold text-xl mb-2 text-gray-900">
                  {option.label}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
