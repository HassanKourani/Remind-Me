/**
 * RemindMe Pro — Indigo AI theme
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    primary: '#6366F1',
    primaryLight: '#EEF2FF',
    primaryDark: '#4F46E5',
    accent: '#F59E0B',
    text: '#1E1B4B',
    textSecondary: '#4B5563',
    background: '#FAFAFE',
    surface: '#FFFFFF',
    border: '#E5E7EB',
    icon: '#6B7280',
    tint: '#6366F1',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#6366F1',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
  },
  dark: {
    primary: '#818CF8',
    primaryLight: '#252145',
    primaryDark: '#6366F1',
    accent: '#FBBF24',
    text: '#E0E7FF',
    textSecondary: '#9CA3AF',
    background: '#0F0D1A',
    surface: '#1C1932',
    border: '#2D2B4A',
    icon: '#9CA3AF',
    tint: '#818CF8',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#818CF8',
    success: '#34D399',
    error: '#F87171',
    warning: '#FBBF24',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
