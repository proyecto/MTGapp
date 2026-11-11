import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getTranslations } from '../i18n/translations';
import { TABULAR_NUMS_STYLE, type AppTheme } from '../theme/tokens';
import type { AppPreferences, PortfolioSummary } from '../types/card';
import {
  formatMoney,
  formatSignedMoney,
  formatSignedPct,
} from '../utils/cardMath';

interface CollectionHeaderProps {
  summary: PortfolioSummary;
  filteredCount: number;
  isFiltered: boolean;
  theme: AppTheme;
  preferences: AppPreferences;
}

export function CollectionHeader({
  summary,
  filteredCount,
  isFiltered,
  theme,
  preferences,
}: CollectionHeaderProps) {
  const t = getTranslations(preferences.language);
  const isGain = summary.totalProfit >= 0;
  const roiColor =
    summary.totalProfit === 0
      ? theme.muted
      : isGain
        ? theme.gain
        : theme.loss;
  const roiBg =
    summary.totalProfit === 0
      ? theme.surfaceSubtle
      : isGain
        ? theme.gainBg
        : theme.lossBg;

  return (
    <View style={styles.container}>
      <Text
        style={[styles.eyebrow, { color: theme.muted }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {t.header.eyebrowCollection(preferences.currency)}
      </Text>

      <View style={styles.heroRow}>
        <View style={styles.heroLeft}>
          <Text
            style={[styles.heroValue, TABULAR_NUMS_STYLE, { color: theme.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatMoney(summary.totalMarket, preferences)}
          </Text>
        </View>

        <View style={styles.heroRight}>
          <View style={[styles.profitBadge, { backgroundColor: roiBg }]}>
            <Text
              style={[
                styles.profitBadgeText,
                TABULAR_NUMS_STYLE,
                { color: roiColor },
              ]}
            >
              {formatSignedMoney(summary.totalProfit, preferences)} (
              {formatSignedPct(summary.totalRoiPct, preferences.language)})
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text
          style={[styles.metaText, TABULAR_NUMS_STYLE, { color: theme.muted }]}
        >
          {t.header.investmentMeta(
            formatMoney(summary.totalCost, preferences),
            summary.totalCopies,
            summary.uniqueCount,
          )}
        </Text>
        {isFiltered ? (
          <Text
            style={[
              styles.filteredCount,
              TABULAR_NUMS_STYLE,
              { color: theme.accent },
            ]}
          >
            {t.header.showingCount(filteredCount)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingBottom: 10,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroLeft: {
    flex: 1,
    minWidth: 0,
  },
  heroValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  heroRight: {
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  profitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  profitBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '400',
    flexShrink: 1,
  },
  filteredCount: {
    fontSize: 12,
    fontWeight: '600',
  },
});
