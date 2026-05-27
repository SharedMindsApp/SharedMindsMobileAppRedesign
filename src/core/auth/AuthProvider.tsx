import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { SpaceService } from '../services/SpaceService';
import { clearStoredAuthSession } from '../../lib/auth';

// Opt out of Vite HMR for this module. AuthContext is created at module load time;
// if HMR swapped this module, the new context object would not match the one
// already provided by the mounted AuthProvider, breaking every useAuth() consumer
// (e.g. NotificationProvider). A full-page reload is safer.
if (import.meta.hot) {
  import.meta.hot.decline();
}

export interface Profile {
    id: string;
    display_name: string;
    avatar_url: string | null;
    /** Face-verification status of the uploaded avatar. Only 'approved' means the user can turn off their camera in video sessions. */
    avatar_status?: 'none' | 'pending' | 'approved' | 'rejected_face' | 'rejected_safety';
    avatar_rejection_reason?: string | null;
    timezone: string;
    locale: string | null;
    neurotype: string | null;
    role?: 'free' | 'premium' | 'admin';
    pantry_access_enabled?: boolean;
    internal_role?: 'standard' | 'pantry' | 'internal' | 'developer';
    testing_mode_enabled?: boolean;
    onboarding_completed?: boolean;
    bio?: string | null;
    work_type?: string | null;
    work_types?: string[] | null;
    /** Industries / markets the user works in (e.g. ['healthcare','sports']).
     *  Curated list maintained client-side; collected in the onboarding wizard. */
    industries?: string[] | null;
    skills?: string[] | null;
    /** Self-rated proficiency per skill: { "Figma": 5, "React": 3 }. Optional —
     *  any skill in `skills` without an entry here is treated as unspecified. */
    skill_levels?: Record<string, number> | null;
    /** Lightweight networking signals — what this member can help others with. */
    offering?: string[] | null;
    /** Lightweight networking signals — what this member would love help with. */
    seeking?: string[] | null;
    /** Skills the user would love to find in *other people* (identity-oriented,
     *  distinct from seeking which is task-oriented). Drawn from SKILL_CATEGORIES. */
    wanted_skills?: string[] | null;
    location?: string | null;
    country_code?: string | null;
    city?: string | null;
    is_hidden_from_directory?: boolean;
    suspended_until?: string | null;
    warning_count?: number | null;
    /** Set when the user accepted the conduct gate (blocking modal before
     *  their first session). NULL = never accepted; show the modal. */
    conduct_accepted_at?: string | null;
    conduct_accepted_version?: string | null;
    /** NULL = user has not completed the v2 onboarding wizard.
     *  Non-NULL timestamp = wizard finished. Gate used in CoreApp.tsx. */
    wizard_v2_completed_at?: string | null;
    /** 0=Sunday 1=Monday … 6=Saturday — day chosen for weekly intention-setting. */
    intentions_reminder_day?: number | null;
    created_at: string;
    updated_at: string;
}

function extractDisplayNameFromUser(email: string, metadata: Record<string, any> | undefined): string {
    const rawName =
        metadata?.display_name ||
        metadata?.full_name ||
        metadata?.name ||
        [metadata?.given_name, metadata?.family_name].filter(Boolean).join(' ').trim();

    if (rawName && typeof rawName === 'string' && rawName.trim().length > 0) {
        return rawName.trim();
    }

    return email.split('@')[0] || 'Explorer';
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    profileReady: boolean; // true once fetchProfile has completed (even if profile is null)
    isAdmin: boolean;
    canAccessPantry: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

function profileHasPantryAccess(profile: Profile | null): boolean {
    if (!profile) return false;

    return Boolean(
        profile.pantry_access_enabled ||
        profile.testing_mode_enabled ||
        profile.role === 'admin' ||
        (profile.internal_role && ['pantry', 'internal', 'developer'].includes(profile.internal_role))
    );
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [profileReady, setProfileReady] = useState(false);
    const profileRef = useRef<Profile | null>(null);
    const hasInitializedRef = useRef(false);

    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    const fetchProfile = useCallback(async (userId: string) => {
        try {
            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (fetchError) {
                console.warn('[AuthContext] Error fetching profile (table may not exist or RLS denying):', fetchError.message);
                // Build a minimal in-memory profile so the app can still render
                const { data: sessionData } = await supabase.auth.getSession();
                const email = sessionData.session?.user?.email || '';
                const displayName = extractDisplayNameFromUser(email, sessionData.session?.user?.user_metadata);
                const fallbackProfile: Profile = {
                    id: userId,
                    display_name: displayName,
                    avatar_url: null,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    locale: null,
                    neurotype: null,
                    role: 'free',
                    pantry_access_enabled: false,
                    internal_role: 'standard',
                    testing_mode_enabled: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                setProfile(fallbackProfile);
                setProfileReady(true);
                return;
            }

            let currentUserProfile = data;

            if (!currentUserProfile) {
                console.log('[AuthContext] Profile not found, provisioning new profile...');
                const { data: sessionData } = await supabase.auth.getSession();
                const sessionUser = sessionData.session?.user;
                const userEmail = sessionUser?.email || '';
                const baseName = extractDisplayNameFromUser(userEmail, sessionUser?.user_metadata);

                // Capture timezone silently — see lib/auth.ts signUp()
                // for rationale. This is the auto-provision branch
                // (fires when an auth user lacks a profile row), so
                // we mirror the signUp() behaviour here.
                let browserTz: string | null = null;
                try { browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || null; }
                catch { /* old browser */ }

                const { data: newProfile, error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        display_name: baseName,
                        ...(browserTz ? { timezone: browserTz } : {}),
                    })
                    .select()
                    .single();

                if (insertError) {
                    console.warn('[AuthContext] Could not auto-provision profile:', insertError.message);
                    // Use a fallback in-memory profile so the UI still works
                    setProfile({
                        id: userId,
                        display_name: baseName,
                        avatar_url: null,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        locale: null,
                        neurotype: null,
                        role: 'free',
                        pantry_access_enabled: false,
                        internal_role: 'standard',
                        testing_mode_enabled: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    });
                    setProfileReady(true);
                    return;
                }

                currentUserProfile = newProfile;
            }

            // Enforce suspension/ban: if `suspended_until` is in the future,
            // sign the user out and surface a message. We do this before
            // marking profileReady so suspended users never see the dashboard.
            if (
              currentUserProfile.suspended_until &&
              new Date(currentUserProfile.suspended_until).getTime() > Date.now()
            ) {
              const untilDisplay = new Date(currentUserProfile.suspended_until)
                .toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
              try { await supabase.auth.signOut(); } catch { /* ignore */ }
              setProfile(null);
              setUser(null);
              setProfileReady(true);
              if (typeof window !== 'undefined') {
                alert(
                  `Your account is suspended until ${untilDisplay}.\n\n` +
                  `If you believe this is a mistake, email support@sharedminds.app.`
                );
                window.location.replace('/');
              }
              return;
            }

            setProfile(currentUserProfile);
            setProfileReady(true);

            // One-time timezone backfill for users who pre-date the
            // signup-time timezone capture. The profile schema default
            // is 'Europe/London' (a relic of the v1 schema). If the
            // user's saved value still equals the default but their
            // browser reports something different, they almost
            // certainly never explicitly set it — silently update.
            // Fire-and-forget; if it fails (RLS, network) the next
            // login retries.
            try {
                const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                if (
                    browserTz
                    && currentUserProfile.timezone === 'Europe/London'
                    && browserTz !== 'Europe/London'
                ) {
                    void supabase
                        .from('profiles')
                        .update({ timezone: browserTz })
                        .eq('id', userId);
                }
            } catch { /* old browser or RLS — non-fatal */ }

            // Backfill: if the avatar predates the verification system
            // (status='pending'), re-run it through the face check in the
            // background. Fire-and-forget — the result lands in the DB and
            // a future profile fetch will pick it up.
            if (
                currentUserProfile.avatar_status === 'pending' &&
                currentUserProfile.avatar_url
            ) {
                import('../services/ProfileService').then(({ reverifyExistingAvatar }) => {
                    reverifyExistingAvatar(userId, currentUserProfile.avatar_url!).catch(() => {
                        /* non-fatal */
                    });
                }).catch(() => { /* dynamic import failed — ignore */ });
            }

            // Only bootstrap space if we got a real DB profile (not a fallback)
            try {
                console.log('[AuthContext] Bootstrapping personal space...');
                await SpaceService.bootstrapPersonalSpace(userId);
            } catch (spaceErr) {
                console.warn('[AuthContext] Space bootstrap failed (non-fatal):', spaceErr);
            }
        } catch (error) {
            console.error('[AuthContext] Failed to fetch profile', error);
            setProfile(null);
            setProfileReady(true);
        }
    }, [setProfileReady]);

    const refreshProfile = useCallback(async () => {
        if (user?.id) {
            await fetchProfile(user.id);
        }
    }, [user?.id, fetchProfile]);

    useEffect(() => {
        let mounted = true;
        let timeoutId: NodeJS.Timeout | null = null;

        const initAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.warn('[AuthContext] Invalid session found in storage', error.message);
                    clearStoredAuthSession();
                    try {
                        await supabase.auth.signOut({ scope: 'local' });
                    } catch {
                        // Ignore local cleanup failures
                    }
                    if (mounted) {
                        setUser(null);
                        setProfile(null);
                        setLoading(false);
                        hasInitializedRef.current = true;
                    }
                    return;
                }

                if (mounted) {
                    setUser(session?.user ?? null);
                    hasInitializedRef.current = true;
                    setLoading(false);
                    if (session?.user) {
                        fetchProfile(session.user.id).catch(err => {
                            console.error('[AuthContext] Background profile fetch error', err);
                        });
                    } else {
                        setProfile(null);
                    }
                }
            } catch (error) {
                console.error('[AuthContext] Auth initialization failed', error);
                if (mounted) {
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                    hasInitializedRef.current = true;
                }
            } finally {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
            }
        };

        initAuth();

        timeoutId = setTimeout(() => {
            if (mounted) {
                setLoading((currentLoading) => {
                    if (currentLoading) {
                        console.warn('[AuthContext] Auth loading timeout - forcing loading state to false');
                        setUser((currentUser) => {
                            if (!currentUser) {
                                setProfile(null);
                            }
                            return currentUser;
                        });
                        return false;
                    }
                    return currentLoading;
                });
            }
        }, 5000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                (async () => {
                    if (mounted) {
                        setUser(session?.user ?? null);
                        setLoading(false);
                        if (session?.user) {
                            // Always re-fetch on SIGNED_IN (catches role changes mid-session).
                            // For other events only re-fetch if the user ID changed.
                            if (event === 'SIGNED_IN' || profileRef.current?.id !== session.user.id) {
                                await fetchProfile(session.user.id);
                            }
                        } else {
                            setProfile(null);
                        }
                    }
                })();
            }
        );

        // Re-fetch the profile whenever the window regains focus so that
        // DB changes (e.g. admin role promotion) are picked up without a full
        // page reload.
        const handleWindowFocus = () => {
            const uid = profileRef.current?.id;
            if (uid) {
                fetchProfile(uid).catch(() => {});
            }
        };
        window.addEventListener('focus', handleWindowFocus);
        return () => {
            mounted = false;
            subscription.unsubscribe();
            window.removeEventListener('focus', handleWindowFocus);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [fetchProfile]);

    const signOut = useCallback(async () => {
        try {
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
            window.location.replace('/');
        } catch (error) {
            console.error('[AuthContext] Error signing out:', error);
            window.location.replace('/');
        }
    }, []);

    const value = useMemo(
        () => ({
            user,
            profile,
            loading,
            profileReady,
            isAdmin: profile?.role === 'admin',
            canAccessPantry: profileHasPantryAccess(profile),
            signOut,
            refreshProfile,
        }),
        [user, profile, loading, profileReady, signOut, refreshProfile]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
