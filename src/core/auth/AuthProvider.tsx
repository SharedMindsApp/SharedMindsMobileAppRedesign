import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { SpaceService } from '../services/SpaceService';

export interface Profile {
    id: string;
    display_name: string;
    avatar_url: string | null;
    timezone: string;
    locale: string | null;
    neurotype: string | null;
    role?: 'free' | 'premium' | 'admin';
    pantry_access_enabled?: boolean;
    internal_role?: 'standard' | 'pantry' | 'internal' | 'developer';
    testing_mode_enabled?: boolean;
    created_at: string;
    updated_at: string;
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
                const fallbackProfile: Profile = {
                    id: userId,
                    display_name: email.split('@')[0] || 'Explorer',
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
                const baseName = userEmail.split('@')[0] || 'Explorer';

                const { data: newProfile, error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        display_name: baseName,
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

            setProfile(currentUserProfile);
            setProfileReady(true);

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
                            if (profileRef.current?.id !== session.user.id) {
                                await fetchProfile(session.user.id);
                            }
                        } else {
                            setProfile(null);
                        }
                    }
                })();
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
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
