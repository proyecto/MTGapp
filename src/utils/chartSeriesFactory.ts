/**
 * @module utils/chartSeriesFactory
 * Factory module translating portfolio state and seed market indices into view-ready datasets
 * for all 12 dashboard analytics charts.
 */

import type { HorizontalBarItem } from '../components/charts/HorizontalRankingChart';
import type {
  ChartReferenceLine,
  LineChartSeries,
} from '../components/charts/MultiSeriesLineChart';
import type { VerticalBarDatum } from '../components/charts/VerticalBarChart';
import type { Translations } from '../i18n/translations';
import { getStoreSeriesColor, type AppTheme } from '../theme/tokens';
import {
  PRICE_SOURCES,
  type AppLanguage,
  type AppPreferences,
  type HistoryRange,
  type MarketIndicesData,
  type PriceSource,
} from '../types/card';
import {
  formatMoney,
  formatShortDate,
  formatSignedMoney,
  formatSignedPct,
  getCardPrimaryName,
  round2,
  slicePortfolioHistory,
  type CardWithMetrics,
  type PortfolioHistoryResult,
} from './cardMath';

/** Toggle mode comparing the selected market source vs all 5 sources simultaneously. */
export type StoreCompareMode = 'single' | 'multi';

/** Basis toggle comparing per-copy profit/loss vs position total (`× quantity`). */
export type BasisMode = 'unit' | 'total';

function formatMarketWeekAxisLabel(
  rawWeek: string,
  language: AppLanguage,
): string {
  const match = /(\d{2})\/(\d{2})/.exec(rawWeek);
  if (!match) {
    return rawWeek;
  }
  return formatShortDate(`2026-${match[2]}-${match[1]}`, language);
}

/**
 * Formats Composite Base-100 points with localized decimal separator and unit suffix.
 *
 * @param value Numeric index level or signed delta.
 * @param language Display language.
 * @param ptsUnit Localized points unit string (e.g. `pts`).
 * @param signed Whether to prepend `+` on positive deltas.
 * @returns Formatted composite value string.
 */
export function formatCompositePts(
  value: number,
  language: AppLanguage,
  ptsUnit: string,
  signed = false,
): string {
  const fixed = Math.abs(value).toFixed(2);
  const localized = language === 'es' ? fixed.replace('.', ',') : fixed;
  const sign = signed
    ? value > 0
      ? '+'
      : value < 0
        ? '-'
        : ''
    : value < 0
      ? '-'
      : '';
  return `${sign}${localized} ${ptsUnit}`;
}

/**
 * Builds Chart #1 series & delta badge: Portfolio Market Valuation vs Invested Cost.
 *
 * @param allStoreHistories Precomputed histories across all 5 stores.
 * @param selectedSource Active valuation market.
 * @param mode Single-store vs 5-store overlay mode.
 * @param range Visible date zoom window.
 * @param theme Active app theme palette.
 * @param preferences Active locale and FX preferences.
 * @param t Localized translation dictionary.
 * @returns Series definitions and optional delta badge.
 */
export function createValueChartData(
  allStoreHistories: Record<PriceSource, PortfolioHistoryResult>,
  selectedSource: PriceSource,
  mode: StoreCompareMode,
  range: HistoryRange,
  theme: AppTheme,
  preferences: AppPreferences,
  t: Translations,
): {
  series: LineChartSeries[];
  deltaBadge: { text: string; color: string } | null;
} {
  const activePts = allStoreHistories[selectedSource].points;
  const slicedActive = slicePortfolioHistory(activePts, range);
  let deltaBadge: { text: string; color: string } | null = null;

  if (mode === 'single' && slicedActive.length >= 2) {
    const first = slicedActive[0];
    const last = slicedActive[slicedActive.length - 1];
    const deltaEur = round2(last.market - first.market);
    const deltaPct = first.market > 0 ? (deltaEur / first.market) * 100 : null;
    deltaBadge = {
      text: `${formatSignedMoney(deltaEur, preferences)}${deltaPct !== null ? ` (${formatSignedPct(deltaPct, preferences.language)})` : ''}`,
      color:
        deltaEur === 0 ? theme.muted : deltaEur > 0 ? theme.gain : theme.loss,
    };
  }

  const costSeries: LineChartSeries = {
    id: 'cost',
    label: t.dashboard.legendCost,
    color: theme.muted,
    dashed: true,
    points: activePts.map((pt) => ({
      key: pt.date,
      axisLabel: formatShortDate(pt.date, preferences.language),
      value: pt.cost,
    })),
  };

  if (mode === 'single') {
    return {
      deltaBadge,
      series: [
        {
          id: 'market',
          label: t.dashboard.legendValue,
          color: theme.accent,
          filled: true,
          points: activePts.map((pt) => ({
            key: pt.date,
            axisLabel: formatShortDate(pt.date, preferences.language),
            value: pt.market,
          })),
        },
        costSeries,
      ],
    };
  }

  return {
    deltaBadge,
    series: [
      ...PRICE_SOURCES.map((src) => ({
        id: src,
        label: src,
        color: getStoreSeriesColor(src, theme.mode),
        filled: src === selectedSource,
        strokeWidth: src === selectedSource ? 2.4 : 1.7,
        points: allStoreHistories[src].points.map((pt) => ({
          key: pt.date,
          axisLabel: formatShortDate(pt.date, preferences.language),
          value: pt.market,
        })),
      })),
      costSeries,
    ],
  };
}

/**
 * Builds Chart #2 series, range-peak reference lines, and delta badge: Net Profit Evolution.
 *
 * @param allStoreHistories Precomputed histories across all 5 stores.
 * @param selectedSource Active store.
 * @param mode Single-store vs 5-store mode.
 * @param range Visible date zoom window.
 * @param theme Active app theme.
 * @param preferences Active formatting context.
 * @param t Localized strings.
 * @returns Series list, reference baselines, delta badge, and range peak footnote.
 */
export function createProfitChartData(
  allStoreHistories: Record<PriceSource, PortfolioHistoryResult>,
  selectedSource: PriceSource,
  mode: StoreCompareMode,
  range: HistoryRange,
  theme: AppTheme,
  preferences: AppPreferences,
  t: Translations,
): {
  series: LineChartSeries[];
  deltaBadge: { text: string; color: string } | null;
  referenceLines: ChartReferenceLine[];
  footnote: string | null;
} {
  const activePts = allStoreHistories[selectedSource].points;
  const slicedActive = slicePortfolioHistory(activePts, range);
  let deltaBadge: { text: string; color: string } | null = null;

  if (mode === 'single' && slicedActive.length >= 2) {
    const first = slicedActive[0];
    const last = slicedActive[slicedActive.length - 1];
    const deltaEur = round2(last.profit - first.profit);
    deltaBadge = {
      text: formatSignedMoney(deltaEur, preferences),
      color:
        deltaEur === 0 ? theme.muted : deltaEur > 0 ? theme.gain : theme.loss,
    };
  }

  let rangeMin = Number.POSITIVE_INFINITY;
  let rangePeak = Number.NEGATIVE_INFINITY;
  const refPool =
    mode === 'single'
      ? slicedActive
      : PRICE_SOURCES.flatMap((src) =>
          slicePortfolioHistory(allStoreHistories[src].points, range),
        );

  for (const pt of refPool) {
    if (pt.profit < rangeMin) rangeMin = pt.profit;
    if (pt.profit > rangePeak) rangePeak = pt.profit;
  }

  const referenceLines: ChartReferenceLine[] = [];
  if (Number.isFinite(rangeMin) && rangeMin < 50) {
    referenceLines.push({
      id: 'zero',
      value: 0,
      color: theme.muted,
      dashed: true,
      includeInBounds: true,
    });
  }
  if (Number.isFinite(rangePeak)) {
    referenceLines.push({
      id: 'peak',
      value: rangePeak,
      color: theme.gain,
      dashed: true,
      includeInBounds: false,
    });
  }

  const lastActiveProfit =
    slicedActive.length > 0 ? slicedActive[slicedActive.length - 1].profit : 0;

  const series: LineChartSeries[] =
    mode === 'single'
      ? [
          {
            id: 'profit',
            label: selectedSource,
            color: lastActiveProfit >= 0 ? theme.gain : theme.loss,
            filled: true,
            points: activePts.map((pt) => ({
              key: pt.date,
              axisLabel: formatShortDate(pt.date, preferences.language),
              value: pt.profit,
            })),
          },
        ]
      : PRICE_SOURCES.map((src) => ({
          id: src,
          label: src,
          color: getStoreSeriesColor(src, theme.mode),
          filled: src === selectedSource,
          strokeWidth: src === selectedSource ? 2.4 : 1.7,
          points: allStoreHistories[src].points.map((pt) => ({
            key: pt.date,
            axisLabel: formatShortDate(pt.date, preferences.language),
            value: pt.profit,
          })),
        }));

  return {
    series,
    deltaBadge,
    referenceLines,
    footnote: Number.isFinite(rangePeak)
      ? t.dashboard.profitPeakRef(formatSignedMoney(rangePeak, preferences))
      : null,
  };
}

/**
 * Builds Chart #3 series & zero-ROI reference baseline: Daily ROI (%) Multistore.
 *
 * @param allStoreHistories Precomputed histories across all 5 stores.
 * @param selectedSource Active store.
 * @param mode Single-store vs 5-store mode.
 * @param range Visible date zoom window.
 * @param theme Active app theme.
 * @param language Display language.
 * @returns Series definitions, optional badge, and zero-ROI reference line.
 */
export function createRoiChartData(
  allStoreHistories: Record<PriceSource, PortfolioHistoryResult>,
  selectedSource: PriceSource,
  mode: StoreCompareMode,
  range: HistoryRange,
  theme: AppTheme,
  language: AppLanguage,
): {
  series: LineChartSeries[];
  deltaBadge: { text: string; color: string } | null;
  referenceLines: ChartReferenceLine[];
} {
  const activePts = allStoreHistories[selectedSource].points;
  const slicedActive = slicePortfolioHistory(activePts, range);
  let deltaBadge: { text: string; color: string } | null = null;

  if (mode === 'single' && slicedActive.length >= 1) {
    const lastRoi = slicedActive[slicedActive.length - 1].roiPct;
    if (lastRoi !== null) {
      deltaBadge = {
        text: formatSignedPct(lastRoi, language),
        color:
          lastRoi === 0
            ? theme.muted
            : lastRoi > 0
              ? theme.gain
              : theme.loss,
      };
    }
  }

  const refPool =
    mode === 'single'
      ? slicedActive
      : PRICE_SOURCES.flatMap((src) =>
          slicePortfolioHistory(allStoreHistories[src].points, range),
        );
  let minRoi = Number.POSITIVE_INFINITY;
  for (const pt of refPool) {
    if (pt.roiPct !== null && pt.roiPct < minRoi) {
      minRoi = pt.roiPct;
    }
  }

  const referenceLines: ChartReferenceLine[] = [
    {
      id: 'roi-zero',
      value: 0,
      color: theme.muted,
      dashed: true,
      includeInBounds: Number.isFinite(minRoi) && minRoi < 10,
    },
  ];

  const toRoiSeries = (
    id: string,
    label: string,
    color: string,
    filled: boolean,
    strokeWidth: number | undefined,
    points: PortfolioHistoryResult['points'],
  ): LineChartSeries => ({
    id,
    label,
    color,
    filled,
    strokeWidth,
    points: points
      .filter((pt) => pt.roiPct !== null)
      .map((pt) => ({
        key: pt.date,
        axisLabel: formatShortDate(pt.date, language),
        value: pt.roiPct as number,
      })),
  });

  const series =
    mode === 'single'
      ? [
          toRoiSeries(
            'roi',
            selectedSource,
            theme.accent,
            true,
            undefined,
            activePts,
          ),
        ]
      : PRICE_SOURCES.map((src) =>
          toRoiSeries(
            src,
            src,
            getStoreSeriesColor(src, theme.mode),
            src === selectedSource,
            src === selectedSource ? 2.4 : 1.7,
            allStoreHistories[src].points,
          ),
        );

  return { series, deltaBadge, referenceLines };
}

/**
 * Builds Chart #4 stacked ranking items: Top 20 Most Valuable Cards (Cost + Profit).
 *
 * @param cardItems Inventory cards paired with store-evaluated metrics.
 * @param limit Max items to return (default 20).
 * @param theme Active app theme.
 * @param preferences Active formatting preferences.
 * @param t Localized translation dictionary.
 * @returns Ordered horizontal stacked bar items.
 */
export function createTopValuableRankingItems(
  cardItems: readonly CardWithMetrics[],
  theme: AppTheme,
  preferences: AppPreferences,
  t: Translations,
  limit = 20,
): HorizontalBarItem[] {
  const isDark = theme.mode === 'dark';
  const costBarColor = isDark ? '#64748B' : '#94A3B8';
  const lossShortfallColor = isDark
    ? 'rgba(248, 113, 113, 0.35)'
    : 'rgba(220, 38, 38, 0.25)';

  return [...cardItems]
    .sort(
      (a, b) =>
        b.metrics.totalMarket - a.metrics.totalMarket ||
        b.metrics.profit - a.metrics.profit,
    )
    .slice(0, limit)
    .map(({ card, metrics }) => {
      const qty = Math.max(1, card.quantity || 1);
      const isProfit = metrics.profit >= 0;
      const secondaryText =
        metrics.totalCost > 0
          ? `${formatSignedMoney(metrics.profit, preferences)} (${formatSignedPct(metrics.roiPct, preferences.language)})`
          : formatSignedMoney(metrics.profit, preferences);

      return {
        cardId: card.id,
        primaryName: getCardPrimaryName(card, preferences.language),
        metaText: `${card.setCode} · ${card.condition}${qty > 1 ? ` · ×${qty}` : ''} · ${t.dashboard.purchaseLabel(formatMoney(metrics.totalCost, preferences))}`,
        rightPrimary: formatMoney(metrics.totalMarket, preferences),
        rightPrimaryColor: theme.text,
        rightSecondary: secondaryText,
        primaryBarAmount: isProfit ? metrics.totalCost : metrics.totalMarket,
        secondaryBarAmount: isProfit ? metrics.profit : Math.abs(metrics.profit),
        primaryBarColor: isProfit ? costBarColor : theme.accent,
        secondaryBarColor: isProfit ? theme.gain : lossShortfallColor,
      };
    });
}

/**
 * Shared Factory building Top 10 Highest Profit (Chart #6) or Top 10 Biggest Loss (Chart #7) items,
 * respecting unit vs total (`× copies`) toggle.
 *
 * @param cardItems Holdings paired with store-evaluated metrics.
 * @param kind `'gain'` for descending positive profit, `'loss'` for ascending negative loss.
 * @param basis `'unit'` (matching Excel unit breakdown) or `'total'` (`× quantity`).
 * @param theme Active app theme.
 * @param preferences Active locale and FX preferences.
 * @param t Localized translation dictionary.
 * @param limit Maximum entries (default 10).
 * @returns Ranked horizontal bar items.
 */
export function createGainLossRankingItems(
  cardItems: readonly CardWithMetrics[],
  kind: 'gain' | 'loss',
  basis: BasisMode,
  theme: AppTheme,
  preferences: AppPreferences,
  t: Translations,
  limit = 10,
): HorizontalBarItem[] {
  const isGain = kind === 'gain';
  const accentColor = isGain ? theme.gain : theme.loss;

  return cardItems
    .map((item) => {
      const qty = Math.max(1, item.card.quantity || 1);
      const amount =
        basis === 'unit'
          ? round2(item.metrics.profit / qty)
          : item.metrics.profit;
      const costShown =
        basis === 'unit'
          ? round2(item.metrics.totalCost / qty)
          : item.metrics.totalCost;
      return { item, qty, amount, costShown };
    })
    .filter((entry) => (isGain ? entry.amount > 0 : entry.amount < 0))
    .sort((a, b) =>
      isGain
        ? b.amount - a.amount ||
          b.item.metrics.totalMarket - a.item.metrics.totalMarket
        : a.amount - b.amount ||
          b.item.metrics.totalCost - a.item.metrics.totalCost,
    )
    .slice(0, limit)
    .map(({ item, qty, amount, costShown }) => ({
      cardId: item.card.id,
      primaryName: getCardPrimaryName(item.card, preferences.language),
      metaText: `${item.card.setCode} · ${item.card.condition}${qty > 1 ? ` · ×${qty}` : ''} · ${t.dashboard.purchaseLabel(formatMoney(costShown, preferences))}`,
      rightPrimary: formatSignedMoney(amount, preferences),
      rightPrimaryColor: accentColor,
      rightSecondary: formatSignedPct(
        item.metrics.roiPct,
        preferences.language,
      ),
      primaryBarAmount: Math.abs(amount),
      primaryBarColor: accentColor,
    }));
}

/**
 * Formats a concise `Min · Max · Current` footer string for weekly/monthly bar charts.
 *
 * @param bars Rendered vertical bar items.
 * @param preferences Display currency and language.
 * @param t Localized dictionary.
 * @returns Summary line or `null` when empty.
 */
export function formatBarRangeSummary(
  bars: readonly VerticalBarDatum[],
  preferences: AppPreferences,
  t: Translations,
): string | null {
  if (bars.length === 0) return null;
  const vals = bars.map((b) => b.value);
  return `${t.dashboard.minLabel(formatSignedMoney(Math.min(...vals), preferences))} · ${t.dashboard.maxLabel(formatSignedMoney(Math.max(...vals), preferences))} · ${t.dashboard.currentLabel(formatSignedMoney(vals[vals.length - 1], preferences))}`;
}

/**
 * Builds Chart #10 (Collectibles normalized Base 100), Chart #11 (Active Play EUR/USD),
 * and Chart #12 (MTG Composite Base 100) datasets from {@link MarketIndicesData}.
 *
 * @param marketIndices Bundled weekly market benchmark data.
 * @param theme Active app theme.
 * @param preferences Display preferences.
 * @param t Localized translations.
 * @returns Prepared series and delta badge for all 3 market benchmark charts.
 */
export function createMarketIndexChartsData(
  marketIndices: MarketIndicesData,
  theme: AppTheme,
  preferences: AppPreferences,
  t: Translations,
): {
  collectSeries: LineChartSeries[];
  activeSeries: LineChartSeries[];
  compositeSeries: LineChartSeries[];
  compositeDelta: { text: string; color: string };
} {
  const isDark = theme.mode === 'dark';
  const weekLabels = marketIndices.weeks.map((raw, idx) => ({
    key: String(idx).padStart(2, '0'),
    axisLabel: formatMarketWeekAxisLabel(raw, preferences.language),
  }));

  const normalizeCollectible = (
    id: string,
    label: string,
    color: string,
    values: number[],
  ): LineChartSeries => {
    const base = values[0] || 1;
    const lastVal = values[values.length - 1] ?? 0;
    const pctChange = ((lastVal - base) / base) * 100;
    return {
      id,
      label,
      color,
      formattedLatest: `${formatMoney(lastVal, preferences)} (${formatSignedPct(pctChange, preferences.language)})`,
      points: values.map((v, idx) => ({
        key: weekLabels[idx].key,
        axisLabel: weekLabels[idx].axisLabel,
        value: Math.round((v / base) * 10000) / 100,
      })),
    };
  };

  const collectSeries: LineChartSeries[] = [
    normalizeCollectible(
      'dualLands',
      t.dashboard.indexDualLands,
      isDark ? '#60A5FA' : '#2563EB',
      marketIndices.collectibles.dualLands10,
    ),
    normalizeCollectible(
      'powerNine',
      t.dashboard.indexPowerNine,
      isDark ? '#FBBF24' : '#D97706',
      marketIndices.collectibles.powerNine,
    ),
    normalizeCollectible(
      'rlStaples',
      t.dashboard.indexRlStaples,
      isDark ? '#2DD4BF' : '#0D9488',
      marketIndices.collectibles.rlStaples,
    ),
  ];

  const activeSeries: LineChartSeries[] = [
    {
      id: 'commander',
      label: t.dashboard.indexCommander,
      color: isDark ? '#60A5FA' : '#2563EB',
      filled: true,
      points: marketIndices.activePlay.commanderBlueChips.map((v, idx) => ({
        key: weekLabels[idx].key,
        axisLabel: weekLabels[idx].axisLabel,
        value: v,
      })),
    },
    {
      id: 'fetchlands',
      label: t.dashboard.indexFetchlands,
      color: isDark ? '#2DD4BF' : '#0D9488',
      points: marketIndices.activePlay.fetchlands10.map((v, idx) => ({
        key: weekLabels[idx].key,
        axisLabel: weekLabels[idx].axisLabel,
        value: v,
      })),
    },
  ];

  const compVals = marketIndices.compositeBase100;
  const compFirst = compVals[0] ?? 100;
  const compLast = compVals[compVals.length - 1] ?? 100;
  const compDelta = round2(compLast - compFirst);
  const compDeltaPct = compFirst > 0 ? (compDelta / compFirst) * 100 : 0;

  return {
    collectSeries,
    activeSeries,
    compositeSeries: [
      {
        id: 'composite',
        label: t.dashboard.indexComposite,
        color: theme.accent,
        filled: true,
        points: compVals.map((v, idx) => ({
          key: weekLabels[idx].key,
          axisLabel: weekLabels[idx].axisLabel,
          value: v,
        })),
      },
    ],
    compositeDelta: {
      text: `${formatCompositePts(compDelta, preferences.language, t.dashboard.ptsUnit, true)} (${formatSignedPct(compDeltaPct, preferences.language)})`,
      color:
        compDelta === 0
          ? theme.muted
          : compDelta > 0
            ? theme.gain
            : theme.loss,
    },
  };
}

