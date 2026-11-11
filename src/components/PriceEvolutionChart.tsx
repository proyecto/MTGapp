import React, { useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { getTranslations } from '../i18n/translations';
import { TABULAR_NUMS_STYLE, type AppTheme } from '../theme/tokens';
import type {
  AppPreferences,
  HistoryRange,
  PricePoint,
  PriceSource,
} from '../types/card';
import {
  formatMoney,
  formatShortDate,
  formatSignedMoney,
  formatSignedPct,
  round2,
  slicePriceHistory,
} from '../utils/cardMath';

interface PriceEvolutionChartProps {
  points: PricePoint[];
  source: PriceSource;
  range: HistoryRange;
  onChangeRange: (range: HistoryRange) => void;
  unitCostEur: number;
  theme: AppTheme;
  preferences: AppPreferences;
}

const RANGE_KEYS: HistoryRange[] = ['7d', '30d', 'all'];

const CHART_HEIGHT = 112;
const PAD_X = 6;
const PAD_Y = 10;

export function PriceEvolutionChart({
  points,
  source,
  range,
  onChangeRange,
  unitCostEur,
  theme,
  preferences,
}: PriceEvolutionChartProps) {
  const t = getTranslations(preferences.language);
  const [chartWidth, setChartWidth] = useState(280);

  function handleLayout(event: LayoutChangeEvent) {
    const w = Math.floor(event.nativeEvent.layout.width);
    if (w > 40 && w !== chartWidth) {
      setChartWidth(w);
    }
  }

  const visiblePoints = slicePriceHistory(points, range);
  const count = visiblePoints.length;

  if (count === 0) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.bg,
            borderColor: theme.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.text }]}>
          {t.detail.chartTitle(source)}
        </Text>
        <Text style={[styles.emptyText, { color: theme.muted }]}>
          {t.detail.chartNoData}
        </Text>
      </View>
    );
  }

  const first = visiblePoints[0];
  const last = visiblePoints[count - 1];
  const deltaEur = round2(last.price - first.price);
  const deltaPct = first.price > 0 ? (deltaEur / first.price) * 100 : null;
  const deltaColor =
    deltaEur === 0 ? theme.muted : deltaEur > 0 ? theme.gain : theme.loss;

  let minVal = visiblePoints[0].price;
  let maxVal = visiblePoints[0].price;
  for (const pt of visiblePoints) {
    if (pt.price < minVal) minVal = pt.price;
    if (pt.price > maxVal) maxVal = pt.price;
  }

  const isFlat = maxVal === minVal;
  const span = maxVal - minVal;
  const yMin = isFlat
    ? Math.max(0, minVal - 1)
    : Math.max(0, minVal - span * 0.12);
  const yMax = isFlat ? maxVal + 1 : maxVal + span * 0.12;
  const ySpan = yMax - yMin || 1;

  const usableW = Math.max(40, chartWidth - PAD_X * 2);
  const usableH = CHART_HEIGHT - PAD_Y * 2;

  const toX = (index: number) =>
    count <= 1
      ? PAD_X + usableW / 2
      : PAD_X + (index / (count - 1)) * usableW;

  const toY = (price: number) =>
    isFlat
      ? PAD_Y + usableH / 2
      : PAD_Y + usableH - ((price - yMin) / ySpan) * usableH;

  const coords = visiblePoints.map((pt, i) => ({
    x: toX(i),
    y: toY(pt.price),
  }));

  const linePath =
    count >= 2
      ? coords
          .map(
            (p, idx) =>
              `${idx === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`,
          )
          .join(' ')
      : '';

  const areaPath =
    count >= 2
      ? `${linePath} L${coords[count - 1].x.toFixed(1)},${(CHART_HEIGHT - PAD_Y).toFixed(1)} L${coords[0].x.toFixed(1)},${(CHART_HEIGHT - PAD_Y).toFixed(1)} Z`
      : '';

  const showCostRef =
    count >= 2 &&
    unitCostEur > 0 &&
    unitCostEur >= yMin &&
    unitCostEur <= yMax;
  const costRefY = showCostRef ? toY(unitCostEur) : 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.bg,
          borderColor: theme.border,
        },
      ]}
    >
      {/* Header + Range Switcher */}
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {t.detail.chartTitle(source)}
          </Text>
          <View style={styles.deltaRow}>
            <Text
              style={[
                styles.rangeSummary,
                TABULAR_NUMS_STYLE,
                { color: theme.muted },
              ]}
            >
              {formatMoney(first.price, preferences)} →{' '}
              {formatMoney(last.price, preferences)}
            </Text>
            <Text
              style={[styles.deltaBadge, TABULAR_NUMS_STYLE, { color: deltaColor }]}
            >
              {formatSignedMoney(deltaEur, preferences)}
              {deltaPct !== null
                ? ` (${formatSignedPct(deltaPct, preferences.language)})`
                : ''}
            </Text>
          </View>
        </View>

        <View
          style={[styles.rangeGroup, { backgroundColor: theme.surfaceSubtle }]}
        >
          {RANGE_KEYS.map((key) => {
            const active = range === key;
            return (
              <Pressable
                key={key}
                onPress={() => onChangeRange(key)}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.rangeBtn,
                  active && { backgroundColor: theme.surface },
                ]}
              >
                <Text
                  style={[
                    styles.rangeBtnText,
                    {
                      color: active ? theme.accent : theme.muted,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {t.dashboard.rangeLabels[key]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* SVG Line Chart */}
      <View style={styles.svgContainer} onLayout={handleLayout}>
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="priceAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={theme.accent} stopOpacity={0.22} />
              <Stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {/* Subtle horizontal guide lines */}
          <Line
            x1={PAD_X}
            y1={PAD_Y}
            x2={chartWidth - PAD_X}
            y2={PAD_Y}
            stroke={theme.divider}
            strokeWidth={1}
          />
          <Line
            x1={PAD_X}
            y1={CHART_HEIGHT - PAD_Y}
            x2={chartWidth - PAD_X}
            y2={CHART_HEIGHT - PAD_Y}
            stroke={theme.divider}
            strokeWidth={1}
          />

          {/* Optional purchase price dashed reference */}
          {showCostRef ? (
            <Line
              x1={PAD_X}
              y1={costRefY}
              x2={chartWidth - PAD_X}
              y2={costRefY}
              stroke={theme.muted}
              strokeOpacity={0.55}
              strokeWidth={1.2}
              strokeDasharray="4 4"
            />
          ) : null}

          {count >= 2 ? (
            <>
              <Path d={areaPath} fill="url(#priceAreaGrad)" />
              <Path
                d={linePath}
                fill="none"
                stroke={theme.accent}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Circle
                cx={coords[count - 1].x}
                cy={coords[count - 1].y}
                r={4}
                fill={theme.accent}
                stroke={theme.surface}
                strokeWidth={1.8}
              />
            </>
          ) : (
            <>
              <Line
                x1={PAD_X}
                y1={CHART_HEIGHT / 2}
                x2={chartWidth - PAD_X}
                y2={CHART_HEIGHT / 2}
                stroke={theme.accent}
                strokeOpacity={0.35}
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <Circle
                cx={coords[0].x}
                cy={coords[0].y}
                r={4.5}
                fill={theme.accent}
                stroke={theme.surface}
                strokeWidth={1.8}
              />
            </>
          )}
        </Svg>
      </View>

      {/* Bottom Axis & Min/Max Stats */}
      <View style={styles.footerRow}>
        <Text
          style={[styles.axisText, TABULAR_NUMS_STYLE, { color: theme.muted }]}
        >
          {formatShortDate(first.date, preferences.language)}
        </Text>
        <Text
          style={[
            styles.minMaxText,
            TABULAR_NUMS_STYLE,
            { color: theme.muted },
          ]}
        >
          {count === 1
            ? t.detail.chartSingleRecord
            : t.detail.chartMinMax(
                formatMoney(minVal, preferences),
                formatMoney(maxVal, preferences),
              )}
        </Text>
        <Text
          style={[styles.axisText, TABULAR_NUMS_STYLE, { color: theme.muted }]}
        >
          {formatShortDate(last.date, preferences.language)}
        </Text>
      </View>

      {showCostRef ? (
        <Text
          style={[styles.refHint, TABULAR_NUMS_STYLE, { color: theme.muted }]}
        >
          {t.detail.chartCostRef(formatMoney(unitCostEur, preferences))}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    gap: 8,
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
    fontSize: 13,
    fontWeight: '700',
  },
  deltaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  rangeSummary: {
    fontSize: 11,
    fontWeight: '500',
  },
  deltaBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  rangeGroup: {
    flexDirection: 'row',
    borderRadius: 9,
    padding: 2,
    gap: 2,
    flexShrink: 0,
  },
  rangeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  rangeBtnText: {
    fontSize: 11,
  },
  svgContainer: {
    width: '100%',
    height: CHART_HEIGHT,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  axisText: {
    fontSize: 11,
    fontWeight: '500',
  },
  minMaxText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  refHint: {
    fontSize: 10,
    fontWeight: '400',
  },
  emptyText: {
    fontSize: 12,
    paddingVertical: 8,
  },
});
