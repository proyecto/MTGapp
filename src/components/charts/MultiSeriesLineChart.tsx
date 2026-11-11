/**
 * @module components/charts/MultiSeriesLineChart
 * Reusable SVG multi-series line & area chart with date-range zoom, dashed reference lines,
 * tabular min/max footer, and automatic empty-state rendering.
 */

import React, { useState } from 'react';
import {
  LayoutChangeEvent,
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
import { sliceByDateRange } from '../../utils/cardMath';
import { SegmentedToggle } from '../shared/FormControls';

/** Single point plotted on {@link MultiSeriesLineChart}. */
export interface LineChartPoint {
  /** Sortable unique axis key (ISO date or ordinal index). */
  key: string;
  /** Human-readable X-axis edge label. */
  axisLabel: string;
  /** Numeric metric plotted on the Y axis. */
  value: number;
}

/** Visual series descriptor for {@link MultiSeriesLineChart}. */
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

/** Horizontal reference threshold rendered behind curves (e.g., break-even cost or Base 100). */
export interface ChartReferenceLine {
  id: string;
  value: number;
  color: string;
  dashed?: boolean;
  includeInBounds?: boolean;
  label?: string;
}

/** Props accepted by {@link MultiSeriesLineChart}. */
export interface MultiSeriesLineChartProps {
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
  /** Overrides SVG plot height in dp (default `150`). */
  chartHeight?: number;
  /** Overrides container background color (default `theme.surface`). */
  containerBg?: string;
  /** Renders subtle container drop shadow when true (default `true`). */
  showShadow?: boolean;
  /** Hides bottom series legend grid (useful for single-series card preview). */
  hideLegend?: boolean;
  /** Clamps lower Y bound to at least this value (e.g. `0` for non-negative prices). */
  minYFloor?: number;
}

const RANGE_KEYS: HistoryRange[] = ['7d', '30d', 'all'];
const DEFAULT_CHART_HEIGHT = 150;
const PAD_X = 6;
const PAD_Y = 12;

/**
 * Slices series points when a date-indexed zoom window (`7d` / `30d` / `all`) is active.
 *
 * @param series Input chart series list.
 * @param range Active zoom range.
 * @returns Sliced series array.
 */
function sliceSeriesByRange(
  series: readonly LineChartSeries[],
  range?: HistoryRange,
): LineChartSeries[] {
  if (!range || range === 'all') {
    return [...series];
  }

  return series.map((s) => {
    if (s.points.length <= 2) {
      return s;
    }
    const lastKey = s.points[s.points.length - 1].key;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lastKey)) {
      return s;
    }
    const dated = s.points.map((pt) => ({ ...pt, date: pt.key }));
    const sliced = sliceByDateRange(dated, range);
    return {
      ...s,
      points: sliced.map(({ key, axisLabel, value }) => ({
        key,
        axisLabel,
        value,
      })),
    };
  });
}

/**
 * Computes Y-axis scaling bounds (`yMin`, `yMax`) and primary-series extremes across series.
 * Exported so adapters like {@link PriceEvolutionChart} can align threshold visibility hints.
 *
 * @param slicedSeries Visible series points after range slicing.
 * @param referenceLines Optional horizontal reference thresholds.
 * @param minYFloor Optional floor bound (e.g. `0` for unit card prices).
 * @returns Scaled Y axis boundaries alongside unpadded primary series min/max.
 */
export function computeLineChartYBounds(
  slicedSeries: readonly LineChartSeries[],
  referenceLines: readonly ChartReferenceLine[] = [],
  minYFloor?: number,
): { yMin: number; yMax: number; primaryMin: number; primaryMax: number } {
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
  let yMin = isFlat
    ? minVal - Math.max(1, Math.abs(minVal) * 0.05)
    : minVal - span * 0.12;
  const yMax = isFlat
    ? maxVal + Math.max(1, Math.abs(maxVal) * 0.05)
    : maxVal + span * 0.1;

  if (minYFloor !== undefined) {
    yMin = Math.max(minYFloor, yMin);
  }

  return { yMin, yMax, primaryMin, primaryMax };
}

/**
 * Renders one or more continuous metric curves with gradient fill, reference baselines,
 * range zoom toggles, min/max statistics, and optional legend rows.
 *
 * @param props Chart configuration and series data.
 * @returns Styled card container wrapping an interactive SVG chart.
 */
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
  chartHeight = DEFAULT_CHART_HEIGHT,
  containerBg,
  showShadow = true,
  hideLegend = false,
  minYFloor,
}: MultiSeriesLineChartProps) {
  const [chartWidth, setChartWidth] = useState(280);
  const bg = containerBg ?? theme.surface;

  function handleLayout(event: LayoutChangeEvent) {
    const w = Math.floor(event.nativeEvent.layout.width);
    if (w > 40 && w !== chartWidth) {
      setChartWidth(w);
    }
  }

  const rawKeyToLabel = new Map<string, string>();
  for (const s of series) {
    for (const pt of s.points) {
      if (!rawKeyToLabel.has(pt.key)) {
        rawKeyToLabel.set(pt.key, pt.axisLabel);
      }
    }
  }

  const slicedSeries = sliceSeriesByRange(series, range);
  const visibleKeySet = new Set<string>();
  for (const s of slicedSeries) {
    for (const pt of s.points) {
      visibleKeySet.add(pt.key);
    }
  }
  const visibleKeys = Array.from(visibleKeySet).sort((a, b) =>
    a.localeCompare(b),
  );

  if (visibleKeys.length === 0) {
    return (
      <View
        style={[
          styles.card,
          showShadow && CARD_SHADOW_STYLE,
          { backgroundColor: bg, borderColor: theme.border },
        ]}
      >
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {subtitle}
          </Text>
        </View>
        {leftControl ? (
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

  const { yMin, yMax, primaryMin, primaryMax } = computeLineChartYBounds(
    slicedSeries,
    referenceLines,
    minYFloor,
  );
  const isFlat = yMax === yMin;
  const ySpan = yMax - yMin || 1;

  const usableW = Math.max(40, chartWidth - PAD_X * 2);
  const usableH = chartHeight - PAD_Y * 2;

  const toX = (index: number) =>
    keyCount <= 1
      ? PAD_X + usableW / 2
      : PAD_X + (index / (keyCount - 1)) * usableW;

  const toY = (val: number) =>
    isFlat
      ? PAD_Y + usableH / 2
      : PAD_Y + usableH - ((val - yMin) / ySpan) * usableH;

  const fillSeries =
    slicedSeries.find((s) => s.filled && s.points.length >= 2) ?? null;
  const fillColor = fillSeries ? fillSeries.color : theme.accent;

  const rawZeroY = toY(0);
  const anchorY =
    yMin < 0 && yMax > 0
      ? Math.min(chartHeight - PAD_Y, Math.max(PAD_Y, rawZeroY))
      : chartHeight - PAD_Y;

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
        showShadow && CARD_SHADOW_STYLE,
        { backgroundColor: bg, borderColor: theme.border },
      ]}
    >
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

      {hasToolbar ? (
        <View style={styles.toolbarRow}>
          <View style={styles.toolbarLeft}>{leftControl}</View>
          {range && onChangeRange && rangeLabels ? (
            <SegmentedToggle
              value={range}
              onChange={onChangeRange}
              theme={theme}
              options={RANGE_KEYS.map((key) => ({
                value: key,
                label: rangeLabels[key],
              }))}
            />
          ) : null}
        </View>
      ) : null}

      <View
        style={[styles.svgContainer, { height: chartHeight }]}
        onLayout={handleLayout}
      >
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={fillColor} stopOpacity={0.2} />
              <Stop offset="100%" stopColor={fillColor} stopOpacity={0.01} />
            </LinearGradient>
          </Defs>

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
            y1={chartHeight / 2}
            x2={chartWidth - PAD_X}
            y2={chartHeight / 2}
            stroke={theme.divider}
            strokeWidth={1}
            strokeDasharray="3 4"
          />
          <Line
            x1={PAD_X}
            y1={chartHeight - PAD_Y}
            x2={chartWidth - PAD_X}
            y2={chartHeight - PAD_Y}
            stroke={theme.divider}
            strokeWidth={1}
          />

          {referenceLines.map((ref) => {
            const ry = toY(ref.value);
            if (ry < PAD_Y - 1 || ry > chartHeight - PAD_Y + 1) {
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
                    stroke={bg}
                    strokeWidth={1.6}
                  />
                ) : null}
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

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

      {!hideLegend ? (
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
                    style={[
                      styles.legendLineSolid,
                      { backgroundColor: s.color },
                    ]}
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
      ) : null}

      {footnote ? (
        <Text
          style={[
            styles.footnoteText,
            TABULAR_NUMS_STYLE,
            { color: theme.muted },
          ]}
        >
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
  svgContainer: {
    width: '100%',
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
