interface Question9Props {
  selected: string[];
  onSelect: (values: string[]) => void;
}

const options = [
  { value: 'direct-concise', label: 'Direct & concise' },
  { value: 'warm-friendly', label: 'Warm & friendly' },
  { value: 'context-first', label: 'Give me context first' },
  { value: 'main-point', label: 'Give me the main point' },
  { value: 'time-to-think', label: 'I need time to think' },
  { value: 'prefer-text', label: 'Prefer text' },
  { value: 'prefer-voice', label: 'Prefer voice' },
  { value: 'prefer-face-to-face', label: 'Prefer face-to-face' },
];

export function Question9CommunicationStyle({ selected, onSelect }: Question9Props) {
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
        How do you prefer to communicate?
      </h2>
      <p className="text-lg text-gray-600 mb-8">
        Choose all that feel right
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = selected.includes(option.value);

          return (
            <button
              key={option.value}
              onClick={() => handleToggle(option.value)}
              className={`group relative py-4 px-6 rounded-full border-2 transition-all duration-200 text-center ${
                isSelected
                  ? 'border-indigo-400 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg scale-105'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:shadow-md'
              }`}
            >
              <span className="font-medium">{option.label}</span>

              {isSelected && (
                <span className="ml-2 inline-block animate-in zoom-in duration-150">✓</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
