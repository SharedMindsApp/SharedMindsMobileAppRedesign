import { Eye, Headphones, Hand, Sparkles, Workflow, List } from 'lucide-react';

interface Question1Props {
  selected: string[];
  onSelect: (values: string[]) => void;
}

const options = [
  { value: 'visual', label: 'Visual thinker', icon: Eye, description: 'Pictures, diagrams, and imagery' },
  { value: 'audio', label: 'Audio thinker', icon: Headphones, description: 'Sounds, music, and spoken words' },
  { value: 'hands-on', label: 'Hands-on learner', icon: Hand, description: 'Touch, movement, and doing' },
  { value: 'patterns', label: 'Pattern finder', icon: Sparkles, description: 'Connections and systems' },
  { value: 'big-picture', label: 'Big-picture first', icon: Workflow, description: 'Overview before details' },
  { value: 'step-by-step', label: 'Step-by-step details', icon: List, description: 'Sequential and methodical' },
];

export function Question1ThinkingStyle({ selected, onSelect }: Question1Props) {
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
        How does your mind take in the world?
      </h2>
      <p className="text-lg text-gray-600 mb-8">
        Choose all that feel true for you
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = selected.includes(option.value);

          return (
            <button
              key={option.value}
              onClick={() => handleToggle(option.value)}
              className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                isSelected
                  ? 'border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg scale-105'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  isSelected
                    ? 'bg-gradient-to-br from-amber-400 to-orange-400 shadow-lg'
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <Icon size={28} className={isSelected ? 'text-white' : 'text-gray-600'} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold text-lg mb-1 transition-colors ${
                    isSelected ? 'text-amber-900' : 'text-gray-900'
                  }`}>
                    {option.label}
                  </h3>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </div>
              </div>

              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center animate-in zoom-in duration-200">
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
