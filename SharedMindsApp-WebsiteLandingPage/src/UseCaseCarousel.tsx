import { useState, useEffect } from 'react';
import { Home, Lightbulb, GraduationCap, Users } from 'lucide-react';

interface UseCase {
  text: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

export default function UseCaseCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  const useCases: UseCase[] = [
    {
      text: 'A parent organising a household',
      icon: Home,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    {
      text: 'A founder mapping a product',
      icon: Lightbulb,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      text: 'A student revising visually',
      icon: GraduationCap,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      text: 'A team sharing context',
      icon: Users,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % useCases.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [useCases.length]);

  return (
    <div className="py-16 space-y-8">
      <div className="relative h-32 flex items-center justify-center">
        {useCases.map((useCase, index) => {
          const Icon = useCase.icon;
          const isActive = index === activeIndex;

          return (
            <div
              key={index}
              className={`
                absolute inset-0 flex flex-col items-center justify-center gap-4
                transition-all duration-700 ease-in-out
                ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
              `}
            >
              <div className={`${useCase.bgColor} p-4 rounded-2xl`}>
                <Icon className={`w-8 h-8 ${useCase.color}`} />
              </div>
              <p className="text-lg text-slate-700 text-center max-w-md">
                {useCase.text}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-2">
        {useCases.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`
              h-1.5 rounded-full transition-all duration-300
              ${index === activeIndex ? 'w-8 bg-slate-400' : 'w-1.5 bg-slate-300'}
            `}
            aria-label={`Go to use case ${index + 1}`}
          />
        ))}
      </div>

      <p className="text-center text-xl text-slate-600 font-light italic pt-4">
        Different lives. Same canvas.
      </p>
    </div>
  );
}
