import { Clock, Target, Hourglass, Bell, Waves } from 'lucide-react';

interface Question4Props {
  selected: string[];
  onSelect: (values: string[]) => void;
}

const options = [
  { value: 'slips-away', label: 'Time slips away from me', icon: Clock },
  { value: 'needs-schedule', label: 'I am great once something is scheduled', icon: Target },
  { value: 'underestimate', label: 'I underestimate how long things take', icon: Hourglass },
  { value: 'need-reminders', label: 'I need reminders to stay on track', icon: Bell },
  { value: 'rollercoaster', label: 'My time feels like a rollercoaster', icon: Waves },
];

export function Question4TimePerception({ selected, onSelect }: Question4Props) {
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
        How do you experience time?
      </h2>
      <p className="text-lg text-gray-600 mb-8">
        Choose all that resonate with you
      </p>

      <div className="grid grid-cols-1 gap-3">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = selected.includes(option.value);

          return (
            <button
              key={option.value}
              onClick={() => handleToggle(option.value)}
              className={`group relative p-5 rounded-2xl border-2 transition-all duration-200 text-left ${
                isSelected
                  ? 'border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg scale-102 animate-in zoom-in duration-150'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg'
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <Icon size={28} className={isSelected ? 'text-white' : 'text-gray-600'} />
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {option.label}
                  </h3>
                </div>

                {isSelected && (
                  <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center animate-in zoom-in duration-150">
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
