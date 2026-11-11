/**
 * @module components/BottomNavBar
 * Persistent bottom navigation bar with Collection, Analytics Charts, and Settings destinations.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityRole,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';
import { getTranslations } from '../i18n/translations';
import type { AppTheme } from '../theme/tokens';
import type { AppLanguage } from '../types/card';

/** Available primary screen tabs. */
export type AppTab = 'collection' | 'dashboard';

/** Props accepted by {@link BottomNavBar}. */
export interface BottomNavBarProps {
  activeTab: AppTab;
  settingsOpen: boolean;
  onSelectTab: (tab: AppTab) => void;
  onOpenSettings: () => void;
  theme: AppTheme;
  language: AppLanguage;
}

interface NavTabItemProps {
  label: string;
  active: boolean;
  role: AccessibilityRole;
  theme: AppTheme;
  onPress: () => void;
  renderIcon: (strokeColor: string) => React.ReactNode;
}

function NavTabItem({
  label,
  active,
  role,
  theme,
  onPress,
  renderIcon,
}: NavTabItemProps) {
  const color = active ? theme.accent : theme.muted;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.72 : 1 }]}
    >
      <View
        style={[
          styles.activeIndicator,
          { backgroundColor: active ? theme.accent : 'transparent' },
        ]}
      />
      {renderIcon(color)}
      <Text
        style={[
          styles.tabLabel,
          {
            color,
            fontWeight: active ? '700' : '500',
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Fixed safe-area-aware bottom navigation bar switching between Collection,
 * Analytics Charts, and Settings modal trigger.
 *
 * @param props Active tab state, settings state, navigation handlers, theme, and language.
 * @returns Three-column bottom navigation bar.
 */
export function BottomNavBar({
  activeTab,
  settingsOpen,
  onSelectTab,
  onOpenSettings,
  theme,
  language,
}: BottomNavBarProps) {
  const insets = useSafeAreaInsets();
  const t = getTranslations(language);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          paddingBottom: Math.max(8, insets.bottom),
        },
      ]}
    >
      <NavTabItem
        label={t.tabs.collection}
        active={!settingsOpen && activeTab === 'collection'}
        role="tab"
        theme={theme}
        onPress={() => onSelectTab('collection')}
        renderIcon={(stroke) => (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Rect
              x="4"
              y="5"
              width="12"
              height="16"
              rx="2.5"
              stroke={stroke}
              strokeWidth={1.9}
            />
            <Polyline
              points="16 8 20 8 20 21 10 21"
              stroke={stroke}
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Line
              x1="8"
              y1="10"
              x2="12"
              y2="10"
              stroke={stroke}
              strokeWidth={1.9}
              strokeLinecap="round"
            />
          </Svg>
        )}
      />

      <NavTabItem
        label={t.tabs.charts}
        active={!settingsOpen && activeTab === 'dashboard'}
        role="tab"
        theme={theme}
        onPress={() => onSelectTab('dashboard')}
        renderIcon={(stroke) => (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Line
              x1="4"
              y1="20"
              x2="20"
              y2="20"
              stroke={stroke}
              strokeWidth={1.9}
              strokeLinecap="round"
            />
            <Polyline
              points="5 15 10 10 14 13 20 6"
              stroke={stroke}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Polyline
              points="16 6 20 6 20 10"
              stroke={stroke}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )}
      />

      <NavTabItem
        label={t.common.settings}
        active={settingsOpen}
        role="button"
        theme={theme}
        onPress={onOpenSettings}
        renderIcon={(stroke) => (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Line
              x1="4"
              y1="8"
              x2="20"
              y2="8"
              stroke={stroke}
              strokeWidth={1.9}
              strokeLinecap="round"
            />
            <Circle
              cx="9"
              cy="8"
              r="2.6"
              fill={theme.surface}
              stroke={stroke}
              strokeWidth={1.9}
            />
            <Line
              x1="4"
              y1="16"
              x2="20"
              y2="16"
              stroke={stroke}
              strokeWidth={1.9}
              strokeLinecap="round"
            />
            <Circle
              cx="15"
              cy="16"
              r="2.6"
              fill={theme.surface}
              stroke={stroke}
              strokeWidth={1.9}
            />
          </Svg>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingBottom: 2,
    paddingHorizontal: 4,
  },
  activeIndicator: {
    width: 28,
    height: 2.5,
    borderRadius: 2,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
  },
});
