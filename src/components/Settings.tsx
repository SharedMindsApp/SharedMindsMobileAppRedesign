import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  Info,
  LogOut,
  Save,
  Loader2,
  ArrowRight,
  UserPlus,
  Crown,
  Shield,
  Copy,
  Check,
  Palette,
  UtensilsCrossed,
  Calendar,
  Bug,
} from 'lucide-react';
import { getUserHousehold, Household, getCurrentMembership, HouseholdMember } from '../lib/household';
import { signOut } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { getDailyAlignmentEnabled, setDailyAlignmentEnabled } from '../lib/regulation/dailyAlignmentService';
import { DebugPanel } from './system/DebugPanel';
import { getErrorCounts } from '../lib/errorLogger';

export function Settings() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [membership, setMembership] = useState<HouseholdMember | null>(null);
  const [householdName, setHouseholdName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copiedHouseholdId, setCopiedHouseholdId] = useState(false);
  const [dailyAlignmentEnabled, setDailyAlignmentEnabledState] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const navigate = useNavigate();

  const isOwner = membership?.role === 'owner';

  function copyHouseholdId() {
    if (household?.id) {
      navigator.clipboard.writeText(household.id);
      setCopiedHouseholdId(true);
      setTimeout(() => setCopiedHouseholdId(false), 2000);
    }
  }

  useEffect(() => {
    loadHousehold();
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const enabled = await getDailyAlignmentEnabled(user.id);
        setDailyAlignmentEnabledState(enabled);
      }
    } catch (err) {
      console.error('Error loading user settings:', err);
    }
  };

  const loadHousehold = async () => {
    try {
      setLoading(true);
      const householdData = await getUserHousehold();

      if (!householdData) {
        navigate('/onboarding/household');
        return;
      }

      setHousehold(householdData);
      setHouseholdName(householdData.name);

      const membershipData = await getCurrentMembership(householdData.id);
      setMembership(membershipData);
    } catch (err) {
      console.error('Error loading household:', err);
      setError('Failed to load household settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDailyAlignment = async () => {
    if (!userId) return;

    const newValue = !dailyAlignmentEnabled;
    const success = await setDailyAlignmentEnabled(userId, newValue);
    if (success) {
      setDailyAlignmentEnabledState(newValue);
    }
  };

  const handleSave = async () => {
    if (!household || !householdName.trim()) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const { error: updateError } = await supabase
        .from('spaces')
        .update({ name: householdName.trim(), updated_at: new Date().toISOString() })
        .eq('id', household.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      await loadHousehold();
    } catch (err) {
      console.error('Error updating household:', err);
      setError('Failed to update household name');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await signOut();
      navigate('/auth/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your household and preferences</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Home size={20} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Household Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="householdName" className="block text-sm font-medium text-gray-700 mb-2">
                Household Name
              </label>
              <input
                id="householdName"
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter household name"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">Household name updated successfully!</p>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !householdName.trim() || householdName === household?.name}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Plan & Subscription</h3>
          <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isOwner && <Crown size={18} className="text-amber-500" />}
                <p className="font-bold text-gray-900 capitalize">{household?.plan || 'Free'} Plan</p>
              </div>
              {isOwner && household?.plan === 'free' && (
                <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                  Upgrade
                </button>
              )}
            </div>
            {!isOwner && (
              <p className="text-sm text-gray-600">
                Plan managed by billing owner. Contact them to change your plan.
              </p>
            )}
            {isOwner && (
              <p className="text-sm text-gray-600">
                {household?.plan === 'free'
                  ? 'Upgrade to Premium for advanced insights and unlimited reports.'
                  : 'You have access to all premium features.'}
              </p>
            )}
          </div>
        </div>

        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Household Information</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Household ID
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={household?.id || ''}
                readOnly
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono"
              />
              <button
                onClick={copyHouseholdId}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {copiedHouseholdId ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Share this ID with professionals who need access to your household insights
            </p>
          </div>
        </div>

        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            {isOwner && (
              <button
                onClick={() => navigate('/settings/professional-access')}
                className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Shield size={20} className="text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Professional Access</p>
                    <p className="text-sm text-gray-600">
                      Manage which professionals can view your insights
                    </p>
                  </div>
                </div>
                <ArrowRight size={20} className="text-gray-400" />
              </button>
            )}

            <button
              onClick={() => navigate('/settings/household-access')}
              className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <UserPlus size={20} className="text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Household Access</p>
                  <p className="text-sm text-gray-600">
                    {isOwner ? 'Invite people to access your household' : 'View who has access to your household'}
                  </p>
                </div>
              </div>
              <ArrowRight size={20} className="text-gray-400" />
            </button>

            <button
              onClick={() => navigate('/settings/members')}
              className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Users size={20} className="text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Questionnaire Members</p>
                  <p className="text-sm text-gray-600">Manage who fills out questionnaires</p>
                </div>
              </div>
              <ArrowRight size={20} className="text-gray-400" />
            </button>

            <button
              onClick={() => navigate('/settings/ui-preferences')}
              className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Palette size={20} className="text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">UI Preferences</p>
                  <p className="text-sm text-gray-600">Customize layout, colors, and accessibility</p>
                </div>
              </div>
              <ArrowRight size={20} className="text-gray-400" />
            </button>

            <button
              onClick={() => navigate('/settings/meal-preferences')}
              className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <UtensilsCrossed size={20} className="text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Meal Preferences</p>
                  <p className="text-sm text-gray-600">Manage dietary preferences and meal schedules</p>
                </div>
              </div>
              <ArrowRight size={20} className="text-gray-400" />
            </button>

            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <Calendar size={20} className="text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Daily Alignment</p>
                  <p className="text-sm text-gray-600">Plan your day with a loose, non-binding schedule</p>
                </div>
              </div>
              <button
                onClick={handleToggleDailyAlignment}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  dailyAlignmentEnabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    dailyAlignmentEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <button
              onClick={() => navigate('/calendar/personal')}
              className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Calendar size={20} className="text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Personal Calendar</p>
                  <p className="text-sm text-gray-600">Manage your personal events and time commitments</p>
                </div>
              </div>
              <ArrowRight size={20} className="text-gray-400" />
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Home size={20} className="text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Back to Dashboard</p>
                  <p className="text-sm text-gray-600">Return to your main dashboard</p>
                </div>
              </div>
              <ArrowRight size={20} className="text-gray-400" />
            </button>

            <button
              onClick={() => setShowDebugPanel(true)}
              className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Bug size={20} className="text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Debug Panel</p>
                  <p className="text-sm text-gray-600">
                    View app logs and debug information
                    {(() => {
                      const counts = getErrorCounts();
                      const total = counts.error + counts.warn;
                      return total > 0 ? ` (${total} issues)` : '';
                    })()}
                  </p>
                </div>
              </div>
              <ArrowRight size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-6 bg-gray-50">
          <div className="flex items-center gap-3 mb-3">
            <Info size={20} className="text-gray-600" />
            <h3 className="font-semibold text-gray-900">App Information</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            SharedMinds helps households understand each other better through structured questionnaires
            and AI-powered insights.
          </p>
          <p className="text-xs text-gray-500">Version 1.0.0</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Account</h3>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium transition-colors"
        >
          <LogOut size={18} />
          Log Out
        </button>
      </div>

      {/* Debug Panel */}
      <DebugPanel isOpen={showDebugPanel} onClose={() => setShowDebugPanel(false)} />
    </div>
  );
}
