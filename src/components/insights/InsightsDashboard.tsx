import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Home, User, Trophy, Users, BarChart3, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { FamilyOverviewDashboard } from './FamilyOverviewDashboard';
import { IndividualInsightsDashboard } from './IndividualInsightsDashboard';
import { AchievementsTimeline } from './AchievementsTimeline';
import { SocialInsightsDashboard } from './SocialInsightsDashboard';

type ViewType = 'overview' | 'individual' | 'timeline' | 'social';

export function InsightsDashboard() {
  const { householdId } = useParams<{ householdId: string }>();
  const { user } = useAuth();

  if (!householdId) {
    return <Navigate to="/planner" replace />;
  }
  const [currentView, setCurrentView] = useState<ViewType>('overview');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const handleSelectMember = (profileId: string) => {
    setSelectedMemberId(profileId);
    setCurrentView('individual');
  };

  const handleBackToOverview = () => {
    setCurrentView('overview');
    setSelectedMemberId(null);
  };

  const navigation = [
    {
      id: 'overview' as ViewType,
      label: 'Family Overview',
      icon: Home,
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'individual' as ViewType,
      label: 'My Insights',
      icon: User,
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      id: 'timeline' as ViewType,
      label: 'Timeline',
      icon: Trophy,
      gradient: 'from-yellow-500 to-orange-500'
    },
    {
      id: 'social' as ViewType,
      label: 'Household Dynamics',
      icon: Users,
      gradient: 'from-green-500 to-emerald-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Insights Dashboard</h1>
              <p className="text-gray-600">Your family's journey at a glance</p>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    if (item.id === 'individual' && !selectedMemberId && user) {
                      setSelectedMemberId(user.id);
                    }
                  }}
                  className={`flex items-center gap-3 px-5 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg scale-105`
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-3xl shadow-xl border-2 border-white p-8">
          {currentView === 'overview' && (
            <FamilyOverviewDashboard
              householdId={householdId}
              onSelectMember={handleSelectMember}
            />
          )}

          {currentView === 'individual' && selectedMemberId && (
            <IndividualInsightsDashboard
              profileId={selectedMemberId}
              householdId={householdId}
              onBack={selectedMemberId !== user?.id ? handleBackToOverview : undefined}
            />
          )}

          {currentView === 'timeline' && (
            <AchievementsTimeline householdId={householdId} />
          )}

          {currentView === 'social' && (
            <SocialInsightsDashboard householdId={householdId} />
          )}
        </div>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border-2 border-white shadow-lg">
            <BarChart3 size={16} className="text-blue-600" />
            <span className="text-sm text-gray-700">
              Data updates in real-time as your family completes habits and goals
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
