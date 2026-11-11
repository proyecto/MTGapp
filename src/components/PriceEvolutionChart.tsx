/**
 * @module components/PriceEvolutionChart
 * Adapter adapting card-level {@link PricePoint} series to the generic {@link MultiSeriesLineChart} renderer.
 */

import React from 'react';
import { getTranslations } from '../i18n/translations';
import type { AppTheme } from '../theme/tokens';
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
import {
  computeLineChartYBounds,
  MultiSeriesLineChart,
  type LineChartSeries,
} from './charts/MultiSeriesLineChart';

/** Props accepted by {@link PriceEvolutionChart}. */
export interface PriceEvolutionChartProps {
  /** Chronological unit price history in EUR for a single store. */
  points: PricePoint[];
  /** Valuation source currently displayed. */
  source: PriceSource;
  /** Selected date zoom window. */
  range: HistoryRange;
  /** Callback when switching `7d` / `30d` / `all`. */
  onChangeRange: (range: HistoryRange) => void;
  /** Card acquisition unit price in EUR (rendered as dashed baseline when in chart bounds). */
  unitCostEur: number;
  /** Active application theme tokens. */
  theme: AppTheme;
  /** Active language, currency, and FX preferences. */
  preferences: AppPreferences;
}

/**
 * Single-card store price evolution chart wrapping {@link MultiSeriesLineChart} (Adapter pattern).
 * Computes period delta badge, formats localized money values, and conditionally adds the purchase cost baseline.
 *
 * @param props Card price points, active store, range controls, cost basis, theme, and preferences.
 * @returns Adapted {@link MultiSeriesLineChart} element.
 */
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
  const visiblePoints = slicePriceHistory(points, range);

  const series: LineChartSeries[] = [
    {
      id: `card-${source}`,
      label: source,
      color: theme.accent,
      filled: true,
      points: points.map((pt) => ({
        key: pt.date,
        axisLabel: formatShortDate(pt.date, preferences.language),
        value: pt.price,
      })),
    },
  ];

  let subtitle = '';
  let deltaBadge: { text: string; color: string } | null = null;
  let showCostRef = false;

  if (visiblePoints.length > 0) {
    const first = visiblePoints[0];
    const last = visiblePoints[visiblePoints.length - 1];
    subtitle = `${formatMoney(first.price, preferences)} → ${formatMoney(last.price, preferences)}`;

    const deltaEur = round2(last.price - first.price);
    const deltaPct = first.price > 0 ? (deltaEur / first.price) * 100 : null;
    deltaBadge = {
      text: `${formatSignedMoney(deltaEur, preferences)}${deltaPct !== null ? ` (${formatSignedPct(deltaPct, preferences.language)})` : ''}`,
      color:
        deltaEur === 0 ? theme.muted : deltaEur > 0 ? theme.gain : theme.loss,
    };

    if (visiblePoints.length >= 2 && unitCostEur > 0) {
      const slicedForBounds: LineChartSeries[] = [
        {
          ...series[0],
          points: visiblePoints.map((pt) => ({
            key: pt.date,
            axisLabel: formatShortDate(pt.date, preferences.language),
            value: pt.price,
          })),
        },
      ];
      const { yMin, yMax } = computeLineChartYBounds(slicedForBounds, [], 0);
      showCostRef = unitCostEur >= yMin && unitCostEur <= yMax;
    }
  }

  return (
    <MultiSeriesLineChart
      title={t.detail.chartTitle(source)}
      subtitle={subtitle}
      series={series}
      referenceLines={
        showCostRef
          ? [
              {
                id: 'unit-cost',
                value: unitCostEur,
                color: theme.muted,
                dashed: true,
                includeInBounds: false,
              },
            ]
          : []
      }
      deltaBadge={deltaBadge}
      gradientId="priceAreaGrad"
      theme={theme}
      formatValue={(val) => formatMoney(val, preferences)}
      range={range}
      onChangeRange={onChangeRange}
      rangeLabels={t.dashboard.rangeLabels}
      singleRecordLabel={t.detail.chartSingleRecord}
      minMaxFormatter={t.detail.chartMinMax}
      footnote={
        showCostRef
          ? t.detail.chartCostRef(formatMoney(unitCostEur, preferences))
          : null
      }
      emptyText={t.detail.chartNoData}
      chartHeight={116}
      containerBg={theme.bg}
      showShadow={false}
      hideLegend
      minYFloor={0}
    />
  );
}
