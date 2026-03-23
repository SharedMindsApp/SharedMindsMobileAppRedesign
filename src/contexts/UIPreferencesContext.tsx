import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../core/auth/AuthProvider';
import { useViewAs } from './ViewAsContext';
import { triggerGlitchTransition } from '../lib/glitchTransition';
import type {
  NeurotypeProfile,
  UserUIPreferences,
  UIPreferencesConfig,
  WidgetColorToken,
  WidgetTypeId,
  WidgetColorPreferences,
} from '../lib/uiPreferencesTypes';
import { DEFAULT_WIDGET_COLORS } from '../lib/uiPreferencesTypes';

interface UIPreferencesContextType {
  config: UIPreferencesConfig;
  preferences: UserUIPreferences | null;
  neurotypeProfiles: NeurotypeProfile[];
  neurotype: string | null;
  loading: boolean;
  appTheme: 'light' | 'dark' | 'neon-dark';
  measurementSystem: 'metric' | 'imperial';
  recipeLocation: string | null; // Active location (override if set, otherwise default)
  updatePreferences: (updates: Partial<UIPreferencesConfig>) => Promise<void>;
  setNeurotypeProfile: (profileId: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  updateCustomOverride: (key: string, value: any) => Promise<void>;
  getCustomOverride: (key: string, defaultValue?: any) => any;
  setAppTheme: (theme: 'light' | 'dark' | 'neon-dark') => Promise<void>;
  getWidgetColor: (widgetType: WidgetTypeId) => WidgetColorToken;
  setWidgetColor: (widgetType: WidgetTypeId, color: WidgetColorToken) => Promise<void>;
  getWidgetColors: () => WidgetColorPreferences;
  getTrackerColor: (trackerId: string) => WidgetColorToken | null;
  setTrackerColor: (trackerId: string, color: WidgetColorToken) => Promise<void>;
}

const DEFAULT_CONFIG: UIPreferencesConfig = {
  layoutMode: 'standard',
  uiDensity: 'standard',
  fontScale: 'm',
  colorTheme: 'default',
  contrastLevel: 'normal',
  reducedMotion: false,
  appTheme: 'light',
  measurementSystem: 'metric',
  recipeLocation: null,
  recipeLocationOverride: null,
  includeLocationInAI: true, // Default: include location in AI prompts
};

const UIPreferencesContext = createContext<UIPreferencesContextType | undefined>(undefined);

export function UIPreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { viewAsNeurotype } = useViewAs();
  const [config, setConfig] = useState<UIPreferencesConfig>(DEFAULT_CONFIG);
  const [preferences, setPreferences] = useState<UserUIPreferences | null>(null);
  const [neurotypeProfiles, setNeurotypeProfiles] = useState<NeurotypeProfile[]>([]);
  const [neurotype, setNeurotype] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNeurotypeProfiles();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserPreferences();
    } else {
      setConfig(DEFAULT_CONFIG);
      setPreferences(null);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (viewAsNeurotype && neurotypeProfiles.length > 0) {
      const profile = neurotypeProfiles.find((p) => p.name === viewAsNeurotype);
      if (profile) {
        setConfig({
          layoutMode: profile.default_layout,
          uiDensity: profile.default_density,
          fontScale: profile.default_theme.fontScale,
          colorTheme: profile.default_theme.colorTheme,
          contrastLevel: profile.default_theme.contrastLevel,
          reducedMotion: false,
          appTheme: config.appTheme,
        });
        setNeurotype(profile.name);
      }
    } else if (user) {
      loadUserPreferences();
    }
  }, [viewAsNeurotype, neurotypeProfiles]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'theme-neon-dark');
    root.classList.add(`theme-${config.appTheme}`);
  }, [config.appTheme]);

  const loadNeurotypeProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('neurotype_profiles')
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;
      setNeurotypeProfiles(data || []);
    } catch (error) {
      console.error('Error loading neurotype profiles:', error);
    }
  };

  const loadUserPreferences = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_ui_preferences')
        .select('*, neurotype_profiles(*)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences(data);
        setConfig({
          layoutMode: data.layout_mode,
          uiDensity: data.ui_density,
          fontScale: data.font_scale,
          colorTheme: data.color_theme,
          contrastLevel: data.contrast_level,
          reducedMotion: data.reduced_motion,
          appTheme: data.app_theme || 'light',
          measurementSystem: data.measurement_system || 'metric',
          recipeLocation: data.recipe_location || null,
          recipeLocationOverride: data.recipe_location_override || null,
          includeLocationInAI: data.include_location_in_ai !== false, // Default to true if not set
        });
        setNeurotype(data.neurotype_profiles?.name || null);
      } else {
        setConfig(DEFAULT_CONFIG);
        setNeurotype(null);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<UIPreferencesConfig>) => {
    if (!user?.id) return;

    const newConfig = { ...config, ...updates };
    setConfig(newConfig);

    try {
      const upsertData: any = {
        user_id: user.id,
        layout_mode: newConfig.layoutMode,
        ui_density: newConfig.uiDensity,
        font_scale: newConfig.fontScale,
        color_theme: newConfig.colorTheme,
        contrast_level: newConfig.contrastLevel,
        reduced_motion: newConfig.reducedMotion,
        app_theme: newConfig.appTheme,
        updated_at: new Date().toISOString(),
      };

      // Include optional fields if they exist in newConfig
      if ('measurementSystem' in newConfig) {
        upsertData.measurement_system = newConfig.measurementSystem || 'metric';
      }
      if ('recipeLocation' in newConfig) {
        upsertData.recipe_location = newConfig.recipeLocation || null;
      }
      if ('recipeLocationOverride' in newConfig) {
        upsertData.recipe_location_override = newConfig.recipeLocationOverride || null;
      }
      if ('includeLocationInAI' in newConfig) {
        upsertData.include_location_in_ai = newConfig.includeLocationInAI !== false; // Default to true
      }

      const { data, error } = await supabase
        .from('user_ui_preferences')
        .upsert(upsertData, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      setPreferences(data);
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  };

  const setNeurotypeProfile = async (profileId: string) => {
    if (!user?.id) return;

    const profile = neurotypeProfiles.find((p) => p.id === profileId);
    if (!profile) return;

    const newConfig: UIPreferencesConfig = {
      layoutMode: profile.default_layout,
      uiDensity: profile.default_density,
      fontScale: profile.default_theme.fontScale,
      colorTheme: profile.default_theme.colorTheme,
      contrastLevel: profile.default_theme.contrastLevel,
      reducedMotion: false,
      appTheme: config.appTheme,
      measurementSystem: config.measurementSystem || 'metric',
      recipeLocation: config.recipeLocation || null,
      recipeLocationOverride: config.recipeLocationOverride || null,
    };

    setConfig(newConfig);

    try {
      const upsertData: any = {
        user_id: user.id,
        neurotype_profile_id: profileId,
        layout_mode: newConfig.layoutMode,
        ui_density: newConfig.uiDensity,
        font_scale: newConfig.fontScale,
        color_theme: newConfig.colorTheme,
        contrast_level: newConfig.contrastLevel,
        reduced_motion: newConfig.reducedMotion,
        app_theme: newConfig.appTheme,
        updated_at: new Date().toISOString(),
      };

      // Include location fields if they exist in newConfig
      if ('recipeLocation' in newConfig) {
        upsertData.recipe_location = newConfig.recipeLocation || null;
      }
      if ('recipeLocationOverride' in newConfig) {
        upsertData.recipe_location_override = newConfig.recipeLocationOverride || null;
      }
      if ('measurementSystem' in newConfig) {
        upsertData.measurement_system = newConfig.measurementSystem || 'metric';
      }

      const { data, error } = await supabase
        .from('user_ui_preferences')
        .upsert(upsertData, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      setPreferences(data);
    } catch (error) {
      console.error('Error setting neurotype profile:', error);
      throw error;
    }
  };

  const resetToDefaults = async () => {
    if (!user?.id) return;

    setConfig(DEFAULT_CONFIG);

    try {
      const { error } = await supabase
        .from('user_ui_preferences')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setPreferences(null);
    } catch (error) {
      console.error('Error resetting preferences:', error);
      throw error;
    }
  };

  const updateCustomOverride = async (key: string, value: any) => {
    if (!user?.id) return;

    const currentOverrides = preferences?.custom_overrides || {};
    const updatedOverrides = { ...currentOverrides, [key]: value };

    try {
      const upsertData: any = {
        user_id: user.id,
        layout_mode: config.layoutMode,
        ui_density: config.uiDensity,
        font_scale: config.fontScale,
        color_theme: config.colorTheme,
        contrast_level: config.contrastLevel,
        reduced_motion: config.reducedMotion,
        app_theme: config.appTheme,
        custom_overrides: updatedOverrides,
        updated_at: new Date().toISOString(),
      };

      // Include optional fields from config
      if (config.measurementSystem) {
        upsertData.measurement_system = config.measurementSystem;
      }
      if (config.recipeLocation !== undefined) {
        upsertData.recipe_location = config.recipeLocation || null;
      }
      if (config.recipeLocationOverride !== undefined) {
        upsertData.recipe_location_override = config.recipeLocationOverride || null;
      }

      const { data, error } = await supabase
        .from('user_ui_preferences')
        .upsert(upsertData, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      setPreferences(data);
    } catch (error) {
      console.error('Error updating custom override:', error);
      throw error;
    }
  };

  const getCustomOverride = (key: string, defaultValue: any = null) => {
    return preferences?.custom_overrides?.[key] ?? defaultValue;
  };

  const setAppTheme = async (theme: 'light' | 'dark' | 'neon-dark') => {
    if (theme === config.appTheme) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      await updatePreferences({ appTheme: theme });
      return;
    }

    document.documentElement.setAttribute('data-target-theme', theme);

    const glitchPromise = triggerGlitchTransition(600);

    await new Promise(resolve => setTimeout(resolve, 300));
    await updatePreferences({ appTheme: theme });

    await glitchPromise;
    document.documentElement.removeAttribute('data-target-theme');
  };

  const getWidgetColors = (): WidgetColorPreferences => {
    const stored = getCustomOverride('widgetColors', null);
    return stored ? { ...DEFAULT_WIDGET_COLORS, ...stored } : DEFAULT_WIDGET_COLORS;
  };

  const getWidgetColor = (widgetType: WidgetTypeId): WidgetColorToken => {
    const colors = getWidgetColors();
    return colors[widgetType] || DEFAULT_WIDGET_COLORS[widgetType] || 'neutral';
  };

  const setWidgetColor = async (widgetType: WidgetTypeId, color: WidgetColorToken) => {
    const currentColors = getWidgetColors();
    const updatedColors = { ...currentColors, [widgetType]: color };
    await updateCustomOverride('widgetColors', updatedColors);
  };

  const getTrackerColors = (): Record<string, WidgetColorToken> => {
    return getCustomOverride('trackerColors', {});
  };

  const getTrackerColor = (trackerId: string): WidgetColorToken | null => {
    const trackerColors = getTrackerColors();
    return trackerColors[trackerId] || null;
  };

  const setTrackerColor = async (trackerId: string, color: WidgetColorToken) => {
    const currentTrackerColors = getTrackerColors();
    const updatedTrackerColors = { ...currentTrackerColors, [trackerId]: color };
    await updateCustomOverride('trackerColors', updatedTrackerColors);
  };

  return (
    <UIPreferencesContext.Provider
      value={{
        config,
        preferences,
        neurotypeProfiles,
        neurotype,
        loading,
        appTheme: config.appTheme,
        measurementSystem: config.measurementSystem || 'metric',
        recipeLocation: config.recipeLocationOverride || config.recipeLocation || null, // Active location (override takes precedence)
        updatePreferences,
        setNeurotypeProfile,
        resetToDefaults,
        updateCustomOverride,
        getCustomOverride,
        setAppTheme,
        getWidgetColor,
        setWidgetColor,
        getWidgetColors,
        getTrackerColor,
        setTrackerColor,
      }}
    >
      {children}
    </UIPreferencesContext.Provider>
  );
}

export function useUIPreferences() {
  const context = useContext(UIPreferencesContext);
  if (context === undefined) {
    throw new Error('useUIPreferences must be used within a UIPreferencesProvider');
  }
  return context;
}
