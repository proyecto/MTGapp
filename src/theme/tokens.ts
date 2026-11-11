import { Platform } from 'react-native';
import type { ThemeId } from '../types/card';

export type ThemeMode = 'light' | 'dark';

export interface AppTheme {
  id: ThemeId;
  mode: ThemeMode;
  bg: string;
  surface: string;
  surfaceSubtle: string;
  border: string;
  divider: string;
  text: string;
  textSecondary: string;
  muted: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  gain: string;
  gainBg: string;
  loss: string;
  lossBg: string;
  shadowColor: string;
  backdrop: string;
}

export const LIGHT_THEME: AppTheme = {
  id: 'light',
  mode: 'light',
  bg: '#F8F8F6',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F1EE',
  border: 'rgba(17, 24, 39, 0.08)',
  divider: 'rgba(17, 24, 39, 0.07)',
  text: '#18181B',
  textSecondary: '#3F3F46',
  muted: '#71717A',
  accent: '#2563EB',
  accentText: '#FFFFFF',
  accentSoft: 'rgba(37, 99, 235, 0.10)',
  gain: '#15803D',
  gainBg: 'rgba(21, 128, 61, 0.10)',
  loss: '#DC2626',
  lossBg: 'rgba(220, 38, 38, 0.10)',
  shadowColor: '#000000',
  backdrop: 'rgba(15, 23, 42, 0.42)',
};

export const DARK_THEME: AppTheme = {
  id: 'dark',
  mode: 'dark',
  bg: '#121417',
  surface: '#1A1D22',
  surfaceSubtle: '#23272E',
  border: 'rgba(255, 255, 255, 0.09)',
  divider: 'rgba(255, 255, 255, 0.08)',
  text: '#F4F4F5',
  textSecondary: '#D4D4D8',
  muted: '#A1A1AA',
  accent: '#60A5FA',
  accentText: '#0B1220',
  accentSoft: 'rgba(96, 165, 250, 0.16)',
  gain: '#4ADE80',
  gainBg: 'rgba(74, 222, 128, 0.14)',
  loss: '#F87171',
  lossBg: 'rgba(248, 113, 113, 0.14)',
  shadowColor: '#000000',
  backdrop: 'rgba(0, 0, 0, 0.65)',
};

export const THEME_REGISTRY: Record<ThemeId, AppTheme> = {
  light: LIGHT_THEME,
  dark: DARK_THEME,
};

export const TABULAR_NUMS_STYLE = {
  fontVariant: ['tabular-nums' as const],
};

export const CARD_SHADOW_STYLE = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  android: {
    elevation: 1,
  },
  default: {},
});
