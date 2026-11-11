import React, { useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import {
  CARD_SHADOW_STYLE,
  TABULAR_NUMS_STYLE,
  type AppTheme,
} from '../../theme/tokens';

export interface VerticalBarDatum {
  key: string;
  tickLabel: string;
  value: number;
  positive: boolean;
  inspectLabel?: string;
}

interface VerticalBarChartProps {
  title: string;
  subtitle: string;
  bars: VerticalBarDatum[];
  formatValue: (value: number) => string;
  showValuesAbove?: boolean;
  startFromZero?: boolean;
  summaryText?: string | null;
  footnote?: string | null;
  emptyText: string;
  theme: AppTheme;
}

const CHART_HEIGHT = 128;
const PAD_Y = 8;

export function VerticalBarChart({
  title,
  subtitle,
  bars,
  formatValue,
  showValuesAbove = false,
  startFromZero = false,
  summaryText,
  footnote,
  emptyText,
  theme,
}: VerticalBarChartProps) {
  const [chartWidth, setChartWidth] = useState(280);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  function handleLayout(event: LayoutChangeEvent) {
    const w = Math.floor(event.nativeEvent.layout.width);
    if (w > 40 && w !== chartWidth) {
      setChartWidth(w);
    }
  }

  const count = bars.length;

  if (count === 0) {
    return (
      <View
        style={[
          styles.card,
          CARD_SHADOW_STYLE,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {subtitle}
          </Text>
        </View>
        <Text style={[styles.emptyText, { color: theme.muted }]}>
          {emptyText}
        </Text>
      </View>
    );
  }

  const activeIndex =
    selectedIndex !== null && selectedIndex >= 0 && selectedIndex < count
      ? selectedIndex
      : null;
  const inspectedBar = activeIndex !== null ? bars[activeIndex] : null;

  let minVal = bars[0].value;
  let maxVal = bars[0].value;
  for (const b of bars) {
    if (b.value < minVal) minVal = b.value;
    if (b.value > maxVal) maxVal = b.value;
  }

  // Ensure baseline fits cleanly
  let yMin = minVal;
  let yMax = maxVal;
  if (startFromZero || (minVal <= 0 && maxVal >= 0)) {
    if (yMin > 0) yMin = 0;
    if (yMax < 0) yMax = 0;
  }
  const rawSpan = yMax - yMin;
  if (rawSpan === 0) {
    const pad = Math.max(1, Math.abs(yMax) * 0.15);
    yMin = yMin >= 0 && startFromZero ? 0 : yMin - pad;
    yMax = yMax + pad;
  } else {
    yMin = yMin === 0 && startFromZero ? 0 : yMin - rawSpan * 0.08;
    yMax = yMax === 0 && startFromZero ? 0 : yMax + rawSpan * 0.1;
  }
  const ySpan = yMax - yMin || 1;
  const usableH = CHART_HEIGHT - PAD_Y * 2;

  const toY = (val: number) =>
    PAD_Y + usableH - ((val - yMin) / ySpan) * usableH;

  const zeroInRange = yMin <= 0 && yMax >= 0;
  const baselineVal = zeroInRange ? 0 : yMin;
  const yZero = toY(baselineVal);

  const slotW = chartWidth / count;
  const barW = Math.max(4, Math.min(26, slotW * 0.62));
  const isDense = count > 10;

  // Pick up to 5 evenly spaced indices for dense (e.g. 20-bar) x-axis
  const sparseIndices = new Set<number>();
  if (isDense && count >= 5) {
    sparseIndices.add(0);
    sparseIndices.add(Math.round((count - 1) * 0.25));
    sparseIndices.add(Math.round((count - 1) * 0.5));
    sparseIndices.add(Math.round((count - 1) * 0.75));
    sparseIndices.add(count - 1);
  }

  return (
    <View
      style={[
        styles.card,
        CARD_SHADOW_STYLE,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={styles.headerBlock}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: theme.text }]}
            numberOfLines={2}
          >
            {title}
          </Text>
          {inspectedBar ? (
            <View
              style={[
                styles.inspectBadge,
                { backgroundColor: theme.surfaceSubtle },
              ]}
            >
              <Text
                style={[
                  styles.inspectBadgeText,
                  TABULAR_NUMS_STYLE,
                  {
                    color: inspectedBar.positive ? theme.gain : theme.loss,
                  },
                ]}
              >
                {inspectedBar.inspectLabel ?? inspectedBar.tickLabel}:{' '}
                {formatValue(inspectedBar.value)}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          {subtitle}
        </Text>
      </View>

      {/* Value labels directly above bars (ideal for <= 10 bars like ROI buckets) */}
      {showValuesAbove ? (
        <View style={styles.columnLabelsRow}>
          {bars.map((b, idx) => {
            const isSel = activeIndex === idx;
            return (
              <Text
                key={`top-${b.key}`}
                style={[
                  styles.aboveValueText,
                  TABULAR_NUMS_STYLE,
                  {
                    color: isSel
                      ? theme.accent
                      : b.value > 0
                        ? theme.text
                        : theme.muted,
                    fontWeight: isSel || b.value > 0 ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {formatValue(b.value)}
              </Text>
            );
          })}
        </View>
      ) : null}

      {/* Bars Plot + Touch Overlay */}
      <View style={styles.plotWrap} onLayout={handleLayout}>
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          <Line
            x1={0}
            y1={PAD_Y}
            x2={chartWidth}
            y2={PAD_Y}
            stroke={theme.divider}
            strokeWidth={1}
          />
          <Line
            x1={0}
            y1={CHART_HEIGHT / 2}
            x2={chartWidth}
            y2={CHART_HEIGHT / 2}
            stroke={theme.divider}
            strokeWidth={1}
            strokeDasharray="3 4"
          />
          <Line
            x1={0}
            y1={yZero}
            x2={chartWidth}
            y2={yZero}
            stroke={zeroInRange && minVal < 0 ? theme.muted : theme.divider}
            strokeOpacity={zeroInRange && minVal < 0 ? 0.55 : 1}
            strokeWidth={1}
          />

          {bars.map((b, idx) => {
            const valY = toY(b.value);
            const rawHeight = Math.abs(valY - yZero);
            const barHeight = b.value === 0 ? 2 : Math.max(3, rawHeight);
            const yPos =
              b.value >= baselineVal
                ? yZero - barHeight
                : yZero;
            const xPos = idx * slotW + (slotW - barW) / 2;

            const fillColor = b.positive ? theme.accent : theme.loss;
            const isDimmed = activeIndex !== null && activeIndex !== idx;

            return (
              <Rect
                key={b.key}
                x={xPos}
                y={yPos}
                width={barW}
                height={barHeight}
                rx={isDense ? 2.5 : 4}
                fill={fillColor}
                fillOpacity={isDimmed ? 0.35 : 0.92}
              />
            );
          })}
        </Svg>

        {/* Tappable columns to inspect individual bar values */}
        <View style={styles.touchOverlay}>
          {bars.map((b, idx) => (
            <Pressable
              key={`hit-${b.key}`}
              style={styles.touchCol}
              onPress={() =>
                setSelectedIndex((prev) => (prev === idx ? null : idx))
              }
              accessibilityRole="button"
              accessibilityLabel={`${b.inspectLabel ?? b.tickLabel} ${formatValue(b.value)}`}
            />
          ))}
        </View>
      </View>

      {/* X-Axis Tick Labels */}
      {isDense ? (
        <View style={styles.sparseAxisRow}>
          {Array.from(sparseIndices).map((idx, pos, arr) => {
            const b = bars[idx];
            if (!b) return null;
            const alignStyle =
              pos === 0
                ? styles.alignLeft
                : pos === arr.length - 1
                  ? styles.alignRight
                  : styles.alignCenter;
            return (
              <Text
                key={`tick-${b.key}`}
                style={[
                  styles.sparseTickText,
                  TABULAR_NUMS_STYLE,
                  alignStyle,
                  { color: activeIndex === idx ? theme.accent : theme.muted },
                ]}
                numberOfLines={1}
              >
                {b.tickLabel}
              </Text>
            );
          })}
        </View>
      ) : (
        <View style={styles.columnLabelsRow}>
          {bars.map((b, idx) => (
            <Text
              key={`tick-${b.key}`}
              style={[
                styles.barTickText,
                TABULAR_NUMS_STYLE,
                { color: activeIndex === idx ? theme.accent : theme.muted },
              ]}
            >
              {b.tickLabel}
            </Text>
          ))}
        </View>
      )}

      {summaryText ? (
        <View style={[styles.footerRow, { borderTopColor: theme.divider }]}>
          <Text
            style={[
              styles.summaryText,
              TABULAR_NUMS_STYLE,
              { color: theme.muted },
            ]}
          >
            {summaryText}
          </Text>
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
    gap: 8,
  },
  headerBlock: {
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 11.5,
  },
  inspectBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    flexShrink: 0,
  },
  inspectBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  columnLabelsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  aboveValueText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10.5,
  },
  plotWrap: {
    width: '100%',
    height: CHART_HEIGHT,
    position: 'relative',
  },
  touchOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
  },
  touchCol: {
    flex: 1,
  },
  barTickText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9.5,
    lineHeight: 11.5,
    fontWeight: '500',
  },
  sparseAxisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  sparseTickText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '500',
  },
  alignLeft: {
    textAlign: 'left',
  },
  alignCenter: {
    textAlign: 'center',
  },
  alignRight: {
    textAlign: 'right',
  },
  footerRow: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  summaryText: {
    fontSize: 11,
    fontWeight: '500',
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
