/**
 * @module theme/tokens
 * Design tokens, Theme Registry, and accessible chart series palettes following the Calm Paper system.
 */

import { Platform } from 'react-native';
import type { PriceSource, ThemeId } from '../types/card';

/** Contrast polarity for system status bar & derived color palettes. */
export type ThemeMode = 'light' | 'dark';

/** Complete semantic color contract implemented by every theme in {@link THEME_REGISTRY}. */
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

/** Default daytime theme inspired by Things 3 / Todoist Calm Paper surfaces. */
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

/** Low-glare slate theme calibrated for comfortable contrast on OLED and LCD screens. */
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

/**
 * Extensible Theme Registry keyed by {@link ThemeId}.
 * Adding a new {@link ThemeId} requires registering its token object here.
 */
export const THEME_REGISTRY: Record<ThemeId, AppTheme> = {
  light: LIGHT_THEME,
  dark: DARK_THEME,
};

/**
 * Resolves a theme by identifier with safe fallback to {@link LIGHT_THEME}.
 *
 * @param themeId Requested theme identifier.
 * @returns Concrete {@link AppTheme} token palette.
 */
export function resolveTheme(themeId: ThemeId): AppTheme {
  return THEME_REGISTRY[themeId] ?? LIGHT_THEME;
}

const STORE_SERIES_COLORS_LIGHT: Record<PriceSource, string> = {
  Cardmarket: '#2563EB',
  Scryfall: '#0D9488',
  TCGPlayer: '#D97706',
  CardKingdom: '#7C3AED',
  ManaPool: '#DB2777',
};

const STORE_SERIES_COLORS_DARK: Record<PriceSource, string> = {
  Cardmarket: '#60A5FA',
  Scryfall: '#2DD4BF',
  TCGPlayer: '#FBBF24',
  CardKingdom: '#A78BFA',
  ManaPool: '#F472B6',
};

/**
 * Resolves a high-contrast line color for a given valuation store and theme polarity.
 *
 * @param source Store identifier.
 * @param mode Theme light/dark mode.
 * @returns Hex color string.
 */
export function getStoreSeriesColor(
  source: PriceSource,
  mode: ThemeMode,
): string {
  return mode === 'dark'
    ? STORE_SERIES_COLORS_DARK[source]
    : STORE_SERIES_COLORS_LIGHT[source];
}

/** Shared monospace-numeral font variant for financial alignment. */
export const TABULAR_NUMS_STYLE = {
  fontVariant: ['tabular-nums' as const],
};

/** Cross-platform subtle card elevation shadow. */
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
