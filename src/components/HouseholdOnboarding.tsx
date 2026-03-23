import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Loader2, LogOut, User, Briefcase, Info } from 'lucide-react';
import { createHousehold, getUserHousehold } from '../lib/household';
import { useAuth } from '../core/auth/AuthProvider';

export function HouseholdOnboarding() {
  const [householdName, setHouseholdName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  // Check if household already exists on mount
  useEffect(() => {
    const checkExistingHousehold = async () => {
      try {
        const household = await getUserHousehold();
        if (household) {
          // Household exists, redirect to members onboarding or dashboard
          navigate('/onboarding/members', { replace: true });
        }
      } catch (err) {
        console.error('Error checking for existing household:', err);
      } finally {
        setChecking(false);
      }
    };

    checkExistingHousehold();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!householdName.trim()) {
      setError('Please enter a household name');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await createHousehold(householdName.trim());
      navigate('/onboarding/members');
    } catch (err) {
      console.error('Error creating household:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create household';
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Show loading state while checking for existing household
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center py-4 px-4 sm:py-12 sm:px-6 lg:px-8">
      <button
        onClick={signOut}
        className="absolute top-2 right-2 sm:top-4 sm:right-4 flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-lg transition-colors text-xs sm:text-sm"
      >
        <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
        <span className="font-medium hidden xs:inline">Log Out</span>
      </button>

      <div className="max-w-md w-full">
        <div className="text-center mb-4 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-full mb-3 sm:mb-4">
            <Home size={24} className="sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 px-2">Welcome to SharedMinds</h1>
          <p className="text-sm sm:text-base text-gray-600 px-2">Set up your Household workspace</p>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 md:p-8">
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center justify-center space-x-2 text-xs sm:text-sm text-gray-600">
              <span className="font-semibold text-blue-600">Step 1 of 2</span>
              <span>•</span>
              <span>Create Household</span>
            </div>
          </div>

          <div className="mb-4 sm:mb-6 space-y-4">
            <div className="p-3 sm:p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <Info size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">
                    Welcome to SharedMinds — Your Collaborative Workspace
                  </p>
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                    SharedMinds helps you organize your life across <strong>Personal</strong>, <strong>Household</strong>, and <strong>Team</strong> workspaces. You'll need to set up both your Personal account and a Household to get started.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User size={16} className="text-purple-600" />
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Personal Account</h3>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed mb-2">
                  <strong>Already set up!</strong> Your private workspace for:
                </p>
                <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                  <li>Private projects & goals</li>
                  <li>Personal calendar</li>
                  <li>Individual planning</li>
                  <li>Your own spaces</li>
                </ul>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Home size={16} className="text-blue-600" />
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Household</h3>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed mb-2">
                  <strong>Set this up now</strong> for collaboration with:
                </p>
                <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                  <li>Family & roommates</li>
                  <li>Shared calendars</li>
                  <li>Meal planning</li>
                  <li>Household tasks</li>
                </ul>
              </div>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase size={16} className="text-gray-600" />
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Teams (Optional)</h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Create Teams later for work colleagues, friend groups, or hobby clubs. You can set up Teams anytime from your dashboard.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" noValidate>
            <div>
              <label htmlFor="householdName" className="block text-sm font-medium text-gray-700 mb-2">
                Household Name
              </label>
              <input
                id="householdName"
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="e.g., The Smith Family"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-lg"
                disabled={loading}
                autoFocus
                autoComplete="off"
              />
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-500">
                Choose a name that represents your household (e.g., "The Smith Family", "123 Main St", "Our Home")
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                <p className="text-red-800 text-xs sm:text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !householdName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="sm:w-5 sm:h-5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                'Create Household'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
