/**
 * LifeAreaMobileMenu - Shared Mobile Navigation for Life Areas
 * 
 * Compact, scannable mobile menu for Life Area feature selection.
 * Used across all 12 Life Areas for consistent mobile UX.
 * 
 * Desktop layouts remain unchanged - this component only renders on mobile.
 */

import { ChevronRight, LucideIcon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

export interface LifeAreaFeature {
  id: string;
  icon: LucideIcon;
  label: string;
  description?: string;
  route?: string;
  onClick?: () => void;
  badge?: string | number;
}

interface LifeAreaMobileMenuProps {
  features: LifeAreaFeature[];
  className?: string;
  themeColor?: string; // e.g., 'teal', 'blue', 'emerald', 'rose', etc.
}

// Color theme mapping for subtle icon accents
const getThemeColors = (themeColor?: string) => {
  const themes: Record<string, { 
    bg: string; 
    icon: string; 
    activeBg: string; 
    activeIcon: string;
    activeText: string;
    activeBorder: string;
    activeRing: string;
    activeChevron: string;
    activeDesc: string;
  }> = {
    teal: { 
      bg: 'bg-teal-50/60', 
      icon: 'text-teal-600/70', 
      activeBg: 'bg-teal-100', 
      activeIcon: 'text-teal-700',
      activeText: 'text-teal-900',
      activeBorder: 'border-teal-300/60',
      activeRing: 'ring-1 ring-teal-200/50',
      activeChevron: 'text-teal-600/70',
      activeDesc: 'text-teal-700/80',
    },
    blue: { 
      bg: 'bg-blue-50/60', 
      icon: 'text-blue-600/70', 
      activeBg: 'bg-blue-100', 
      activeIcon: 'text-blue-700',
      activeText: 'text-blue-900',
      activeBorder: 'border-blue-300/60',
      activeRing: 'ring-blue-200/50',
      activeChevron: 'text-blue-600/70',
      activeDesc: 'text-blue-700/80',
    },
    emerald: { 
      bg: 'bg-emerald-50/60', 
      icon: 'text-emerald-600/70', 
      activeBg: 'bg-emerald-100', 
      activeIcon: 'text-emerald-700',
      activeText: 'text-emerald-900',
      activeBorder: 'border-emerald-300/60',
      activeRing: 'ring-emerald-200/50',
      activeChevron: 'text-emerald-600/70',
      activeDesc: 'text-emerald-700/80',
    },
    rose: { 
      bg: 'bg-rose-50/60', 
      icon: 'text-rose-600/70', 
      activeBg: 'bg-rose-100', 
      activeIcon: 'text-rose-700',
      activeText: 'text-rose-900',
      activeBorder: 'border-rose-300/60',
      activeRing: 'ring-rose-200/50',
      activeChevron: 'text-rose-600/70',
      activeDesc: 'text-rose-700/80',
    },
    pink: { 
      bg: 'bg-pink-50/60', 
      icon: 'text-pink-600/70', 
      activeBg: 'bg-pink-100', 
      activeIcon: 'text-pink-700',
      activeText: 'text-pink-900',
      activeBorder: 'border-pink-300/60',
      activeRing: 'ring-pink-200/50',
      activeChevron: 'text-pink-600/70',
      activeDesc: 'text-pink-700/80',
    },
    cyan: { 
      bg: 'bg-cyan-50/60', 
      icon: 'text-cyan-600/70', 
      activeBg: 'bg-cyan-100', 
      activeIcon: 'text-cyan-700',
      activeText: 'text-cyan-900',
      activeBorder: 'border-cyan-300/60',
      activeRing: 'ring-cyan-200/50',
      activeChevron: 'text-cyan-600/70',
      activeDesc: 'text-cyan-700/80',
    },
    indigo: { 
      bg: 'bg-indigo-50/60', 
      icon: 'text-indigo-600/70', 
      activeBg: 'bg-indigo-100', 
      activeIcon: 'text-indigo-700',
      activeText: 'text-indigo-900',
      activeBorder: 'border-indigo-300/60',
      activeRing: 'ring-indigo-200/50',
      activeChevron: 'text-indigo-600/70',
      activeDesc: 'text-indigo-700/80',
    },
    amber: { 
      bg: 'bg-amber-50/60', 
      icon: 'text-amber-600/70', 
      activeBg: 'bg-amber-100', 
      activeIcon: 'text-amber-700',
      activeText: 'text-amber-900',
      activeBorder: 'border-amber-300/60',
      activeRing: 'ring-amber-200/50',
      activeChevron: 'text-amber-600/70',
      activeDesc: 'text-amber-700/80',
    },
    purple: { 
      bg: 'bg-purple-50/60', 
      icon: 'text-purple-600/70', 
      activeBg: 'bg-purple-100', 
      activeIcon: 'text-purple-700',
      activeText: 'text-purple-900',
      activeBorder: 'border-purple-300/60',
      activeRing: 'ring-purple-200/50',
      activeChevron: 'text-purple-600/70',
      activeDesc: 'text-purple-700/80',
    },
    violet: { 
      bg: 'bg-violet-50/60', 
      icon: 'text-violet-600/70', 
      activeBg: 'bg-violet-100', 
      activeIcon: 'text-violet-700',
      activeText: 'text-violet-900',
      activeBorder: 'border-violet-300/60',
      activeRing: 'ring-violet-200/50',
      activeChevron: 'text-violet-600/70',
      activeDesc: 'text-violet-700/80',
    },
    slate: { 
      bg: 'bg-slate-50/60', 
      icon: 'text-slate-600/70', 
      activeBg: 'bg-slate-100', 
      activeIcon: 'text-slate-700',
      activeText: 'text-slate-900',
      activeBorder: 'border-slate-300/60',
      activeRing: 'ring-slate-200/50',
      activeChevron: 'text-slate-600/70',
      activeDesc: 'text-slate-700/80',
    },
  };
  return themes[themeColor || 'blue'] || themes.blue;
};

export function LifeAreaMobileMenu({ features, className = '', themeColor }: LifeAreaMobileMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const theme = getThemeColors(themeColor);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Only render on mobile
  if (!isMobile) {
    return null;
  }

  const handleFeatureClick = (feature: LifeAreaFeature) => {
    if (feature.onClick) {
      feature.onClick();
    } else if (feature.route) {
      navigate(feature.route);
    }
  };

  const isActive = (feature: LifeAreaFeature) => {
    if (feature.route) {
      return location.pathname === feature.route || location.pathname.startsWith(feature.route + '/');
    }
    return false;
  };

  return (
    <div className={`space-y-0.5 ${className}`}>
      {features.map((feature) => {
        const Icon = feature.icon;
        const active = isActive(feature);

        return (
          <button
            key={feature.id}
            onClick={() => handleFeatureClick(feature)}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2.5
              bg-white border border-gray-200/80 rounded-md
              hover:bg-gray-50/80 active:bg-gray-100
              transition-colors
              min-h-[44px]
              text-left
              ${active ? `${theme.activeBg} ${theme.activeBorder} ${theme.activeRing}` : ''}
            `}
            aria-label={feature.label}
            aria-current={active ? 'page' : undefined}
          >
            {/* Icon with subtle color accent */}
            <div className={`
              flex-shrink-0 w-9 h-9 rounded-md flex items-center justify-center
              ${active 
                ? `${theme.activeBg} ${theme.activeIcon}` 
                : `${theme.bg} ${theme.icon}`
              }
            `}>
              <Icon size={16} strokeWidth={2} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`
                  text-sm font-medium leading-tight
                  ${active ? theme.activeText : 'text-gray-900'}
                `}>
                  {feature.label}
                </span>
                {feature.badge && (
                  <span className={`
                    text-xs font-medium px-1.5 py-0.5 rounded-full
                    ${active 
                      ? `${theme.activeBg} ${theme.activeIcon}` 
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {feature.badge}
                  </span>
                )}
              </div>
              {feature.description && (
                <p className={`
                  text-xs mt-0.5 line-clamp-1
                  ${active ? theme.activeDesc : 'text-gray-500'}
                `}>
                  {feature.description}
                </p>
              )}
            </div>

            {/* Chevron - smaller and lower opacity */}
            <ChevronRight 
              size={14} 
              className={`
                flex-shrink-0
                ${active ? theme.activeChevron : 'text-gray-400/50'}
              `} 
            />
          </button>
        );
      })}
    </div>
  );
}
