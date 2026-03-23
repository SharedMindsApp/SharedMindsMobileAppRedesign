interface Question7Props {
  selected: string[];
  onSelect: (values: string[]) => void;
}

const options = [
  { value: 'withdraw', label: 'Withdraw', description: 'I need to step back and be alone' },
  { value: 'emotional', label: 'Get emotional', description: 'My feelings come to the surface' },
  { value: 'freeze', label: 'Freeze', description: 'I get stuck and cannot move forward' },
  { value: 'overcompensate', label: 'Overcompensate', description: 'I try to fix everything at once' },
  { value: 'ask-help', label: 'Ask for help', description: 'I reach out to someone I trust' },
  { value: 'push-through', label: 'Try to push through', description: 'I keep going even when it is hard' },
];

export function Question7OverwhelmReactions({ selected, onSelect }: Question7Props) {
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
        How do you typically react to overwhelm?
      </h2>
      <p className="text-lg text-gray-600 mb-8">
        Choose all that feel true
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = selected.includes(option.value);

          return (
            <button
              key={option.value}
              onClick={() => handleToggle(option.value)}
              className={`group relative p-5 rounded-2xl border-2 transition-all duration-200 text-left ${
                isSelected
                  ? 'border-rose-400 bg-gradient-to-br from-rose-50 to-pink-50 shadow-lg scale-102'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-3 h-3 rounded-full mt-2 transition-all duration-200 ${
                  isSelected
                    ? 'bg-rose-500 shadow-lg animate-pulse'
                    : 'bg-gray-300'
                }`}></div>

                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">
                    {option.label}
                  </h3>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center animate-in zoom-in duration-150 flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
