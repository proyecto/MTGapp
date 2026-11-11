import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';
import { getTranslations } from '../i18n/translations';
import type { AppTheme } from '../theme/tokens';
import type { AppLanguage } from '../types/card';

export type AppTab = 'collection' | 'dashboard';

interface BottomNavBarProps {
  activeTab: AppTab;
  settingsOpen: boolean;
  onSelectTab: (tab: AppTab) => void;
  onOpenSettings: () => void;
  theme: AppTheme;
  language: AppLanguage;
}

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

  const isCollectionActive = !settingsOpen && activeTab === 'collection';
  const isChartsActive = !settingsOpen && activeTab === 'dashboard';
  const isSettingsActive = settingsOpen;

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
      <Pressable
        onPress={() => onSelectTab('collection')}
        accessibilityRole="tab"
        accessibilityState={{ selected: isCollectionActive }}
        accessibilityLabel={t.tabs.collection}
        style={({ pressed }) => [
          styles.tab,
          { opacity: pressed ? 0.72 : 1 },
        ]}
      >
        <View
          style={[
            styles.activeIndicator,
            {
              backgroundColor: isCollectionActive
                ? theme.accent
                : 'transparent',
            },
          ]}
        />
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Rect
            x="4"
            y="5"
            width="12"
            height="16"
            rx="2.5"
            stroke={isCollectionActive ? theme.accent : theme.muted}
            strokeWidth={1.9}
          />
          <Polyline
            points="16 8 20 8 20 21 10 21"
            stroke={isCollectionActive ? theme.accent : theme.muted}
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line
            x1="8"
            y1="10"
            x2="12"
            y2="10"
            stroke={isCollectionActive ? theme.accent : theme.muted}
            strokeWidth={1.9}
            strokeLinecap="round"
          />
        </Svg>
        <Text
          style={[
            styles.tabLabel,
            {
              color: isCollectionActive ? theme.accent : theme.muted,
              fontWeight: isCollectionActive ? '700' : '500',
            },
          ]}
          numberOfLines={1}
        >
          {t.tabs.collection}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => onSelectTab('dashboard')}
        accessibilityRole="tab"
        accessibilityState={{ selected: isChartsActive }}
        accessibilityLabel={t.tabs.charts}
        style={({ pressed }) => [
          styles.tab,
          { opacity: pressed ? 0.72 : 1 },
        ]}
      >
        <View
          style={[
            styles.activeIndicator,
            {
              backgroundColor: isChartsActive ? theme.accent : 'transparent',
            },
          ]}
        />
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Line
            x1="4"
            y1="20"
            x2="20"
            y2="20"
            stroke={isChartsActive ? theme.accent : theme.muted}
            strokeWidth={1.9}
            strokeLinecap="round"
          />
          <Polyline
            points="5 15 10 10 14 13 20 6"
            stroke={isChartsActive ? theme.accent : theme.muted}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline
            points="16 6 20 6 20 10"
            stroke={isChartsActive ? theme.accent : theme.muted}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text
          style={[
            styles.tabLabel,
            {
              color: isChartsActive ? theme.accent : theme.muted,
              fontWeight: isChartsActive ? '700' : '500',
            },
          ]}
          numberOfLines={1}
        >
          {t.tabs.charts}
        </Text>
      </Pressable>

      <Pressable
        onPress={onOpenSettings}
        accessibilityRole="button"
        accessibilityState={{ selected: isSettingsActive }}
        accessibilityLabel={t.common.settings}
        style={({ pressed }) => [
          styles.tab,
          { opacity: pressed ? 0.72 : 1 },
        ]}
      >
        <View
          style={[
            styles.activeIndicator,
            {
              backgroundColor: isSettingsActive ? theme.accent : 'transparent',
            },
          ]}
        />
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Line
            x1="4"
            y1="8"
            x2="20"
            y2="8"
            stroke={isSettingsActive ? theme.accent : theme.muted}
            strokeWidth={1.9}
            strokeLinecap="round"
          />
          <Circle
            cx="9"
            cy="8"
            r="2.6"
            fill={theme.surface}
            stroke={isSettingsActive ? theme.accent : theme.muted}
            strokeWidth={1.9}
          />
          <Line
            x1="4"
            y1="16"
            x2="20"
            y2="16"
            stroke={isSettingsActive ? theme.accent : theme.muted}
            strokeWidth={1.9}
            strokeLinecap="round"
          />
          <Circle
            cx="15"
            cy="16"
            r="2.6"
            fill={theme.surface}
            stroke={isSettingsActive ? theme.accent : theme.muted}
            strokeWidth={1.9}
          />
        </Svg>
        <Text
          style={[
            styles.tabLabel,
            {
              color: isSettingsActive ? theme.accent : theme.muted,
              fontWeight: isSettingsActive ? '700' : '500',
            },
          ]}
          numberOfLines={1}
        >
          {t.common.settings}
        </Text>
      </Pressable>
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
