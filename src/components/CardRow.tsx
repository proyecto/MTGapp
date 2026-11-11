/**
 * @module components/CardRow
 * Memoized Calm Paper list row rendering a single MTG holding inside a grouped card list.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TABULAR_NUMS_STYLE, type AppTheme } from '../theme/tokens';
import type { AppPreferences, CardHolding, CardMetrics } from '../types/card';
import {
  formatMoney,
  formatSignedMoney,
  formatSignedPct,
  getCardPrimaryName,
  getCardSecondaryName,
} from '../utils/cardMath';

/** Props accepted by {@link CardRow}. */
export interface CardRowProps {
  card: CardHolding;
  metrics: CardMetrics;
  theme: AppTheme;
  preferences: AppPreferences;
  isFirst: boolean;
  isLast: boolean;
  onPress: (card: CardHolding) => void;
}

/**
 * Displays set code badge, localized primary/alternate card names, quantity chip,
 * tabular total valuation, net profit, and ROI for a card holding.
 *
 * @param props Card holding, precomputed metrics, list boundary flags, and press handler.
 * @returns Memoized pressable row element.
 */
export const CardRow = React.memo(function CardRow({
  card,
  metrics,
  theme,
  preferences,
  isFirst,
  isLast,
  onPress,
}: CardRowProps) {
  const primaryName = getCardPrimaryName(card, preferences.language);
  const secondaryName = getCardSecondaryName(card, preferences.language);

  const isZeroProfit = metrics.profit === 0;
  const isGain = metrics.profit > 0;
  const profitColor = isZeroProfit
    ? theme.muted
    : isGain
      ? theme.gain
      : theme.loss;

  const secondaryParts: string[] = [];
  if (secondaryName) {
    secondaryParts.push(secondaryName);
  }
  secondaryParts.push(card.condition);
  secondaryParts.push(card.language.toUpperCase());
  if (card.deck) {
    secondaryParts.push(card.deck);
  }

  return (
    <Pressable
      onPress={() => onPress(card)}
      accessibilityRole="button"
      accessibilityLabel={`${primaryName}, ${card.setCode}, ${formatMoney(metrics.totalMarket, preferences)}`}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? theme.surfaceSubtle : theme.surface,
          borderColor: theme.border,
          borderLeftWidth: 1,
          borderRightWidth: 1,
        },
        isFirst && styles.firstRow,
        isLast && styles.lastRow,
      ]}
    >
      {/* Left: Minimalist Set Badge */}
      <View
        style={[
          styles.setBadge,
          { backgroundColor: theme.surfaceSubtle },
        ]}
      >
        <Text
          style={[styles.setCode, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {card.setCode}
        </Text>
      </View>

      {/* Center: Card Name + Subtle Metadata */}
      <View style={styles.center}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: theme.text }]}
            numberOfLines={1}
          >
            {primaryName}
          </Text>
          {card.quantity > 1 ? (
            <View
              style={[
                styles.qtyBadge,
                { backgroundColor: theme.accentSoft },
              ]}
            >
              <Text
                style={[
                  styles.qtyText,
                  TABULAR_NUMS_STYLE,
                  { color: theme.accent },
                ]}
              >
                ×{card.quantity}
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          style={[styles.subtitle, { color: theme.muted }]}
          numberOfLines={1}
        >
          {secondaryParts.join(' · ')}
        </Text>
      </View>

      {/* Right: Tabular Valuation + Profit / ROI */}
      <View style={styles.right}>
        <Text
          style={[styles.marketValue, TABULAR_NUMS_STYLE, { color: theme.text }]}
        >
          {formatMoney(metrics.totalMarket, preferences)}
        </Text>
        <Text
          style={[styles.profitLine, TABULAR_NUMS_STYLE, { color: profitColor }]}
        >
          {formatSignedMoney(metrics.profit, preferences)} ·{' '}
          {formatSignedPct(metrics.roiPct, preferences.language)}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 11,
  },
  firstRow: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
  },
  lastRow: {
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomWidth: 1,
  },
  setBadge: {
    minWidth: 42,
    height: 36,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  setCode: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  center: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  qtyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    flexShrink: 0,
  },
  qtyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
  },
  right: {
    alignItems: 'flex-end',
    flexShrink: 0,
    gap: 2,
  },
  marketValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  profitLine: {
    fontSize: 12,
    fontWeight: '500',
  },
});
