import { LucideIcon } from 'lucide-react';

type LifeAreaFeatureCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
  badge?: string;
};

export function LifeAreaFeatureCard({
  icon: Icon,
  title,
  description,
  color,
  onClick,
  badge
}: LifeAreaFeatureCardProps) {
  return (
    <button
      onClick={onClick}
      className="relative group bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 text-left border-2 border-transparent hover:border-current"
      style={{ color }}
    >
      {badge && (
        <div className="absolute -top-2 -right-2 bg-gradient-to-br from-orange-500 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          {badge}
        </div>
      )}
      <div className={`${color} w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  );
}
