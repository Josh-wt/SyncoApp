import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { getUserPreferences, updateAppearancePreferences } from '../lib/userPreferences';
import type { ThemeMode, FontSize } from '../lib/types';

interface ThemeColors {
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Background colors
  background: string;
  backgroundSecondary: string;
  card: string;
  cardSecondary: string;

  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Border and divider colors
  border: string;
  borderLight: string;
  divider: string;

  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Special colors
  shadow: string;
  overlay: string;
}

interface FontSizes {
  tiny: number;
  small: number;
  medium: number;
  large: number;
  xlarge: number;
  xxlarge: number;
  heading: number;
}

interface Theme {
  colors: ThemeColors;
  fontSize: FontSizes;
  isDark: boolean;
}

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  isDark: boolean;
  accentColor: string;
  fontSizeScale: FontSize;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setAccentColor: (color: string) => Promise<void>;
  setFontSizeScale: (size: FontSize) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Base font sizes (for 'medium' scale)
const baseFontSizes: FontSizes = {
  tiny: 10,
  small: 12,
  medium: 14,
  large: 16,
  xlarge: 20,
  xxlarge: 24,
  heading: 28,
};

// Font size multipliers
const fontSizeMultipliers: Record<FontSize, number> = {
  small: 0.875,   // 87.5%
  medium: 1.0,    // 100%
  large: 1.125,   // 112.5%
};

// Light theme colors
const lightColors: ThemeColors = {
  primary: '#2F00FF',
  primaryLight: '#D6C6F5',
  primaryDark: '#2000CC',

  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  card: '#FFFFFF',
  cardSecondary: '#F3F4F6',

  text: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  divider: '#E5E7EB',

  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

// Dark theme colors
const darkColors: ThemeColors = {
  primary: '#5C3FFF',
  primaryLight: '#8B7FFF',
  primaryDark: '#3F20FF',

  background: '#111827',
  backgroundSecondary: '#1F2937',
  card: '#1F2937',
  cardSecondary: '#374151',

  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',
  textInverse: '#1F2937',

  border: '#374151',
  borderLight: '#4B5563',
  divider: '#374151',

  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',

  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

function getScaledFontSizes(scale: FontSize): FontSizes {
  const multiplier = fontSizeMultipliers[scale];
  return {
    tiny: Math.round(baseFontSizes.tiny * multiplier),
    small: Math.round(baseFontSizes.small * multiplier),
    medium: Math.round(baseFontSizes.medium * multiplier),
    large: Math.round(baseFontSizes.large * multiplier),
    xlarge: Math.round(baseFontSizes.xlarge * multiplier),
    xxlarge: Math.round(baseFontSizes.xxlarge * multiplier),
    heading: Math.round(baseFontSizes.heading * multiplier),
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [accentColor, setAccentColorState] = useState<string>('#2F00FF');
  const [fontSizeScale, setFontSizeScaleState] = useState<FontSize>('medium');
  const [isLoading, setIsLoading] = useState(true);

  // Load user preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await getUserPreferences();
        if (prefs) {
          setThemeModeState(prefs.theme || 'system');
          setAccentColorState(prefs.accent_color || '#2F00FF');
          setFontSizeScaleState(prefs.font_size || 'medium');
        }
      } catch (error) {
        console.error('Error loading theme preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Determine if we should use dark mode
  const isDark =
    themeMode === 'dark' ||
    (themeMode === 'system' && systemColorScheme === 'dark');

  // Get color scheme based on dark mode
  const colors = isDark ? darkColors : lightColors;

  // Apply accent color override
  const themeColors: ThemeColors = {
    ...colors,
    primary: accentColor,
  };

  // Get scaled font sizes
  const fontSize = getScaledFontSizes(fontSizeScale);

  // Build the theme object
  const theme: Theme = {
    colors: themeColors,
    fontSize,
    isDark,
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await updateAppearancePreferences({ theme: mode });
  };

  const setAccentColor = async (color: string) => {
    setAccentColorState(color);
    await updateAppearancePreferences({ accent_color: color });
  };

  const setFontSizeScale = async (size: FontSize) => {
    setFontSizeScaleState(size);
    await updateAppearancePreferences({ font_size: size });
  };

  const value: ThemeContextType = {
    theme,
    themeMode,
    isDark,
    accentColor,
    fontSizeScale,
    setThemeMode,
    setAccentColor,
    setFontSizeScale,
  };

  // Don't render children until preferences are loaded
  if (isLoading) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
