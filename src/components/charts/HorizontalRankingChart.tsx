import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CARD_SHADOW_STYLE,
  TABULAR_NUMS_STYLE,
  type AppTheme,
} from '../../theme/tokens';

export interface HorizontalBarItem {
  cardId: string;
  primaryName: string;
  metaText: string;
  rightPrimary: string;
  rightPrimaryColor: string;
  rightSecondary?: string;
  primaryBarAmount: number;
  secondaryBarAmount?: number;
  primaryBarColor: string;
  secondaryBarColor?: string;
}

export interface HorizontalBarLegendItem {
  label: string;
  color: string;
}

interface HorizontalRankingChartProps {
  title: string;
  subtitle: string;
  headerRight?: React.ReactNode;
  items: HorizontalBarItem[];
  legend?: HorizontalBarLegendItem[];
  footnote?: string;
  emptyText: string;
  theme: AppTheme;
  onPressCard: (cardId: string) => void;
}

export function HorizontalRankingChart({
  title,
  subtitle,
  headerRight,
  items,
  legend,
  footnote,
  emptyText,
  theme,
  onPressCard,
}: HorizontalRankingChartProps) {
  let maxBarTotal = 0;
  for (const item of items) {
    const combined =
      Math.max(0, item.primaryBarAmount) +
      Math.max(0, item.secondaryBarAmount ?? 0);
    if (combined > maxBarTotal) {
      maxBarTotal = combined;
    }
  }
  const safeMax = maxBarTotal > 0 ? maxBarTotal : 1;

  return (
    <View
      style={[
        styles.card,
        CARD_SHADOW_STYLE,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {subtitle}
          </Text>
        </View>
        {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
      </View>

      {/* Legend (when stacked series) */}
      {legend && legend.length > 0 ? (
        <View style={styles.legendRow}>
          {legend.map((entry) => (
            <View key={entry.label} style={styles.legendItem}>
              <View
                style={[styles.legendSwatch, { backgroundColor: entry.color }]}
              />
              <Text style={[styles.legendText, { color: theme.muted }]}>
                {entry.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {items.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.muted }]}>
          {emptyText}
        </Text>
      ) : (
        <View style={styles.rowsWrap}>
          {items.map((item, idx) => {
            const pVal = Math.max(0, item.primaryBarAmount);
            const sVal = Math.max(0, item.secondaryBarAmount ?? 0);
            const pPct = (pVal / safeMax) * 100;
            const sPct = (sVal / safeMax) * 100;

            return (
              <Pressable
                key={item.cardId}
                onPress={() => onPressCard(item.cardId)}
                accessibilityRole="button"
                accessibilityLabel={item.primaryName}
                style={({ pressed }) => [
                  styles.itemRow,
                  idx > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: theme.divider,
                  },
                  pressed && { backgroundColor: theme.surfaceSubtle },
                ]}
              >
                <View style={styles.topLine}>
                  <Text
                    style={[
                      styles.rankNum,
                      TABULAR_NUMS_STYLE,
                      { color: theme.muted },
                    ]}
                  >
                    {idx + 1}.
                  </Text>
                  <Text
                    style={[styles.cardName, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {item.primaryName}
                  </Text>
                  <Text
                    style={[
                      styles.rightPrimary,
                      TABULAR_NUMS_STYLE,
                      { color: item.rightPrimaryColor },
                    ]}
                  >
                    {item.rightPrimary}
                  </Text>
                </View>

                <View style={styles.midLine}>
                  <Text
                    style={[styles.metaText, { color: theme.muted }]}
                    numberOfLines={1}
                  >
                    {item.metaText}
                  </Text>
                  {item.rightSecondary ? (
                    <Text
                      style={[
                        styles.rightSecondary,
                        TABULAR_NUMS_STYLE,
                        { color: theme.muted },
                      ]}
                    >
                      {item.rightSecondary}
                    </Text>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.barTrack,
                    { backgroundColor: theme.surfaceSubtle },
                  ]}
                >
                  {pPct > 0 ? (
                    <View
                      style={[
                        styles.barSeg,
                        {
                          width: `${Math.min(100, Math.max(1.5, pPct))}%`,
                          backgroundColor: item.primaryBarColor,
                        },
                      ]}
                    />
                  ) : null}
                  {sPct > 0 && item.secondaryBarColor ? (
                    <View
                      style={[
                        styles.barSeg,
                        {
                          width: `${Math.min(100 - Math.min(100, pPct), Math.max(1.5, sPct))}%`,
                          backgroundColor: item.secondaryBarColor,
                        },
                      ]}
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {footnote ? (
        <View style={[styles.footerRow, { borderTopColor: theme.divider }]}>
          <Text style={[styles.footnoteText, { color: theme.muted }]}>
            {footnote}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11.5,
  },
  headerRight: {
    flexShrink: 0,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendSwatch: {
    width: 10,
    height: 6,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  rowsWrap: {
    marginHorizontal: -6,
  },
  itemRow: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankNum: {
    width: 22,
    fontSize: 11.5,
    fontWeight: '600',
  },
  cardName: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: '600',
  },
  rightPrimary: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 0,
  },
  midLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 28,
    gap: 8,
  },
  metaText: {
    flex: 1,
    minWidth: 0,
    fontSize: 10.5,
  },
  rightSecondary: {
    fontSize: 10.5,
    fontWeight: '500',
    flexShrink: 0,
  },
  barTrack: {
    marginLeft: 28,
    height: 6,
    borderRadius: 999,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barSeg: {
    height: '100%',
  },
  footerRow: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footnoteText: {
    fontSize: 11,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 12,
    paddingVertical: 8,
  },
});

