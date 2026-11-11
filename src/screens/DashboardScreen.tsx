import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  HorizontalRankingChart,
  type HorizontalBarItem,
} from '../components/charts/HorizontalRankingChart';
import {
  MultiSeriesLineChart,
  type ChartReferenceLine,
  type LineChartSeries,
} from '../components/charts/MultiSeriesLineChart';
import {
  VerticalBarChart,
  type VerticalBarDatum,
} from '../components/charts/VerticalBarChart';
import rawMarketIndices from '../data/seedMarketIndices.json';
import { getTranslations } from '../i18n/translations';
import {
  CARD_SHADOW_STYLE,
  TABULAR_NUMS_STYLE,
  type AppTheme,
} from '../theme/tokens';
import {
  PRICE_SOURCES,
  type AppLanguage,
  type AppPreferences,
  type CardHolding,
  type CardPriceHistoryMap,
  type HistoryRange,
  type MarketIndicesData,
  type PriceSource,
} from '../types/card';
import {
  buildAllStoreHistories,
  buildMonthlyProfitSeries,
  buildWeeklyProfitSeries,
  computeCardMetrics,
  computePortfolioSummaryForSource,
  computeRoiBuckets,
  computeSourceUnitPriceEur,
  formatMoney,
  formatShortDate,
  formatSignedMoney,
  formatSignedPct,
  getCardPrimaryName,
  round2,
  slicePortfolioHistory,
  type CardWithMetrics,
} from '../utils/cardMath';

const MARKET_INDICES = rawMarketIndices as MarketIndicesData;

type DashboardCategory = 'all' | 'evolution' | 'rankings' | 'periods' | 'indices';
type StoreCompareMode = 'single' | 'multi';
type BasisMode = 'unit' | 'total';

const CATEGORIES: DashboardCategory[] = [
  'all',
  'evolution',
  'rankings',
  'periods',
  'indices',
];

interface DashboardScreenProps {
  cards: CardHolding[];
  priceHistoryByCard: Record<string, CardPriceHistoryMap>;
  loading: boolean;
  loadError: string | null;
  onRetryLoad: () => void;
  theme: AppTheme;
  preferences: AppPreferences;
  onSelectCard: (cardId: string) => void;
}

function getStoreSeriesColor(source: PriceSource, isDark: boolean): string {
  switch (source) {
    case 'Cardmarket':
      return isDark ? '#60A5FA' : '#2563EB';
    case 'Scryfall':
      return isDark ? '#2DD4BF' : '#0D9488';
    case 'TCGPlayer':
      return isDark ? '#FBBF24' : '#D97706';
    case 'CardKingdom':
      return isDark ? '#A78BFA' : '#7C3AED';
    case 'ManaPool':
      return isDark ? '#F472B6' : '#DB2777';
  }
}

function formatMarketWeekAxisLabel(
  rawWeek: string,
  language: AppLanguage,
): string {
  const match = /(\d{2})\/(\d{2})/.exec(rawWeek);
  if (!match) {
    return rawWeek;
  }
  const isoApprox = `2026-${match[2]}-${match[1]}`;
  return formatShortDate(isoApprox, language);
}

function formatCompositePts(
  val: number,
  language: AppLanguage,
  ptsUnit: string,
  signed = false,
): string {
  const fixed = Math.abs(val).toFixed(2);
  const localized = language === 'es' ? fixed.replace('.', ',') : fixed;
  const sign = signed ? (val > 0 ? '+' : val < 0 ? '-' : '') : val < 0 ? '-' : '';
  return `${sign}${localized} ${ptsUnit}`;
}

interface SegmentedToggleProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
  theme: AppTheme;
}

function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
  theme,
}: SegmentedToggleProps<T>) {
  return (
    <View
      style={[
        styles.segmentedGroup,
        { backgroundColor: theme.surfaceSubtle },
      ]}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.segmentedBtn,
              active && { backgroundColor: theme.surface },
            ]}
          >
            <Text
              style={[
                styles.segmentedBtnText,
                {
                  color: active ? theme.accent : theme.muted,
                  fontWeight: active ? '700' : '500',
                },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function DashboardScreen({
  cards,
  priceHistoryByCard,
  loading,
  loadError,
  onRetryLoad,
  theme,
  preferences,
  onSelectCard,
}: DashboardScreenProps) {
  const t = getTranslations(preferences.language);
  const isDark = theme.mode === 'dark';

  const [selectedSource, setSelectedSource] =
    useState<PriceSource>('Cardmarket');
  const [activeCategory, setActiveCategory] =
    useState<DashboardCategory>('all');

  // Evolution chart states
  const [valueMode, setValueMode] = useState<StoreCompareMode>('single');
  const [valueRange, setValueRange] = useState<HistoryRange>('all');
  const [profitMode, setProfitMode] = useState<StoreCompareMode>('single');
  const [profitRange, setProfitRange] = useState<HistoryRange>('all');
  const [roiMode, setRoiMode] = useState<StoreCompareMode>('multi');
  const [roiRange, setRoiRange] = useState<HistoryRange>('all');

  // Unit vs Total toggles for Gain/Loss Top 10
  const [gainBasis, setGainBasis] = useState<BasisMode>('unit');
  const [lossBasis, setLossBasis] = useState<BasisMode>('unit');

  const summary = useMemo(
    () =>
      computePortfolioSummaryForSource(
        cards,
        priceHistoryByCard,
        selectedSource,
      ),
    [cards, priceHistoryByCard, selectedSource],
  );

  const allStoreHistories = useMemo(
    () => buildAllStoreHistories(cards, priceHistoryByCard),
    [cards, priceHistoryByCard],
  );

  const activeHistoryResult = allStoreHistories[selectedSource];

  const cardItems = useMemo<CardWithMetrics[]>(() => {
    return cards.map((card) => {
      const { priceEur } = computeSourceUnitPriceEur(
        card,
        priceHistoryByCard[card.id],
        selectedSource,
      );
      return {
        card,
        metrics: computeCardMetrics(card, priceEur),
      };
    });
  }, [cards, priceHistoryByCard, selectedSource]);

  const weeklyProfitPoints = useMemo(
    () =>
      buildWeeklyProfitSeries(
        cards,
        priceHistoryByCard,
        selectedSource,
        20,
        activeHistoryResult.points,
      ),
    [cards, priceHistoryByCard, selectedSource, activeHistoryResult.points],
  );

  const monthlyProfitPoints = useMemo(
    () =>
      buildMonthlyProfitSeries(
        cards,
        priceHistoryByCard,
        selectedSource,
        preferences.language,
        20,
        activeHistoryResult.points,
      ),
    [
      cards,
      priceHistoryByCard,
      selectedSource,
      preferences.language,
      activeHistoryResult.points,
    ],
  );

  const roiDistribution = useMemo(
    () => computeRoiBuckets(cardItems),
    [cardItems],
  );

  // Chart #1: Value vs Cost Series
  const valueChartData = useMemo(() => {
    const activePts = activeHistoryResult.points;
    const slicedActive = slicePortfolioHistory(activePts, valueRange);
    let deltaBadge: { text: string; color: string } | null = null;
    if (valueMode === 'single' && slicedActive.length >= 2) {
      const first = slicedActive[0];
      const last = slicedActive[slicedActive.length - 1];
      const deltaEur = round2(last.market - first.market);
      const deltaPct = first.market > 0 ? (deltaEur / first.market) * 100 : null;
      const color =
        deltaEur === 0 ? theme.muted : deltaEur > 0 ? theme.gain : theme.loss;
      deltaBadge = {
        text: `${formatSignedMoney(deltaEur, preferences)}${deltaPct !== null ? ` (${formatSignedPct(deltaPct, preferences.language)})` : ''}`,
        color,
      };
    }

    let series: LineChartSeries[] = [];
    if (valueMode === 'single') {
      series = [
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
        {
          id: 'cost',
          label: t.dashboard.legendCost,
          color: theme.muted,
          dashed: true,
          points: activePts.map((pt) => ({
            key: pt.date,
            axisLabel: formatShortDate(pt.date, preferences.language),
            value: pt.cost,
          })),
        },
      ];
    } else {
      series = [
        ...PRICE_SOURCES.map((src) => ({
          id: src,
          label: src,
          color: getStoreSeriesColor(src, isDark),
          filled: src === selectedSource,
          strokeWidth: src === selectedSource ? 2.4 : 1.7,
          points: allStoreHistories[src].points.map((pt) => ({
            key: pt.date,
            axisLabel: formatShortDate(pt.date, preferences.language),
            value: pt.market,
          })),
        })),
        {
          id: 'cost',
          label: t.dashboard.legendCost,
          color: theme.muted,
          dashed: true,
          points: activePts.map((pt) => ({
            key: pt.date,
            axisLabel: formatShortDate(pt.date, preferences.language),
            value: pt.cost,
          })),
        },
      ];
    }
    return { series, deltaBadge };
  }, [
    activeHistoryResult.points,
    allStoreHistories,
    isDark,
    preferences,
    selectedSource,
    t.dashboard.legendCost,
    t.dashboard.legendValue,
    theme.accent,
    theme.gain,
    theme.loss,
    theme.muted,
    valueMode,
    valueRange,
  ]);

  // Chart #2: Net Profit & Range Peak
  const profitChartData = useMemo(() => {
    const activePts = activeHistoryResult.points;
    const slicedActive = slicePortfolioHistory(activePts, profitRange);
    let deltaBadge: { text: string; color: string } | null = null;
    if (profitMode === 'single' && slicedActive.length >= 2) {
      const first = slicedActive[0];
      const last = slicedActive[slicedActive.length - 1];
      const deltaEur = round2(last.profit - first.profit);
      const color =
        deltaEur === 0 ? theme.muted : deltaEur > 0 ? theme.gain : theme.loss;
      deltaBadge = {
        text: formatSignedMoney(deltaEur, preferences),
        color,
      };
    }

    let rangeMin = Number.POSITIVE_INFINITY;
    let rangePeak = Number.NEGATIVE_INFINITY;
    const refPool =
      profitMode === 'single'
        ? slicedActive
        : PRICE_SOURCES.flatMap((src) =>
            slicePortfolioHistory(allStoreHistories[src].points, profitRange),
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
      profitMode === 'single'
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
            color: getStoreSeriesColor(src, isDark),
            filled: src === selectedSource,
            strokeWidth: src === selectedSource ? 2.4 : 1.7,
            points: allStoreHistories[src].points.map((pt) => ({
              key: pt.date,
              axisLabel: formatShortDate(pt.date, preferences.language),
              value: pt.profit,
            })),
          }));

    const footnote = Number.isFinite(rangePeak)
      ? t.dashboard.profitPeakRef(formatSignedMoney(rangePeak, preferences))
      : null;

    return { series, deltaBadge, referenceLines, footnote };
  }, [
    activeHistoryResult.points,
    allStoreHistories,
    isDark,
    preferences,
    profitMode,
    profitRange,
    selectedSource,
    t.dashboard,
    theme.gain,
    theme.loss,
    theme.muted,
  ]);

  // Chart #3: ROI (%) Evolution
  const roiChartData = useMemo(() => {
    const activePts = activeHistoryResult.points;
    const slicedActive = slicePortfolioHistory(activePts, roiRange);
    let deltaBadge: { text: string; color: string } | null = null;
    if (roiMode === 'single' && slicedActive.length >= 1) {
      const lastRoi = slicedActive[slicedActive.length - 1].roiPct;
      if (lastRoi !== null) {
        deltaBadge = {
          text: formatSignedPct(lastRoi, preferences.language),
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
      roiMode === 'single'
        ? slicedActive
        : PRICE_SOURCES.flatMap((src) =>
            slicePortfolioHistory(allStoreHistories[src].points, roiRange),
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

    const series: LineChartSeries[] =
      roiMode === 'single'
        ? [
            {
              id: 'roi',
              label: selectedSource,
              color: theme.accent,
              filled: true,
              points: activePts
                .filter((pt) => pt.roiPct !== null)
                .map((pt) => ({
                  key: pt.date,
                  axisLabel: formatShortDate(pt.date, preferences.language),
                  value: pt.roiPct as number,
                })),
            },
          ]
        : PRICE_SOURCES.map((src) => ({
            id: src,
            label: src,
            color: getStoreSeriesColor(src, isDark),
            filled: src === selectedSource,
            strokeWidth: src === selectedSource ? 2.4 : 1.7,
            points: allStoreHistories[src].points
              .filter((pt) => pt.roiPct !== null)
              .map((pt) => ({
                key: pt.date,
                axisLabel: formatShortDate(pt.date, preferences.language),
                value: pt.roiPct as number,
              })),
          }));

    return { series, deltaBadge, referenceLines };
  }, [
    activeHistoryResult.points,
    allStoreHistories,
    isDark,
    preferences.language,
    roiMode,
    roiRange,
    selectedSource,
    theme.accent,
    theme.gain,
    theme.loss,
    theme.muted,
  ]);

  // Chart #4: Top 20 Most Valuable Cards (stacked cost + profit)
  const top20Items = useMemo<HorizontalBarItem[]>(() => {
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
      .slice(0, 20)
      .map(({ card, metrics }) => {
        const qty = Math.max(1, card.quantity || 1);
        const name = getCardPrimaryName(card, preferences.language);
        const isProfit = metrics.profit >= 0;
        const secondaryText =
          metrics.totalCost > 0
            ? `${formatSignedMoney(metrics.profit, preferences)} (${formatSignedPct(metrics.roiPct, preferences.language)})`
            : formatSignedMoney(metrics.profit, preferences);

        return {
          cardId: card.id,
          primaryName: name,
          metaText: `${card.setCode} · ${card.condition}${qty > 1 ? ` · ×${qty}` : ''} · ${t.dashboard.purchaseLabel(formatMoney(metrics.totalCost, preferences))}`,
          rightPrimary: formatMoney(metrics.totalMarket, preferences),
          rightPrimaryColor: theme.text,
          rightSecondary: secondaryText,
          primaryBarAmount: isProfit ? metrics.totalCost : metrics.totalMarket,
          secondaryBarAmount: isProfit
            ? metrics.profit
            : Math.abs(metrics.profit),
          primaryBarColor: isProfit ? costBarColor : theme.accent,
          secondaryBarColor: isProfit ? theme.gain : lossShortfallColor,
        };
      });
  }, [cardItems, isDark, preferences, t.dashboard, theme.accent, theme.gain, theme.text]);

  // Chart #5: 8 ROI Bucket Bars
  const roiBucketBars = useMemo<VerticalBarDatum[]>(() => {
    return roiDistribution.buckets.map((bucket) => ({
      key: bucket.key,
      tickLabel: bucket.compactLabel,
      inspectLabel: bucket.label,
      value: bucket.count,
      positive: !bucket.isNegative,
    }));
  }, [roiDistribution.buckets]);

  // Chart #6: Top 10 Highest Profit
  const topGainItems = useMemo<HorizontalBarItem[]>(() => {
    const withVal = cardItems
      .map((item) => {
        const qty = Math.max(1, item.card.quantity || 1);
        const amount =
          gainBasis === 'unit'
            ? round2(item.metrics.profit / qty)
            : item.metrics.profit;
        const costShown =
          gainBasis === 'unit'
            ? round2(item.metrics.totalCost / qty)
            : item.metrics.totalCost;
        return { item, qty, amount, costShown };
      })
      .filter((x) => x.amount > 0)
      .sort(
        (a, b) =>
          b.amount - a.amount ||
          b.item.metrics.totalMarket - a.item.metrics.totalMarket,
      )
      .slice(0, 10);

    return withVal.map(({ item, qty, amount, costShown }) => ({
      cardId: item.card.id,
      primaryName: getCardPrimaryName(item.card, preferences.language),
      metaText: `${item.card.setCode} · ${item.card.condition}${qty > 1 ? ` · ×${qty}` : ''} · ${t.dashboard.purchaseLabel(formatMoney(costShown, preferences))}`,
      rightPrimary: formatSignedMoney(amount, preferences),
      rightPrimaryColor: theme.gain,
      rightSecondary: formatSignedPct(
        item.metrics.roiPct,
        preferences.language,
      ),
      primaryBarAmount: amount,
      primaryBarColor: theme.gain,
    }));
  }, [cardItems, gainBasis, preferences, t.dashboard, theme.gain]);

  // Chart #7: Top 10 Biggest Loss
  const topLossItems = useMemo<HorizontalBarItem[]>(() => {
    const withVal = cardItems
      .map((item) => {
        const qty = Math.max(1, item.card.quantity || 1);
        const amount =
          lossBasis === 'unit'
            ? round2(item.metrics.profit / qty)
            : item.metrics.profit;
        const costShown =
          lossBasis === 'unit'
            ? round2(item.metrics.totalCost / qty)
            : item.metrics.totalCost;
        return { item, qty, amount, costShown };
      })
      .filter((x) => x.amount < 0)
      .sort(
        (a, b) =>
          a.amount - b.amount ||
          b.item.metrics.totalCost - a.item.metrics.totalCost,
      )
      .slice(0, 10);

    return withVal.map(({ item, qty, amount, costShown }) => ({
      cardId: item.card.id,
      primaryName: getCardPrimaryName(item.card, preferences.language),
      metaText: `${item.card.setCode} · ${item.card.condition}${qty > 1 ? ` · ×${qty}` : ''} · ${t.dashboard.purchaseLabel(formatMoney(costShown, preferences))}`,
      rightPrimary: formatSignedMoney(amount, preferences),
      rightPrimaryColor: theme.loss,
      rightSecondary: formatSignedPct(
        item.metrics.roiPct,
        preferences.language,
      ),
      primaryBarAmount: Math.abs(amount),
      primaryBarColor: theme.loss,
    }));
  }, [cardItems, lossBasis, preferences, t.dashboard, theme.loss]);

  // Chart #8: Last 20 Weeks Profit Bars
  const weeklyBars = useMemo<VerticalBarDatum[]>(() => {
    return weeklyProfitPoints.map((pt) => ({
      key: pt.key,
      tickLabel: pt.label,
      value: pt.profitEur,
      positive: pt.profitEur >= 0,
    }));
  }, [weeklyProfitPoints]);

  const weeklySummaryText = useMemo(() => {
    if (weeklyBars.length === 0) return null;
    const vals = weeklyBars.map((b) => b.value);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const lastV = vals[vals.length - 1];
    return `${t.dashboard.minLabel(formatSignedMoney(minV, preferences))} · ${t.dashboard.maxLabel(formatSignedMoney(maxV, preferences))} · ${t.dashboard.currentLabel(formatSignedMoney(lastV, preferences))}`;
  }, [preferences, t.dashboard, weeklyBars]);

  // Chart #9: Last 20 Months Profit Bars
  const monthlyBars = useMemo<VerticalBarDatum[]>(() => {
    return monthlyProfitPoints.map((pt) => ({
      key: pt.key,
      tickLabel: pt.label,
      value: pt.profitEur,
      positive: pt.profitEur >= 0,
    }));
  }, [monthlyProfitPoints]);

  const monthlySummaryText = useMemo(() => {
    if (monthlyBars.length === 0) return null;
    const vals = monthlyBars.map((b) => b.value);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const lastV = vals[vals.length - 1];
    return `${t.dashboard.minLabel(formatSignedMoney(minV, preferences))} · ${t.dashboard.maxLabel(formatSignedMoney(maxV, preferences))} · ${t.dashboard.currentLabel(formatSignedMoney(lastV, preferences))}`;
  }, [monthlyBars, preferences, t.dashboard]);

  // Charts #10, #11, #12: Cardmarket Market Indices
  const marketIndexCharts = useMemo(() => {
    const weekLabels = MARKET_INDICES.weeks.map((raw, idx) => ({
      key: String(idx).padStart(2, '0'),
      axisLabel: formatMarketWeekAxisLabel(raw, preferences.language),
    }));

    const normalizeSeries = (
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
      normalizeSeries(
        'dualLands',
        t.dashboard.indexDualLands,
        isDark ? '#60A5FA' : '#2563EB',
        MARKET_INDICES.collectibles.dualLands10,
      ),
      normalizeSeries(
        'powerNine',
        t.dashboard.indexPowerNine,
        isDark ? '#FBBF24' : '#D97706',
        MARKET_INDICES.collectibles.powerNine,
      ),
      normalizeSeries(
        'rlStaples',
        t.dashboard.indexRlStaples,
        isDark ? '#2DD4BF' : '#0D9488',
        MARKET_INDICES.collectibles.rlStaples,
      ),
    ];

    const activeSeries: LineChartSeries[] = [
      {
        id: 'commander',
        label: t.dashboard.indexCommander,
        color: isDark ? '#60A5FA' : '#2563EB',
        filled: true,
        points: MARKET_INDICES.activePlay.commanderBlueChips.map((v, idx) => ({
          key: weekLabels[idx].key,
          axisLabel: weekLabels[idx].axisLabel,
          value: v,
        })),
      },
      {
        id: 'fetchlands',
        label: t.dashboard.indexFetchlands,
        color: isDark ? '#2DD4BF' : '#0D9488',
        points: MARKET_INDICES.activePlay.fetchlands10.map((v, idx) => ({
          key: weekLabels[idx].key,
          axisLabel: weekLabels[idx].axisLabel,
          value: v,
        })),
      },
    ];

    const compVals = MARKET_INDICES.compositeBase100;
    const compFirst = compVals[0] ?? 100;
    const compLast = compVals[compVals.length - 1] ?? 100;
    const compDelta = round2(compLast - compFirst);
    const compDeltaPct = compFirst > 0 ? (compDelta / compFirst) * 100 : 0;

    const compositeSeries: LineChartSeries[] = [
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
    ];

    return {
      collectSeries,
      activeSeries,
      compositeSeries,
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
  }, [
    isDark,
    preferences,
    t.dashboard,
    theme.accent,
    theme.gain,
    theme.loss,
    theme.muted,
  ]);

  const peakValueEur = Math.max(
    summary.totalMarket,
    activeHistoryResult.peakValueEur,
  );
  const peakProfitEur = Math.max(
    summary.totalProfit,
    activeHistoryResult.peakProfitEur,
  );

  const profitColor =
    summary.totalProfit === 0
      ? theme.muted
      : summary.totalProfit > 0
        ? theme.gain
        : theme.loss;

  const roiColor =
    summary.totalRoiPct === null || summary.totalRoiPct === 0
      ? theme.muted
      : summary.totalRoiPct > 0
        ? theme.gain
        : theme.loss;

  const showEvolution =
    activeCategory === 'all' || activeCategory === 'evolution';
  const showRankings =
    activeCategory === 'all' || activeCategory === 'rankings';
  const showPeriods = activeCategory === 'all' || activeCategory === 'periods';
  const showIndices = activeCategory === 'all' || activeCategory === 'indices';

  if (loading) {
    return (
      <View style={[styles.centerState, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="small" color={theme.accent} />
        <Text style={[styles.stateText, { color: theme.muted }]}>
          {t.common.loadingCollection}
        </Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.centerState, { backgroundColor: theme.bg }]}>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          {t.common.loadErrorTitle}
        </Text>
        <Text style={[styles.stateText, { color: theme.muted }]}>
          {loadError}
        </Text>
        <Pressable
          onPress={onRetryLoad}
          style={({ pressed }) => [
            styles.retryBtn,
            {
              backgroundColor: theme.accentSoft,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Text style={[styles.retryBtnText, { color: theme.accent }]}>
            {t.common.retry}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerBlock}>
        <Text
          style={[styles.eyebrow, { color: theme.muted }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {t.dashboard.eyebrow} · {preferences.currency}
        </Text>

        <Text style={[styles.screenTitle, { color: theme.text }]}>
          {t.dashboard.title}
        </Text>
      </View>

      {cards.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {t.empty.collectionTitle}
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.muted }]}>
            {t.empty.collectionSubtitle}
          </Text>
        </View>
      ) : (
        <>
          {/* Source Selector Chips */}
          <View style={styles.sourceSection}>
            <View style={styles.sourceMetaRow}>
              <Text style={[styles.sourceLabel, { color: theme.muted }]}>
                {t.dashboard.sourceLabel}
              </Text>
              <Text
                style={[
                  styles.coverageBadge,
                  TABULAR_NUMS_STYLE,
                  { color: theme.muted },
                ]}
              >
                {t.dashboard.coverageNote(
                  summary.coveredCount,
                  summary.uniqueCount,
                )}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {PRICE_SOURCES.map((src) => {
                const active = selectedSource === src;
                return (
                  <Pressable
                    key={src}
                    onPress={() => setSelectedSource(src)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.filterPill,
                      {
                        backgroundColor: active ? theme.accent : theme.surface,
                        borderColor: active ? theme.accent : theme.border,
                        opacity: pressed ? 0.78 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        { color: active ? theme.accentText : theme.muted },
                      ]}
                    >
                      {src}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* 2x2 KPI Grid */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiRow}>
              <View
                style={[
                  styles.kpiCard,
                  CARD_SHADOW_STYLE,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.kpiTitle, { color: theme.muted }]}>
                  {t.dashboard.kpiValue}
                </Text>
                <Text
                  style={[
                    styles.kpiValue,
                    TABULAR_NUMS_STYLE,
                    { color: theme.text },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatMoney(summary.totalMarket, preferences)}
                </Text>
                <Text
                  style={[
                    styles.kpiSub,
                    TABULAR_NUMS_STYLE,
                    { color: theme.muted },
                  ]}
                  numberOfLines={1}
                >
                  {t.dashboard.kpiValueRecord(
                    formatMoney(peakValueEur, preferences),
                  )}
                </Text>
              </View>

              <View
                style={[
                  styles.kpiCard,
                  CARD_SHADOW_STYLE,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.kpiTitle, { color: theme.muted }]}>
                  {t.dashboard.kpiCost}
                </Text>
                <Text
                  style={[
                    styles.kpiValue,
                    TABULAR_NUMS_STYLE,
                    { color: theme.text },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatMoney(summary.totalCost, preferences)}
                </Text>
                <Text
                  style={[
                    styles.kpiSub,
                    TABULAR_NUMS_STYLE,
                    { color: theme.muted },
                  ]}
                  numberOfLines={1}
                >
                  {t.dashboard.kpiCostSub}
                </Text>
              </View>
            </View>

            <View style={styles.kpiRow}>
              <View
                style={[
                  styles.kpiCard,
                  CARD_SHADOW_STYLE,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.kpiTitle, { color: theme.muted }]}>
                  {t.dashboard.kpiProfit}
                </Text>
                <Text
                  style={[
                    styles.kpiValue,
                    TABULAR_NUMS_STYLE,
                    { color: profitColor },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatSignedMoney(summary.totalProfit, preferences)}
                </Text>
                <Text
                  style={[
                    styles.kpiSub,
                    TABULAR_NUMS_STYLE,
                    { color: theme.muted },
                  ]}
                  numberOfLines={1}
                >
                  {t.dashboard.kpiProfitRecord(
                    formatSignedMoney(peakProfitEur, preferences),
                  )}
                </Text>
              </View>

              <View
                style={[
                  styles.kpiCard,
                  CARD_SHADOW_STYLE,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.kpiTitle, { color: theme.muted }]}>
                  {t.dashboard.kpiRoi}
                </Text>
                <Text
                  style={[
                    styles.kpiValue,
                    TABULAR_NUMS_STYLE,
                    { color: roiColor },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatSignedPct(summary.totalRoiPct, preferences.language)}
                </Text>
                <Text style={[styles.kpiSub, { color: theme.muted }]}>
                  {t.dashboard.kpiRoiSub}
                </Text>
              </View>
            </View>
          </View>

          {/* Chart Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setActiveCategory(cat)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [
                    styles.categoryPill,
                    {
                      backgroundColor: active
                        ? theme.accentSoft
                        : theme.surface,
                      borderColor: active ? theme.accent : theme.border,
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      {
                        color: active ? theme.accent : theme.textSecondary,
                        fontWeight: active ? '700' : '600',
                      },
                    ]}
                  >
                    {t.dashboard.categories[cat]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* SECTION 1: EVOLUTION (Charts #1, #2, #3) */}
          {showEvolution ? (
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionEyebrow, { color: theme.muted }]}>
                {t.dashboard.sections.evolution}
              </Text>

              {/* Chart 1: Portfolio Value vs Invested Cost */}
              <MultiSeriesLineChart
                title={t.dashboard.evolutionTitle}
                subtitle={t.dashboard.evolutionSubtitle}
                series={valueChartData.series}
                deltaBadge={valueChartData.deltaBadge}
                gradientId="chart-portfolio-value"
                theme={theme}
                formatValue={(v) => formatMoney(v, preferences)}
                range={valueRange}
                onChangeRange={setValueRange}
                rangeLabels={t.dashboard.rangeLabels}
                leftControl={
                  <SegmentedToggle
                    value={valueMode}
                    onChange={setValueMode}
                    theme={theme}
                    options={[
                      { value: 'single', label: t.dashboard.modeActiveStore },
                      { value: 'multi', label: t.dashboard.modeMultiStore },
                    ]}
                  />
                }
                singleRecordLabel={t.detail.chartSingleRecord}
                minMaxFormatter={t.detail.chartMinMax}
                emptyText={t.dashboard.noChartData}
              />

              {/* Chart 2: Net Profit Evolution + Peak */}
              <MultiSeriesLineChart
                title={t.dashboard.profitTitle}
                subtitle={t.dashboard.profitSubtitle}
                series={profitChartData.series}
                referenceLines={profitChartData.referenceLines}
                deltaBadge={profitChartData.deltaBadge}
                gradientId="chart-portfolio-profit"
                theme={theme}
                formatValue={(v) => formatSignedMoney(v, preferences)}
                range={profitRange}
                onChangeRange={setProfitRange}
                rangeLabels={t.dashboard.rangeLabels}
                leftControl={
                  <SegmentedToggle
                    value={profitMode}
                    onChange={setProfitMode}
                    theme={theme}
                    options={[
                      { value: 'single', label: t.dashboard.modeActiveStore },
                      { value: 'multi', label: t.dashboard.modeMultiStore },
                    ]}
                  />
                }
                singleRecordLabel={t.detail.chartSingleRecord}
                minMaxFormatter={t.detail.chartMinMax}
                footnote={profitChartData.footnote}
                emptyText={t.dashboard.noChartData}
              />

              {/* Chart 3: ROI (%) Evolution Multistore */}
              <MultiSeriesLineChart
                title={t.dashboard.roiTitle}
                subtitle={t.dashboard.roiSubtitle}
                series={roiChartData.series}
                referenceLines={roiChartData.referenceLines}
                deltaBadge={roiChartData.deltaBadge}
                gradientId="chart-portfolio-roi"
                theme={theme}
                formatValue={(v) => formatSignedPct(v, preferences.language)}
                range={roiRange}
                onChangeRange={setRoiRange}
                rangeLabels={t.dashboard.rangeLabels}
                leftControl={
                  <SegmentedToggle
                    value={roiMode}
                    onChange={setRoiMode}
                    theme={theme}
                    options={[
                      { value: 'single', label: t.dashboard.modeActiveStore },
                      { value: 'multi', label: t.dashboard.modeMultiStore },
                    ]}
                  />
                }
                singleRecordLabel={t.detail.chartSingleRecord}
                minMaxFormatter={t.detail.chartMinMax}
                emptyText={t.dashboard.noChartData}
              />
            </View>
          ) : null}

          {/* SECTION 2: RANKINGS & ROI DISTRIBUTION (Charts #4, #5, #6, #7) */}
          {showRankings ? (
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionEyebrow, { color: theme.muted }]}>
                {t.dashboard.sections.rankings}
              </Text>

              {/* Chart 4: Top 20 Most Valuable Cards (stacked Cost + Profit) */}
              <HorizontalRankingChart
                title={t.dashboard.top20Title}
                subtitle={t.dashboard.top20Subtitle}
                items={top20Items}
                legend={[
                  {
                    label: t.dashboard.legendCost,
                    color: isDark ? '#64748B' : '#94A3B8',
                  },
                  { label: t.dashboard.legendProfit, color: theme.gain },
                ]}
                footnote={t.dashboard.tapHint}
                emptyText={t.dashboard.noChartData}
                theme={theme}
                onPressCard={onSelectCard}
              />

              {/* Chart 5: ROI Distribution across 8 Excel Buckets */}
              <VerticalBarChart
                title={t.dashboard.roiDistTitle}
                subtitle={t.dashboard.roiDistSubtitle}
                bars={roiBucketBars}
                formatValue={(v) => String(Math.round(v))}
                showValuesAbove
                startFromZero
                footnote={
                  roiDistribution.zeroCostCount > 0
                    ? t.dashboard.zeroCostBucketNote(
                        roiDistribution.zeroCostCount,
                      )
                    : null
                }
                emptyText={t.dashboard.noChartData}
                theme={theme}
              />

              {/* Chart 6: Top 10 Highest Profit */}
              <HorizontalRankingChart
                title={t.dashboard.topGainTitle}
                subtitle={t.dashboard.topGainSubtitle}
                headerRight={
                  <SegmentedToggle
                    value={gainBasis}
                    onChange={setGainBasis}
                    theme={theme}
                    options={[
                      { value: 'unit', label: t.dashboard.modeUnit },
                      { value: 'total', label: t.dashboard.modeTotal },
                    ]}
                  />
                }
                items={topGainItems}
                footnote={t.dashboard.tapHint}
                emptyText={t.dashboard.noGainCards}
                theme={theme}
                onPressCard={onSelectCard}
              />

              {/* Chart 7: Top 10 Biggest Loss */}
              <HorizontalRankingChart
                title={t.dashboard.topLossTitle}
                subtitle={t.dashboard.topLossSubtitle}
                headerRight={
                  <SegmentedToggle
                    value={lossBasis}
                    onChange={setLossBasis}
                    theme={theme}
                    options={[
                      { value: 'unit', label: t.dashboard.modeUnit },
                      { value: 'total', label: t.dashboard.modeTotal },
                    ]}
                  />
                }
                items={topLossItems}
                footnote={t.dashboard.tapHint}
                emptyText={t.dashboard.noLossCards}
                theme={theme}
                onPressCard={onSelectCard}
              />
            </View>
          ) : null}

          {/* SECTION 3: WEEKLY & MONTHLY PROFIT (Charts #8, #9) */}
          {showPeriods ? (
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionEyebrow, { color: theme.muted }]}>
                {t.dashboard.sections.periods}
              </Text>

              {/* Chart 8: Last 20 Weeks Profit */}
              <VerticalBarChart
                title={t.dashboard.weeklyTitle}
                subtitle={t.dashboard.weeklySubtitle}
                bars={weeklyBars}
                formatValue={(v) => formatSignedMoney(v, preferences)}
                startFromZero
                summaryText={weeklySummaryText}
                emptyText={t.dashboard.noChartData}
                theme={theme}
              />

              {/* Chart 9: Last 20 Months Profit */}
              <VerticalBarChart
                title={t.dashboard.monthlyTitle}
                subtitle={t.dashboard.monthlySubtitle}
                bars={monthlyBars}
                formatValue={(v) => formatSignedMoney(v, preferences)}
                startFromZero
                summaryText={monthlySummaryText}
                emptyText={t.dashboard.noChartData}
                theme={theme}
              />
            </View>
          ) : null}

          {/* SECTION 4: MARKET INDICES (Charts #10, #11, #12) */}
          {showIndices ? (
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionEyebrow, { color: theme.muted }]}>
                {t.dashboard.sections.indices}
              </Text>

              {/* Chart 10: Collectibles Indices (Base 100 normalized so Duals/RL vs Power9 stay sharp) */}
              <MultiSeriesLineChart
                title={t.dashboard.indicesCollectTitle}
                subtitle={t.dashboard.indicesCollectSubtitle}
                series={marketIndexCharts.collectSeries}
                referenceLines={[
                  {
                    id: 'base100',
                    value: 100,
                    color: theme.muted,
                    dashed: true,
                    includeInBounds: true,
                  },
                ]}
                gradientId="chart-index-collect"
                theme={theme}
                formatValue={(v) =>
                  formatSignedPct(v - 100, preferences.language)
                }
                singleRecordLabel={t.detail.chartSingleRecord}
                minMaxFormatter={t.detail.chartMinMax}
                emptyText={t.dashboard.noChartData}
              />

              {/* Chart 11: Active Play Indices */}
              <MultiSeriesLineChart
                title={t.dashboard.indicesActiveTitle}
                subtitle={t.dashboard.indicesActiveSubtitle}
                series={marketIndexCharts.activeSeries}
                gradientId="chart-index-active"
                theme={theme}
                formatValue={(v) => formatMoney(v, preferences)}
                singleRecordLabel={t.detail.chartSingleRecord}
                minMaxFormatter={t.detail.chartMinMax}
                emptyText={t.dashboard.noChartData}
              />

              {/* Chart 12: General MTG Composite Base 100 */}
              <MultiSeriesLineChart
                title={t.dashboard.indicesCompositeTitle}
                subtitle={t.dashboard.indicesCompositeSubtitle}
                series={marketIndexCharts.compositeSeries}
                referenceLines={[
                  {
                    id: 'comp-base100',
                    value: 100,
                    color: theme.muted,
                    dashed: true,
                    includeInBounds: true,
                  },
                ]}
                deltaBadge={marketIndexCharts.compositeDelta}
                gradientId="chart-index-composite"
                theme={theme}
                formatValue={(v) =>
                  formatCompositePts(
                    v,
                    preferences.language,
                    t.dashboard.ptsUnit,
                  )
                }
                singleRecordLabel={t.detail.chartSingleRecord}
                minMaxFormatter={t.detail.chartMinMax}
                emptyText={t.dashboard.noChartData}
              />
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 28,
    gap: 12,
  },
  headerBlock: {
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  sourceSection: {
    gap: 6,
  },
  sourceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sourceLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  coverageBadge: {
    fontSize: 11,
    fontWeight: '500',
  },
  horizontalScroll: {
    gap: 6,
    paddingRight: 4,
  },
  filterPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 12,
  },
  kpiGrid: {
    gap: 10,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    gap: 3,
  },
  kpiTitle: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  kpiSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  sectionBlock: {
    gap: 12,
    marginTop: 2,
  },
  sectionEyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 2,
    marginBottom: -4,
    paddingLeft: 2,
  },
  segmentedGroup: {
    flexDirection: 'row',
    borderRadius: 9,
    padding: 2,
    gap: 2,
    flexShrink: 0,
  },
  segmentedBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  segmentedBtnText: {
    fontSize: 11,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  stateText: {
    fontSize: 13,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
