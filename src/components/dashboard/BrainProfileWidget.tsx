import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Sparkles, ChevronRight, Eye, Edit2 } from 'lucide-react';
import { getBrainProfile, getBrainProfileCards } from '../../lib/brainProfile';
import { BrainProfile, BrainProfileCard } from '../../lib/brainProfileTypes';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import { COLOR_THEMES } from '../../lib/uiPreferencesTypes';

export function BrainProfileWidget() {
  const navigate = useNavigate();
  const { config } = useUIPreferences();
  const [profile, setProfile] = useState<BrainProfile | null>(null);
  const [cards, setCards] = useState<BrainProfileCard[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = COLOR_THEMES[config.colorTheme];
  const transitionClass = config.reducedMotion ? '' : 'transition-all duration-300';

  useEffect(() => {
    loadBrainProfile();
  }, []);

  const loadBrainProfile = async () => {
    try {
      const profileData = await getBrainProfile();
      setProfile(profileData);

      if (profileData) {
        const cardsData = await getBrainProfileCards();
        setCards(cardsData.filter(card => card.is_visible));
      }
    } catch (err) {
      console.error('Error loading brain profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!profile) {
    return (
      <div className={`${theme.cardBg} rounded-2xl shadow-lg border border-gray-200 overflow-hidden`}>
        <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Brain size={28} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">My Brain Profile</h2>
                  <p className="text-white/90 text-sm">New Feature</p>
                </div>
              </div>
              <Sparkles size={24} className="text-yellow-300" />
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-700 mb-4 leading-relaxed">
            Create a personalized profile that helps others understand how you think, communicate, and work best. Quick, non-diagnostic, and completely private.
          </p>

          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
              <span>How your brain processes information</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
              <span>Your communication preferences</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-600"></div>
              <span>What helps when you're overwhelmed</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/brain-profile/onboarding')}
            className={`w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-xl ${transitionClass} flex items-center justify-center gap-2 shadow-md hover:shadow-lg`}
          >
            <Sparkles size={20} />
            Create Your Profile
            <ChevronRight size={20} />
          </button>

          <p className="text-xs text-gray-500 text-center mt-3">
            Takes only 2-3 minutes
          </p>
        </div>
      </div>
    );
  }

  const visibleCardsCount = cards.length;
  const completedDate = new Date(profile.completed_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className={`${theme.cardBg} rounded-2xl shadow-lg border border-gray-200 overflow-hidden`}>
      <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Brain size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">My Brain Profile</h2>
                <p className="text-white/90 text-sm">Completed {completedDate}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-white/90" />
                <span className="text-white font-medium text-sm">
                  {visibleCardsCount} {visibleCardsCount === 1 ? 'card' : 'cards'} active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-3 mb-5">
          {cards.slice(0, 3).map((card) => {
            const icons: Record<string, string> = {
              how_brain_works: '🧠',
              communication: '💬',
              struggling: '🆘',
              support_others: '🤝',
            };

            return (
              <div
                key={card.id}
                className="flex items-start gap-3 p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100"
              >
                <span className="text-2xl">{icons[card.card_type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm mb-1">{card.title}</p>
                  <p className="text-xs text-gray-600 line-clamp-1">
                    {card.content[0] || 'No content yet'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/brain-profile/cards')}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-medium ${transitionClass}`}
          >
            <Eye size={18} />
            View Cards
          </button>
          <button
            onClick={() => navigate('/brain-profile/onboarding')}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 font-medium ${transitionClass}`}
          >
            <Edit2 size={18} />
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
