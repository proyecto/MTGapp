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
import {
  CARD_SHADOW_STYLE,
  TABULAR_NUMS_STYLE,
  type AppTheme,
} from '../../theme/tokens';
import type { HistoryRange } from '../../types/card';
import { shiftIsoDateDays } from '../../utils/cardMath';

export interface LineChartPoint {
  key: string;
  axisLabel: string;
  value: number;
}

export interface LineChartSeries {
  id: string;
  label: string;
  color: string;
  dashed?: boolean;
  filled?: boolean;
  strokeWidth?: number;
  points: LineChartPoint[];
  formattedLatest?: string;
}

export interface ChartReferenceLine {
  id: string;
  value: number;
  color: string;
  dashed?: boolean;
  includeInBounds?: boolean;
  label?: string;
}

interface MultiSeriesLineChartProps {
  title: string;
  subtitle: string;
  series: LineChartSeries[];
  referenceLines?: ChartReferenceLine[];
  gradientId: string;
  theme: AppTheme;
  formatValue: (value: number) => string;
  deltaBadge?: { text: string; color: string } | null;
  range?: HistoryRange;
  onChangeRange?: (range: HistoryRange) => void;
  rangeLabels?: Record<HistoryRange, string>;
  leftControl?: React.ReactNode;
  singleRecordLabel: string;
  minMaxFormatter: (minStr: string, maxStr: string) => string;
  footnote?: string | null;
  emptyText: string;
}

const RANGE_KEYS: HistoryRange[] = ['7d', '30d', 'all'];
const CHART_HEIGHT = 150;
const PAD_X = 6;
const PAD_Y = 12;

export function MultiSeriesLineChart({
  title,
  subtitle,
  series,
  referenceLines = [],
  gradientId,
  theme,
  formatValue,
  deltaBadge,
  range,
  onChangeRange,
  rangeLabels,
  leftControl,
  singleRecordLabel,
  minMaxFormatter,
  footnote,
  emptyText,
}: MultiSeriesLineChartProps) {
  const [chartWidth, setChartWidth] = useState(280);

  function handleLayout(event: LayoutChangeEvent) {
    const w = Math.floor(event.nativeEvent.layout.width);
    if (w > 40 && w !== chartWidth) {
      setChartWidth(w);
    }
  }

  // Collect and sort all unique keys across all series
  const rawKeyToLabel = new Map<string, string>();
  for (const s of series) {
    for (const pt of s.points) {
      if (!rawKeyToLabel.has(pt.key)) {
        rawKeyToLabel.set(pt.key, pt.axisLabel);
      }
    }
  }
  const allSortedKeys = Array.from(rawKeyToLabel.keys()).sort((a, b) =>
    a.localeCompare(b),
  );

  // Filter by ISO date range if range is active
  let activeCutoffKey: string | null = null;
  if (range && range !== 'all' && allSortedKeys.length > 2) {
    const lastKey = allSortedKeys[allSortedKeys.length - 1];
    if (/^\d{4}-\d{2}-\d{2}$/.test(lastKey)) {
      const daysBack = range === '7d' ? 7 : 30;
      activeCutoffKey = shiftIsoDateDays(lastKey, -daysBack);
    }
  }

  const slicedSeries = series.map((s) => {
    if (!activeCutoffKey) {
      return s;
    }
    const filtered = s.points.filter((pt) => pt.key >= activeCutoffKey);
    const pts =
      filtered.length >= 2
        ? filtered
        : s.points.slice(
            -Math.min(s.points.length, range === '7d' ? 7 : 30),
          );
    return { ...s, points: pts };
  });

  const visibleKeySet = new Set<string>();
  for (const s of slicedSeries) {
    for (const pt of s.points) {
      visibleKeySet.add(pt.key);
    }
  }
  const visibleKeys = Array.from(visibleKeySet).sort((a, b) =>
    a.localeCompare(b),
  );
  const hasPoints = visibleKeys.length > 0;

  if (!hasPoints) {
    return (
      <View
        style={[
          styles.card,
          CARD_SHADOW_STYLE,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {subtitle}
          </Text>
        </View>
        {leftControl || (range && onChangeRange && rangeLabels) ? (
          <View style={styles.toolbarRow}>
            <View style={styles.toolbarLeft}>{leftControl}</View>
          </View>
        ) : null}
        <Text style={[styles.emptyText, { color: theme.muted }]}>
          {emptyText}
        </Text>
      </View>
    );
  }

  const keyToIndex = new Map<string, number>();
  visibleKeys.forEach((k, idx) => keyToIndex.set(k, idx));
  const keyCount = visibleKeys.length;

  let minVal = Number.POSITIVE_INFINITY;
  let maxVal = Number.NEGATIVE_INFINITY;
  let primaryMin = Number.POSITIVE_INFINITY;
  let primaryMax = Number.NEGATIVE_INFINITY;

  slicedSeries.forEach((s, sIdx) => {
    for (const pt of s.points) {
      if (pt.value < minVal) minVal = pt.value;
      if (pt.value > maxVal) maxVal = pt.value;
      if (sIdx === 0 || !s.dashed) {
        if (pt.value < primaryMin) primaryMin = pt.value;
        if (pt.value > primaryMax) primaryMax = pt.value;
      }
    }
  });

  for (const ref of referenceLines) {
    if (ref.includeInBounds) {
      if (ref.value < minVal) minVal = ref.value;
      if (ref.value > maxVal) maxVal = ref.value;
    }
  }

  if (!Number.isFinite(minVal) || !Number.isFinite(maxVal)) {
    minVal = 0;
    maxVal = 1;
  }
  if (!Number.isFinite(primaryMin) || !Number.isFinite(primaryMax)) {
    primaryMin = minVal;
    primaryMax = maxVal;
  }

  const isFlat = maxVal === minVal;
  const span = maxVal - minVal;
  const yMin = isFlat ? minVal - Math.max(1, Math.abs(minVal) * 0.05) : minVal - span * 0.12;
  const yMax = isFlat ? maxVal + Math.max(1, Math.abs(maxVal) * 0.05) : maxVal + span * 0.1;
  const ySpan = yMax - yMin || 1;

  const usableW = Math.max(40, chartWidth - PAD_X * 2);
  const usableH = CHART_HEIGHT - PAD_Y * 2;

  const toX = (index: number) =>
    keyCount <= 1
      ? PAD_X + usableW / 2
      : PAD_X + (index / (keyCount - 1)) * usableW;

  const toY = (val: number) =>
    isFlat
      ? PAD_Y + usableH / 2
      : PAD_Y + usableH - ((val - yMin) / ySpan) * usableH;

  const filledSeriesIndex = slicedSeries.findIndex(
    (s) => s.filled && s.points.length >= 2,
  );
  const fillSeries =
    filledSeriesIndex >= 0 ? slicedSeries[filledSeriesIndex] : null;
  const fillColor = fillSeries ? fillSeries.color : theme.accent;

  const rawZeroY = toY(0);
  const anchorY =
    yMin < 0 && yMax > 0
      ? Math.min(CHART_HEIGHT - PAD_Y, Math.max(PAD_Y, rawZeroY))
      : CHART_HEIGHT - PAD_Y;

  const firstAxisLabel = rawKeyToLabel.get(visibleKeys[0]) ?? visibleKeys[0];
  const lastAxisLabel =
    rawKeyToLabel.get(visibleKeys[visibleKeys.length - 1]) ??
    visibleKeys[visibleKeys.length - 1];

  const hasToolbar =
    Boolean(leftControl) || Boolean(range && onChangeRange && rangeLabels);

  return (
    <View
      style={[
        styles.card,
        CARD_SHADOW_STYLE,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      {/* Header */}
      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.subtitleRow}>
          <Text
            style={[styles.subtitle, { color: theme.muted }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
          {deltaBadge ? (
            <Text
              style={[
                styles.deltaBadge,
                TABULAR_NUMS_STYLE,
                { color: deltaBadge.color },
              ]}
            >
              {deltaBadge.text}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Controls Toolbar */}
      {hasToolbar ? (
        <View style={styles.toolbarRow}>
          <View style={styles.toolbarLeft}>{leftControl}</View>
          {range && onChangeRange && rangeLabels ? (
            <View
              style={[
                styles.rangeGroup,
                { backgroundColor: theme.surfaceSubtle },
              ]}
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
                      {rangeLabels[key]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* SVG Plot */}
      <View style={styles.svgContainer} onLayout={handleLayout}>
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={fillColor} stopOpacity={0.2} />
              <Stop offset="100%" stopColor={fillColor} stopOpacity={0.01} />
            </LinearGradient>
          </Defs>

          {/* Horizontal Guide Lines */}
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
            y1={CHART_HEIGHT / 2}
            x2={chartWidth - PAD_X}
            y2={CHART_HEIGHT / 2}
            stroke={theme.divider}
            strokeWidth={1}
            strokeDasharray="3 4"
          />
          <Line
            x1={PAD_X}
            y1={CHART_HEIGHT - PAD_Y}
            x2={chartWidth - PAD_X}
            y2={CHART_HEIGHT - PAD_Y}
            stroke={theme.divider}
            strokeWidth={1}
          />

          {/* Optional Reference Lines (0 baseline, Peak line) */}
          {referenceLines.map((ref) => {
            const ry = toY(ref.value);
            if (ry < PAD_Y - 1 || ry > CHART_HEIGHT - PAD_Y + 1) {
              return null;
            }
            return (
              <Line
                key={ref.id}
                x1={PAD_X}
                y1={ry}
                x2={chartWidth - PAD_X}
                y2={ry}
                stroke={ref.color}
                strokeOpacity={0.65}
                strokeWidth={1.3}
                strokeDasharray={ref.dashed ? '4 4' : undefined}
              />
            );
          })}

          {/* Series Area Fill (draw behind curves) */}
          {fillSeries
            ? (() => {
                const coords = fillSeries.points.map((pt) => ({
                  x: toX(keyToIndex.get(pt.key) ?? 0),
                  y: toY(pt.value),
                }));
                const linePath = coords
                  .map(
                    (c, idx) =>
                      `${idx === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`,
                  )
                  .join(' ');
                const areaD = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${anchorY.toFixed(1)} L${coords[0].x.toFixed(1)},${anchorY.toFixed(1)} Z`;
                return <Path d={areaD} fill={`url(#${gradientId})`} />;
              })()
            : null}

          {/* Series Curves + Terminal Points */}
          {slicedSeries.map((s) => {
            if (s.points.length === 0) {
              return null;
            }
            const coords = s.points.map((pt) => ({
              x: toX(keyToIndex.get(pt.key) ?? 0),
              y: toY(pt.value),
            }));
            const pathD =
              coords.length >= 2
                ? coords
                    .map(
                      (c, idx) =>
                        `${idx === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`,
                    )
                    .join(' ')
                : '';
            const lastCoord = coords[coords.length - 1];
            return (
              <React.Fragment key={s.id}>
                {coords.length >= 2 ? (
                  <Path
                    d={pathD}
                    fill="none"
                    stroke={s.color}
                    strokeOpacity={s.dashed ? 0.72 : 1}
                    strokeWidth={s.strokeWidth ?? (s.dashed ? 1.6 : 2.2)}
                    strokeDasharray={s.dashed ? '4 3' : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
                {!s.dashed ? (
                  <Circle
                    cx={lastCoord.x}
                    cy={lastCoord.y}
                    r={coords.length === 1 ? 4.2 : 3.6}
                    fill={s.color}
                    stroke={theme.surface}
                    strokeWidth={1.6}
                  />
                ) : null}
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      {/* Date Axis & Min/Max */}
      <View style={styles.axisRow}>
        <Text
          style={[styles.axisText, TABULAR_NUMS_STYLE, { color: theme.muted }]}
        >
          {firstAxisLabel}
        </Text>
        <Text
          style={[
            styles.minMaxText,
            TABULAR_NUMS_STYLE,
            { color: theme.muted },
          ]}
          numberOfLines={1}
        >
          {keyCount === 1
            ? singleRecordLabel
            : minMaxFormatter(
                formatValue(primaryMin),
                formatValue(primaryMax),
              )}
        </Text>
        <Text
          style={[styles.axisText, TABULAR_NUMS_STYLE, { color: theme.muted }]}
        >
          {lastAxisLabel}
        </Text>
      </View>

      {/* Legend Grid */}
      <View style={[styles.legendWrap, { borderTopColor: theme.divider }]}>
        {slicedSeries.map((s) => {
          const lastPt = s.points[s.points.length - 1];
          const valText =
            s.formattedLatest ?? (lastPt ? formatValue(lastPt.value) : '—');
          return (
            <View key={s.id} style={styles.legendItem}>
              {s.dashed ? (
                <View
                  style={[styles.legendLineDashed, { borderColor: s.color }]}
                />
              ) : (
                <View
                  style={[styles.legendLineSolid, { backgroundColor: s.color }]}
                />
              )}
              <Text style={[styles.legendText, { color: theme.muted }]}>
                {s.label}:{' '}
                <Text
                  style={[
                    styles.legendStrong,
                    TABULAR_NUMS_STYLE,
                    { color: theme.text },
                  ]}
                >
                  {valText}
                </Text>
              </Text>
            </View>
          );
        })}
      </View>

      {footnote ? (
        <Text style={[styles.footnoteText, { color: theme.muted }]}>
          {footnote}
        </Text>
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
  titleBlock: {
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  subtitle: {
    fontSize: 11.5,
    flexShrink: 1,
  },
  deltaBadge: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
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
  axisRow: {
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
    flexShrink: 1,
  },
  legendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    columnGap: 12,
    rowGap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendLineSolid: {
    width: 11,
    height: 2.6,
    borderRadius: 2,
  },
  legendLineDashed: {
    width: 11,
    height: 0,
    borderBottomWidth: 1.8,
    borderStyle: 'dashed',
  },
  legendText: {
    fontSize: 11,
  },
  legendStrong: {
    fontWeight: '700',
  },
  footnoteText: {
    fontSize: 11,
    marginTop: -2,
  },
  emptyText: {
    fontSize: 12,
    paddingVertical: 8,
  },
});

