import { Question } from '../lib/supabase';

interface QuestionInputProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
}

export function QuestionInput({ question, value, onChange }: QuestionInputProps) {
  if (question.type === 'text') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[120px] px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none text-gray-900 text-lg"
        placeholder="Type your answer here..."
      />
    );
  }

  if (question.type === 'scale') {
    const scaleValue = parseInt(value) || 0;
    const labels = question.metadata?.labels as string[] | undefined;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center gap-2">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              onClick={() => onChange(String(num))}
              className={`flex-1 py-4 px-6 rounded-lg font-semibold text-lg transition-all ${
                scaleValue === num
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
        {labels && labels.length === 2 && (
          <div className="flex justify-between text-sm text-gray-600 px-2">
            <span>{labels[0]}</span>
            <span>{labels[1]}</span>
          </div>
        )}
      </div>
    );
  }

  if (question.type === 'multiple_choice') {
    const options = (question.metadata?.options as string[]) || [];

    return (
      <div className="space-y-3">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => onChange(option)}
            className={`w-full text-left px-5 py-4 rounded-lg font-medium transition-all ${
              value === option
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

  return null;
}
