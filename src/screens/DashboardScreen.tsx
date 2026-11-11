/**
 * @module screens/DashboardScreen
 * Analytics screen displaying multi-store portfolio valuation KPIs and all 12 interactive
 * portfolio/market charts (evolution, rankings, ROI distribution, periods, and benchmarks).
 */

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { HorizontalRankingChart } from '../components/charts/HorizontalRankingChart';
import { MultiSeriesLineChart } from '../components/charts/MultiSeriesLineChart';
import {
  VerticalBarChart,
  type VerticalBarDatum,
} from '../components/charts/VerticalBarChart';
import { SegmentedToggle } from '../components/shared/FormControls';
import rawMarketIndices from '../data/seedMarketIndices.json';
import { getTranslations } from '../i18n/translations';
import {
  CARD_SHADOW_STYLE,
  TABULAR_NUMS_STYLE,
  type AppTheme,
} from '../theme/tokens';
import {
  PRICE_SOURCES,
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
  formatSignedMoney,
  formatSignedPct,
  type CardWithMetrics,
} from '../utils/cardMath';
import {
  createGainLossRankingItems,
  createMarketIndexChartsData,
  createProfitChartData,
  createRoiChartData,
  createTopValuableRankingItems,
  createValueChartData,
  formatBarRangeSummary,
  formatCompositePts,
  type BasisMode,
  type StoreCompareMode,
} from '../utils/chartSeriesFactory';

const MARKET_INDICES = rawMarketIndices as MarketIndicesData;

/** Filter category controlling which analytics sections are visible. */
export type DashboardCategory =
  | 'all'
  | 'evolution'
  | 'rankings'
  | 'periods'
  | 'indices';

const CATEGORIES: DashboardCategory[] = [
  'all',
  'evolution',
  'rankings',
  'periods',
  'indices',
];

/** Props accepted by {@link DashboardScreen}. */
export interface DashboardScreenProps {
  cards: CardHolding[];
  priceHistoryByCard: Record<string, CardPriceHistoryMap>;
  loading: boolean;
  loadError: string | null;
  onRetryLoad: () => void;
  theme: AppTheme;
  preferences: AppPreferences;
  onSelectCard: (cardId: string) => void;
}

/**
 * Portfolio analytics dashboard combining store switching, 2×2 KPI summary cards,
 * section filter pills, and all 12 spreadsheet-equivalent interactive SVG/list charts.
 *
 * @param props Portfolio holdings, historical store quotes, theme, preferences, and card selection callback.
 * @returns Scrollable analytics dashboard view.
 */
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

  const [valueMode, setValueMode] = useState<StoreCompareMode>('single');
  const [valueRange, setValueRange] = useState<HistoryRange>('all');
  const [profitMode, setProfitMode] = useState<StoreCompareMode>('single');
  const [profitRange, setProfitRange] = useState<HistoryRange>('all');
  const [roiMode, setRoiMode] = useState<StoreCompareMode>('multi');
  const [roiRange, setRoiRange] = useState<HistoryRange>('all');

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

  const valueChartData = useMemo(
    () =>
      createValueChartData(
        allStoreHistories,
        selectedSource,
        valueMode,
        valueRange,
        theme,
        preferences,
        t,
      ),
    [
      allStoreHistories,
      preferences,
      selectedSource,
      t,
      theme,
      valueMode,
      valueRange,
    ],
  );

  const profitChartData = useMemo(
    () =>
      createProfitChartData(
        allStoreHistories,
        selectedSource,
        profitMode,
        profitRange,
        theme,
        preferences,
        t,
      ),
    [
      allStoreHistories,
      preferences,
      profitMode,
      profitRange,
      selectedSource,
      t,
      theme,
    ],
  );

  const roiChartData = useMemo(
    () =>
      createRoiChartData(
        allStoreHistories,
        selectedSource,
        roiMode,
        roiRange,
        theme,
        preferences.language,
      ),
    [
      allStoreHistories,
      preferences.language,
      roiMode,
      roiRange,
      selectedSource,
      theme,
    ],
  );

  const top20Items = useMemo(
    () => createTopValuableRankingItems(cardItems, theme, preferences, t),
    [cardItems, preferences, t, theme],
  );

  const roiBucketBars = useMemo<VerticalBarDatum[]>(
    () =>
      roiDistribution.buckets.map((bucket) => ({
        key: bucket.key,
        tickLabel: bucket.compactLabel,
        inspectLabel: bucket.label,
        value: bucket.count,
        positive: !bucket.isNegative,
      })),
    [roiDistribution.buckets],
  );

  const topGainItems = useMemo(
    () =>
      createGainLossRankingItems(
        cardItems,
        'gain',
        gainBasis,
        theme,
        preferences,
        t,
      ),
    [cardItems, gainBasis, preferences, t, theme],
  );

  const topLossItems = useMemo(
    () =>
      createGainLossRankingItems(
        cardItems,
        'loss',
        lossBasis,
        theme,
        preferences,
        t,
      ),
    [cardItems, lossBasis, preferences, t, theme],
  );

  const weeklyBars = useMemo<VerticalBarDatum[]>(
    () =>
      weeklyProfitPoints.map((pt) => ({
        key: pt.key,
        tickLabel: pt.label,
        value: pt.profitEur,
        positive: pt.profitEur >= 0,
      })),
    [weeklyProfitPoints],
  );

  const weeklySummaryText = useMemo(
    () => formatBarRangeSummary(weeklyBars, preferences, t),
    [preferences, t, weeklyBars],
  );

  const monthlyBars = useMemo<VerticalBarDatum[]>(
    () =>
      monthlyProfitPoints.map((pt) => ({
        key: pt.key,
        tickLabel: pt.label,
        value: pt.profitEur,
        positive: pt.profitEur >= 0,
      })),
    [monthlyProfitPoints],
  );

  const monthlySummaryText = useMemo(
    () => formatBarRangeSummary(monthlyBars, preferences, t),
    [monthlyBars, preferences, t],
  );

  const marketIndexCharts = useMemo(
    () => createMarketIndexChartsData(MARKET_INDICES, theme, preferences, t),
    [preferences, t, theme],
  );

  const storeToggleOptions = useMemo(
    () => [
      { value: 'single' as const, label: t.dashboard.modeActiveStore },
      { value: 'multi' as const, label: t.dashboard.modeMultiStore },
    ],
    [t.dashboard.modeActiveStore, t.dashboard.modeMultiStore],
  );

  const basisToggleOptions = useMemo(
    () => [
      { value: 'unit' as const, label: t.dashboard.modeUnit },
      { value: 'total' as const, label: t.dashboard.modeTotal },
    ],
    [t.dashboard.modeTotal, t.dashboard.modeUnit],
  );

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

          {showEvolution ? (
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionEyebrow, { color: theme.muted }]}>
                {t.dashboard.sections.evolution}
              </Text>

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
                    options={storeToggleOptions}
                  />
                }
                singleRecordLabel={t.detail.chartSingleRecord}
                minMaxFormatter={t.detail.chartMinMax}
                emptyText={t.dashboard.noChartData}
              />

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
                    options={storeToggleOptions}
                  />
                }
                singleRecordLabel={t.detail.chartSingleRecord}
                minMaxFormatter={t.detail.chartMinMax}
                footnote={profitChartData.footnote}
                emptyText={t.dashboard.noChartData}
              />

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
                    options={storeToggleOptions}
                  />
                }
                singleRecordLabel={t.detail.chartSingleRecord}
                minMaxFormatter={t.detail.chartMinMax}
                emptyText={t.dashboard.noChartData}
              />
            </View>
          ) : null}

          {showRankings ? (
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionEyebrow, { color: theme.muted }]}>
                {t.dashboard.sections.rankings}
              </Text>

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

              <HorizontalRankingChart
                title={t.dashboard.topGainTitle}
                subtitle={t.dashboard.topGainSubtitle}
                headerRight={
                  <SegmentedToggle
                    value={gainBasis}
                    onChange={setGainBasis}
                    theme={theme}
                    options={basisToggleOptions}
                  />
                }
                items={topGainItems}
                footnote={t.dashboard.tapHint}
                emptyText={t.dashboard.noGainCards}
                theme={theme}
                onPressCard={onSelectCard}
              />

              <HorizontalRankingChart
                title={t.dashboard.topLossTitle}
                subtitle={t.dashboard.topLossSubtitle}
                headerRight={
                  <SegmentedToggle
                    value={lossBasis}
                    onChange={setLossBasis}
                    theme={theme}
                    options={basisToggleOptions}
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

          {showPeriods ? (
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionEyebrow, { color: theme.muted }]}>
                {t.dashboard.sections.periods}
              </Text>

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

          {showIndices ? (
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionEyebrow, { color: theme.muted }]}>
                {t.dashboard.sections.indices}
              </Text>

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
