import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Lock,
  Home,
  Users,
  Palette,
  Trash2,
  Save,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  ArrowLeft,
  Mail,
  Shield,
  UserPlus,
  Plus,
  MapPin,
  Globe,
} from 'lucide-react';
import { useAuth } from '../core/auth/AuthProvider';
import { supabase } from '../lib/supabase';
import { signOut } from '../lib/auth';
import { getUserHousehold, type Household } from '../lib/household';
import { HouseholdMembersManager } from './HouseholdMembersManager';
import { ManageMembers } from './ManageMembers';
import { CategoryColorSettings } from './tags/CategoryColorSettings';
import { FEATURE_CONTEXT_TAGGING } from '../lib/featureFlags';
import { NotificationSettings } from './notifications/NotificationSettings';
import { getUserSpaces, type SpaceListItem } from '../lib/sharedSpacesManagement';
import { SpaceDetailsView } from './shared/SpaceDetailsView';
import { CreateSpaceModal } from './shared/CreateSpaceModal';
import { useUIPreferences } from '../contexts/UIPreferencesContext';
import { showToast } from './Toast';

type Tab = 'profile' | 'security' | 'household' | 'teams' | 'members' | 'preferences' | 'notifications' | 'danger';

export function ProfileSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [household, setHousehold] = useState<Household | null>(null);
  const [households, setHouseholds] = useState<SpaceListItem[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);
  const [showCreateHousehold, setShowCreateHousehold] = useState(false);
  const [teams, setTeams] = useState<SpaceListItem[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const { config, updatePreferences } = useUIPreferences();
  const [defaultLocation, setDefaultLocation] = useState(config.recipeLocation || '');
  const [overrideLocation, setOverrideLocation] = useState(config.recipeLocationOverride || '');
  const [showOverride, setShowOverride] = useState(!!config.recipeLocationOverride);

  useEffect(() => {
    loadData();
  }, []);

  // Sync location state with config when it changes
  useEffect(() => {
    setDefaultLocation(config.recipeLocation || '');
    setOverrideLocation(config.recipeLocationOverride || '');
    setShowOverride(!!config.recipeLocationOverride);
  }, [config.recipeLocation, config.recipeLocationOverride]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (profile) {
        setFullName(profile.full_name || '');
        setEmail(profile.email || '');
      }

      try {
        const householdData = await getUserHousehold();
        setHousehold(householdData);
      } catch (householdErr) {
        console.log('No household found for user (expected for admin users)');
        setHousehold(null);
      }

      // Load all households and teams user is a member of
      try {
        const allSpaces = await getUserSpaces();
        const householdSpaces = allSpaces.filter(s => s.type === 'household');
        const teamSpaces = allSpaces.filter(s => s.type === 'team');
        setHouseholds(householdSpaces);
        setTeams(teamSpaces);
      } catch (err) {
        console.error('Error loading spaces:', err);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const { error: updateError } = await supabase.auth.updateUser({ email });

      if (updateError) throw updateError;

      setSuccess('Email update initiated. Please check your inbox to confirm the change.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error updating email:', err);
      setError(err.message || 'Failed to update email');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setError(null);
    setSuccess(null);

    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setSaving(true);

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error changing password:', err);
      setError(err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm account deletion');
      return;
    }

    if (
      !confirm(
        'Are you absolutely sure? This action cannot be undone. All your data will be permanently deleted.'
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const { error: deleteError } = await supabase.rpc('delete_user_account');

      if (deleteError) throw deleteError;

      await signOut();
      navigate('/');
    } catch (err: any) {
      console.error('Error deleting account:', err);
      setError(err.message || 'Failed to delete account');
    } finally {
      setSaving(false);
    }
  };

  const baseTabs = [
    { id: 'profile' as Tab, label: 'Profile', icon: User },
    { id: 'security' as Tab, label: 'Security', icon: Lock },
  ];

  const householdTabs = household
    ? [
      { id: 'household' as Tab, label: 'Household', icon: Home },
      { id: 'members' as Tab, label: 'Members', icon: Users },
    ]
    : [];

  const teamsTab = [
    { id: 'teams' as Tab, label: 'Teams', icon: Users },
  ];

  const additionalTabs = [
    { id: 'preferences' as Tab, label: 'UI Preferences', icon: Palette },
    { id: 'notifications' as Tab, label: 'Notifications', icon: Shield },
    { id: 'danger' as Tab, label: 'Danger Zone', icon: AlertTriangle },
  ];

  const tabs = [...baseTabs, ...householdTabs, ...teamsTab, ...additionalTabs];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-3 sm:space-y-6 px-4 sm:px-6 py-3 sm:py-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-0.5 sm:mb-2">Settings</h1>
          <p className="text-xs sm:text-base text-gray-600">Manage your account and preferences</p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0 px-2 sm:px-0 py-2 sm:py-0 min-h-[44px] sm:min-h-0"
        >
          <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Back</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex overflow-x-auto scrollbar-hide -mx-4 sm:-mx-1 px-4 sm:px-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-4 font-medium transition-colors whitespace-nowrap border-b-2 min-h-[44px] sm:min-h-0 flex-shrink-0 ${activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 bg-white'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span className="text-sm sm:text-base">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'profile' && (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h2 className="text-base sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-4">Profile Information</h2>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-6">
                  Update your personal information and email address
                </p>
              </div>

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm min-h-[44px] sm:min-h-0"
                  placeholder="Enter your full name"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 sm:py-2 px-6 sm:px-4 rounded-lg transition-colors disabled:cursor-not-allowed min-h-[44px] sm:min-h-0"
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

              <div className="pt-4 sm:pt-6 border-t border-gray-200">
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-4">Email Address</h3>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                  <p className="text-sm text-amber-800">
                    Changing your email will require verification. You'll receive a confirmation link
                    at your new email address.
                  </p>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm min-h-[44px] sm:min-h-0"
                      placeholder="your@email.com"
                    />
                  </div>
                  <button
                    onClick={handleUpdateEmail}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 sm:py-2 px-6 sm:px-4 rounded-lg transition-colors disabled:cursor-not-allowed min-h-[44px] sm:min-h-0"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Mail size={18} />
                        Update Email
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Location Settings */}
              <div className="pt-4 sm:pt-6 border-t border-gray-200">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <MapPin size={20} className="text-orange-600 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-1">User Location</h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Set your location to get culturally relevant content and local recommendations
                    </p>
                  </div>
                </div>

                {/* Active Location Display */}
                {(config.recipeLocationOverride || config.recipeLocation) && (
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Globe size={14} className="text-green-600 flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-medium text-green-900">Active Location:</span>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-green-800 break-words">
                      {config.recipeLocationOverride || config.recipeLocation}
                    </p>
                    {config.recipeLocationOverride && (
                      <p className="text-xs text-green-700 mt-1.5">(Temporary override - will use default when cleared)</p>
                    )}
                  </div>
                )}

                {/* Default Location */}
                <div className="mb-4 sm:mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Default Location
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Your home location (e.g., "United Kingdom", "London, UK", "New York, USA")
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={defaultLocation}
                      onChange={(e) => setDefaultLocation(e.target.value)}
                      onBlur={async () => {
                        if (defaultLocation.trim() !== (config.recipeLocation || '')) {
                          try {
                            await updatePreferences({ recipeLocation: defaultLocation.trim() || null });
                            showToast('success', 'Default location updated');
                          } catch (error) {
                            console.error('Failed to update location:', error);
                            showToast('error', 'Failed to update location');
                          }
                        }
                      }}
                      onKeyPress={async (e) => {
                        if (e.key === 'Enter') {
                          if (defaultLocation.trim() !== (config.recipeLocation || '')) {
                            try {
                              await updatePreferences({ recipeLocation: defaultLocation.trim() || null });
                              showToast('success', 'Default location updated');
                            } catch (error) {
                              console.error('Failed to update location:', error);
                              showToast('error', 'Failed to update location');
                            }
                          }
                        }
                      }}
                      placeholder="e.g., United Kingdom"
                      className="flex-1 px-3 sm:px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px] sm:min-h-0"
                      disabled={saving}
                    />
                  </div>
                </div>

                {/* Location Override */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Temporary Location Override
                    </label>
                    {!showOverride && (
                      <button
                        onClick={() => setShowOverride(true)}
                        className="text-sm text-orange-600 hover:text-orange-700 font-medium self-start sm:self-auto"
                      >
                        Set Override
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Use when traveling (e.g., on holiday). Overrides default location for recipe searches.
                  </p>
                  {showOverride && (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={overrideLocation}
                          onChange={(e) => setOverrideLocation(e.target.value)}
                          onBlur={async () => {
                            if (overrideLocation.trim() !== (config.recipeLocationOverride || '')) {
                              try {
                                await updatePreferences({ recipeLocationOverride: overrideLocation.trim() || null });
                                showToast('success', 'Location override updated');
                              } catch (error) {
                                console.error('Failed to update override:', error);
                                showToast('error', 'Failed to update override');
                              }
                            }
                          }}
                          onKeyPress={async (e) => {
                            if (e.key === 'Enter') {
                              if (overrideLocation.trim() !== (config.recipeLocationOverride || '')) {
                                try {
                                  await updatePreferences({ recipeLocationOverride: overrideLocation.trim() || null });
                                  showToast('success', 'Location override updated');
                                } catch (error) {
                                  console.error('Failed to update override:', error);
                                  showToast('error', 'Failed to update override');
                                }
                              }
                            }
                          }}
                          placeholder="e.g., Spain, Barcelona"
                          className="flex-1 px-3 sm:px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px] sm:min-h-0"
                          disabled={saving}
                        />
                      </div>
                      {config.recipeLocationOverride && (
                        <button
                          onClick={async () => {
                            try {
                              await updatePreferences({ recipeLocationOverride: null });
                              setOverrideLocation('');
                              setShowOverride(false);
                              showToast('success', 'Location override cleared');
                            } catch (error) {
                              console.error('Failed to clear override:', error);
                              showToast('error', 'Failed to clear override');
                            }
                          }}
                          disabled={saving}
                          className="w-full px-4 py-2.5 sm:py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] sm:min-h-0"
                        >
                          Clear Override
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h2 className="text-base sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-4">Security Settings</h2>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-6">
                  Update your password to keep your account secure
                </p>
              </div>

              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 sm:py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm min-h-[44px] sm:min-h-0"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 min-h-[44px] sm:min-h-0 flex items-center"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 sm:py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm min-h-[44px] sm:min-h-0"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 min-h-[44px] sm:min-h-0 flex items-center"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleChangePassword}
                disabled={saving || !newPassword || !confirmPassword}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 sm:py-2 px-6 sm:px-4 rounded-lg transition-colors disabled:cursor-not-allowed min-h-[44px] sm:min-h-0"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Changing...
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    Change Password
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'household' && (
            <div className="space-y-3 sm:space-y-6">
              {selectedHouseholdId ? (
                <SpaceDetailsView
                  spaceId={selectedHouseholdId}
                  onBack={() => {
                    setSelectedHouseholdId(null);
                    loadData(); // Reload to refresh list
                  }}
                  onSpaceUpdated={() => {
                    loadData(); // Reload to refresh list
                  }}
                />
              ) : (
                <>
                  <div className="mb-3 sm:mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-2 sm:mb-0">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base sm:text-xl font-semibold text-gray-900 mb-0.5 sm:mb-2">Household Management</h2>
                        <p className="text-xs sm:text-sm text-gray-600">
                          Manage your households, permissions, and members
                        </p>
                      </div>
                      <button
                        onClick={() => setShowCreateHousehold(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium min-h-[44px] sm:min-h-0"
                      >
                        <Plus size={18} />
                        <span>Create Household</span>
                      </button>
                    </div>
                  </div>

                  {households.length === 0 ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 text-center">
                      <Home className="w-10 h-10 sm:w-12 sm:h-12 text-blue-400 mx-auto mb-2 sm:mb-3" />
                      <p className="text-xs sm:text-base text-blue-900 mb-3 sm:mb-4">
                        You don't have any households yet. Create one to get started.
                      </p>
                      <button
                        onClick={() => setShowCreateHousehold(true)}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]"
                      >
                        Create Household
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {households.map((h) => {
                        const getRoleBadge = (role: string | null) => {
                          if (!role) return null;
                          const colors = {
                            owner: 'bg-purple-100 text-purple-700',
                            admin: 'bg-blue-100 text-blue-700',
                            member: 'bg-gray-100 text-gray-700',
                            viewer: 'bg-gray-50 text-gray-600',
                          };
                          return (
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-medium ${colors[role as keyof typeof colors] || colors.member
                                }`}
                            >
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </span>
                          );
                        };

                        const isPending = h.currentUserStatus === 'pending';

                        return (
                          <button
                            key={h.id}
                            onClick={() => setSelectedHouseholdId(h.id)}
                            className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left min-h-[44px]"
                          >
                            <div className="p-2 rounded-lg bg-blue-50 flex-shrink-0">
                              <Home size={20} className="text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 truncate">{h.name}</h3>
                                {isPending && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">
                                    Pending
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>{h.memberCount} member{h.memberCount !== 1 ? 's' : ''}</span>
                                {h.currentUserRole && getRoleBadge(h.currentUserRole)}
                              </div>
                            </div>
                            <svg
                              className="w-5 h-5 text-gray-400 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="space-y-3 sm:space-y-6">
              {selectedTeamId ? (
                <SpaceDetailsView
                  spaceId={selectedTeamId}
                  onBack={() => {
                    setSelectedTeamId(null);
                    loadData(); // Reload to refresh list
                  }}
                  onSpaceUpdated={() => {
                    loadData(); // Reload to refresh list
                  }}
                />
              ) : (
                <>
                  <div className="mb-3 sm:mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-2 sm:mb-0">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base sm:text-xl font-semibold text-gray-900 mb-0.5 sm:mb-2">Team Management</h2>
                        <p className="text-xs sm:text-sm text-gray-600">
                          Manage your teams, permissions, and members
                        </p>
                      </div>
                      <button
                        onClick={() => setShowCreateTeam(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium min-h-[44px] sm:min-h-0"
                      >
                        <Plus size={18} />
                        <span>Create Team</span>
                      </button>
                    </div>
                  </div>

                  {teams.length === 0 ? (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 sm:p-6 text-center">
                      <Users className="w-10 h-10 sm:w-12 sm:h-12 text-purple-400 mx-auto mb-2 sm:mb-3" />
                      <p className="text-xs sm:text-base text-purple-900 mb-3 sm:mb-4">
                        You don't have any teams yet. Create one to get started.
                      </p>
                      <button
                        onClick={() => setShowCreateTeam(true)}
                        className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors min-h-[44px]"
                      >
                        Create Team
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {teams.map((t) => {
                        const getRoleBadge = (role: string | null) => {
                          if (!role) return null;
                          const colors = {
                            owner: 'bg-purple-100 text-purple-700',
                            admin: 'bg-blue-100 text-blue-700',
                            member: 'bg-gray-100 text-gray-700',
                            viewer: 'bg-gray-50 text-gray-600',
                          };
                          return (
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-medium ${colors[role as keyof typeof colors] || colors.member
                                }`}
                            >
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </span>
                          );
                        };

                        const isPending = t.currentUserStatus === 'pending';

                        return (
                          <button
                            key={t.id}
                            onClick={() => setSelectedTeamId(t.id)}
                            className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left min-h-[44px]"
                          >
                            <div className="p-2 rounded-lg bg-purple-50 flex-shrink-0">
                              <Users size={20} className="text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 truncate">{t.name}</h3>
                                {isPending && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">
                                    Pending
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>{t.memberCount} member{t.memberCount !== 1 ? 's' : ''}</span>
                                {t.currentUserRole && getRoleBadge(t.currentUserRole)}
                              </div>
                            </div>
                            <svg
                              className="w-5 h-5 text-gray-400 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-3 sm:space-y-6">
              {household ? (
                <>
                  <div>
                    <h2 className="text-base sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-4">Questionnaire Members</h2>
                    <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-6">
                      Manage who fills out questionnaires in your household
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-6">
                    <button
                      onClick={() => navigate('/settings/members')}
                      className="w-full flex items-center justify-between p-3 sm:p-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-left min-h-[44px] sm:min-h-0"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Users size={20} className="text-gray-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 text-sm sm:text-base">Manage Questionnaire Members</p>
                          <p className="text-xs sm:text-sm text-gray-600 truncate">
                            Add, edit, or remove members who complete questionnaires
                          </p>
                        </div>
                      </div>
                      <UserPlus size={20} className="text-gray-400 flex-shrink-0 ml-2" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
                  <p className="text-sm sm:text-base text-blue-900 mb-4">
                    You need to create a household before managing members.
                  </p>
                  <button
                    onClick={() => navigate('/onboarding/household')}
                    className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] sm:min-h-0"
                  >
                    Create Household
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-3 sm:space-y-6">
              <div>
                <h2 className="text-base sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-4">UI Preferences</h2>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-6">
                  Customize the interface to match your needs and preferences
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-6">
                <button
                  onClick={() => navigate('/settings/ui-preferences')}
                  className="w-full flex items-center justify-between p-3 sm:p-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-left min-h-[44px] sm:min-h-0"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Palette size={20} className="text-gray-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm sm:text-base">Customize UI Preferences</p>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">
                        Adjust layout, colors, fonts, and accessibility settings
                      </p>
                    </div>
                  </div>
                  <Palette size={20} className="text-gray-400 flex-shrink-0 ml-2" />
                </button>
              </div>

              {/* Tag Category Colors */}
              {FEATURE_CONTEXT_TAGGING && user?.id && (
                <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6">
                  <CategoryColorSettings userId={user.id} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && <NotificationSettings />}

          {activeTab === 'danger' && (
            <div className="space-y-3 sm:space-y-6">
              <div>
                <h2 className="text-base sm:text-xl font-semibold text-red-600 mb-1 sm:mb-4 flex items-center gap-2">
                  <AlertTriangle size={18} className="sm:w-6 sm:h-6" />
                  Danger Zone
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-6">
                  Irreversible actions that will permanently affect your account
                </p>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-red-900 mb-2">Delete Account</h3>
                <p className="text-sm text-red-700 mb-4">
                  Once you delete your account, there is no going back. All your data, including
                  household information, questionnaires, and reports, will be permanently deleted.
                </p>

                <div className="bg-white rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                  <label htmlFor="deleteConfirm" className="block text-sm font-medium text-gray-700 mb-2">
                    Type <span className="font-bold text-red-600">DELETE</span> to confirm
                  </label>
                  <input
                    id="deleteConfirm"
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-base sm:text-sm min-h-[44px] sm:min-h-0"
                    placeholder="Type DELETE"
                  />
                </div>

                <button
                  onClick={handleDeleteAccount}
                  disabled={saving || deleteConfirmText !== 'DELETE'}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold py-3 sm:py-2 px-6 sm:px-4 rounded-lg transition-colors disabled:cursor-not-allowed min-h-[44px] sm:min-h-0"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Delete My Account
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Household Modal */}
      <CreateSpaceModal
        isOpen={showCreateHousehold}
        onClose={() => setShowCreateHousehold(false)}
        defaultType="household"
        onSpaceCreated={() => {
          setShowCreateHousehold(false);
          loadData(); // Reload to show new household
        }}
      />

      {/* Create Team Modal */}
      <CreateSpaceModal
        isOpen={showCreateTeam}
        onClose={() => setShowCreateTeam(false)}
        defaultType="team"
        onSpaceCreated={() => {
          setShowCreateTeam(false);
          loadData(); // Reload to show new team
        }}
      />
    </div>
  );
}
