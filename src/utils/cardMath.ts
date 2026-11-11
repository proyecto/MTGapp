/**
 * @module utils/cardMath
 * Domain math, FX currency strategy formatting, filtering/sorting factories,
 * and historical portfolio aggregation matching the MTG Vault Excel workbook.
 */

import type {
  AppLanguage,
  AppPreferences,
  CardFilter,
  CardHolding,
  CardMetrics,
  CardPriceHistoryMap,
  CardSort,
  CurrencyCode,
  HistoryRange,
  PeriodicProfitPoint,
  PortfolioHistoryPoint,
  PortfolioSummary,
  PricePoint,
  PriceSource,
} from '../types/card';

/** Offline default EUR → USD conversion rate when none is persisted. */
export const DEFAULT_EUR_TO_USD_RATE = 1.08;

/** Subset of {@link AppPreferences} needed for currency & locale formatting. */
export type FormatContext = Pick<
  AppPreferences,
  'language' | 'currency' | 'eurToUsdRate'
>;

/** Strategy contract for converting and labeling display currencies. */
interface CurrencyStrategy {
  symbol: string;
  fromEur: (eurValue: number, eurToUsdRate: number) => number;
}

/**
 * Rounds a number to 2 decimal places while normalizing `-0` to `0`.
 *
 * @param value Raw floating-point number.
 * @returns Rounded value to 2 decimal places.
 */
export function round2(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) || rounded === 0 ? 0 : rounded;
}

/**
 * Validates and normalizes an exchange rate within sane bounds `(0.01, 1000)`.
 *
 * @param raw Candidate multiplier.
 * @returns Validated multiplier rounded to 4 decimal places, or {@link DEFAULT_EUR_TO_USD_RATE}.
 */
export function normalizeExchangeRate(raw: number): number {
  return Number.isFinite(raw) && raw > 0.01 && raw < 1000
    ? Math.round(raw * 10000) / 10000
    : DEFAULT_EUR_TO_USD_RATE;
}

/** Strategy Registry mapping supported {@link CurrencyCode}s to conversion logic. */
const CURRENCY_STRATEGIES: Record<CurrencyCode, CurrencyStrategy> = {
  EUR: {
    symbol: '€',
    fromEur: (eurValue) => round2(eurValue),
  },
  USD: {
    symbol: '$',
    fromEur: (eurValue, eurToUsdRate) =>
      round2(eurValue * normalizeExchangeRate(eurToUsdRate)),
  },
};

/**
 * Converts a base EUR amount into the target display currency.
 *
 * @param eurValue Amount in base EUR.
 * @param currency Target currency code.
 * @param eurToUsdRate Optional EUR→USD multiplier.
 * @returns Converted amount rounded to 2 decimals.
 */
export function convertFromEur(
  eurValue: number,
  currency: CurrencyCode,
  eurToUsdRate: number = DEFAULT_EUR_TO_USD_RATE,
): number {
  const strategy = CURRENCY_STRATEGIES[currency] ?? CURRENCY_STRATEGIES.EUR;
  return strategy.fromEur(eurValue, eurToUsdRate);
}

/**
 * Resolves the primary display name for a card according to the active language.
 *
 * @param card Card naming fields.
 * @param language Active UI language.
 * @returns Preferred name, falling back to the alternate language if blank.
 */
export function getCardPrimaryName(
  card: Pick<CardHolding, 'nameEs' | 'nameEn'>,
  language: AppLanguage,
): string {
  if (language === 'en') {
    return card.nameEn.trim() || card.nameEs.trim();
  }
  return card.nameEs.trim() || card.nameEn.trim();
}

/**
 * Returns the alternate-language card name when distinct from the primary name.
 *
 * @param card Card naming fields.
 * @param language Active UI language.
 * @returns Alternate card name or `null` if identical/absent.
 */
export function getCardSecondaryName(
  card: Pick<CardHolding, 'nameEs' | 'nameEn'>,
  language: AppLanguage,
): string | null {
  const primary = getCardPrimaryName(card, language);
  const alternate =
    language === 'en' ? card.nameEs.trim() : card.nameEn.trim();
  if (!alternate || alternate.toLowerCase() === primary.toLowerCase()) {
    return null;
  }
  return alternate;
}

/**
 * Computes total cost basis, market valuation, net profit, and ROI for a card holding.
 *
 * @param card Inventory holding entry.
 * @param overrideUnitMarketEur Optional store-specific unit market override in EUR.
 * @returns Financial metrics in base EUR (`roiPct` is `null` when total cost is zero).
 */
export function computeCardMetrics(
  card: CardHolding,
  overrideUnitMarketEur?: number,
): CardMetrics {
  const qty = Math.max(1, card.quantity || 1);
  const unitMarket =
    overrideUnitMarketEur !== undefined
      ? overrideUnitMarketEur
      : card.marketPriceEur;
  const totalCost = round2(card.unitCostEur * qty + card.shippingEur);
  const totalMarket = round2(unitMarket * qty);
  const profit = round2(totalMarket - totalCost);
  const roiPct = totalCost > 0 ? (profit / totalCost) * 100 : null;
  return { totalCost, totalMarket, profit, roiPct };
}

/**
 * Aggregates cost, valuation, profit, and ROI across all provided cards in base EUR.
 *
 * @param cards Inventory cards.
 * @returns Portfolio totals.
 */
export function computePortfolioSummary(
  cards: readonly CardHolding[],
): PortfolioSummary {
  let totalCopies = 0;
  let costSum = 0;
  let marketSum = 0;

  for (const card of cards) {
    const qty = Math.max(1, card.quantity || 1);
    totalCopies += qty;
    costSum += card.unitCostEur * qty + card.shippingEur;
    marketSum += card.marketPriceEur * qty;
  }

  const totalCost = round2(costSum);
  const totalMarket = round2(marketSum);
  const totalProfit = round2(totalMarket - totalCost);
  const totalRoiPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : null;

  return {
    uniqueCount: cards.length,
    totalCopies,
    totalCost,
    totalMarket,
    totalProfit,
    totalRoiPct,
  };
}

/**
 * Resolves a card's latest unit valuation in EUR for a specific store source.
 * Falls back to `card.marketPriceEur` when a store has no native series for the card.
 *
 * @param card Card holding.
 * @param historyMap Optional map of store time series.
 * @param source Target market source.
 * @returns Resolved EUR price and whether a native store quote was available.
 */
export function computeSourceUnitPriceEur(
  card: CardHolding,
  historyMap: CardPriceHistoryMap | undefined,
  source: PriceSource,
): { priceEur: number; hasNativePrice: boolean } {
  const pts = historyMap?.[source];
  if (pts && pts.length > 0) {
    if (source === 'Cardmarket') {
      // Keep live valuation synchronized with manual Cardmarket edits on the holding
      return { priceEur: round2(card.marketPriceEur), hasNativePrice: true };
    }
    return { priceEur: round2(pts[pts.length - 1].price), hasNativePrice: true };
  }
  return {
    priceEur: round2(card.marketPriceEur),
    hasNativePrice: source === 'Cardmarket',
  };
}

/**
 * Computes portfolio totals for a given market source alongside native price coverage count.
 *
 * @param cards Inventory cards.
 * @param allHistoryByCard Map from `card.id` to store series maps.
 * @param source Selected store source.
 * @returns Portfolio summary plus `coveredCount`.
 */
export function computePortfolioSummaryForSource(
  cards: readonly CardHolding[],
  allHistoryByCard: Record<string, CardPriceHistoryMap>,
  source: PriceSource,
): PortfolioSummary & { coveredCount: number } {
  let totalCopies = 0;
  let costSum = 0;
  let marketSum = 0;
  let coveredCount = 0;

  for (const card of cards) {
    const qty = Math.max(1, card.quantity || 1);
    totalCopies += qty;
    costSum += card.unitCostEur * qty + card.shippingEur;

    const { priceEur, hasNativePrice } = computeSourceUnitPriceEur(
      card,
      allHistoryByCard[card.id],
      source,
    );
    if (hasNativePrice) {
      coveredCount += 1;
    }
    marketSum += priceEur * qty;
  }

  const totalCost = round2(costSum);
  const totalMarket = round2(marketSum);
  const totalProfit = round2(totalMarket - totalCost);
  const totalRoiPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : null;

  return {
    uniqueCount: cards.length,
    totalCopies,
    totalCost,
    totalMarket,
    totalProfit,
    totalRoiPct,
    coveredCount,
  };
}

function formatGroupedNumber(
  absValue: number,
  decimals: number,
  thousandsSep: string,
  decimalSep: string,
): string {
  const fixed = absValue.toFixed(decimals);
  const [intPart, fracPart] = fixed.split('.');
  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);
  return decimals > 0 ? `${groupedInt}${decimalSep}${fracPart}` : groupedInt;
}

function formatAmountInternal(
  eurValue: number,
  prefs: FormatContext,
  signed: boolean,
): string {
  const strategy = CURRENCY_STRATEGIES[prefs.currency] ?? CURRENCY_STRATEGIES.EUR;
  const normalized = round2(strategy.fromEur(eurValue, prefs.eurToUsdRate));
  const sign = signed
    ? normalized > 0
      ? '+'
      : normalized < 0
        ? '-'
        : ''
    : normalized < 0
      ? '-'
      : '';

  const isEn = prefs.language === 'en';
  const numStr = formatGroupedNumber(
    Math.abs(normalized),
    2,
    isEn ? ',' : '.',
    isEn ? '.' : ',',
  );

  return isEn
    ? `${sign}${strategy.symbol}${numStr}`
    : `${sign}${numStr} ${strategy.symbol}`;
}

/**
 * Formats a base EUR monetary value in the user's configured currency and locale.
 *
 * @param eurValue Amount in base EUR.
 * @param prefs Display currency, FX rate, and language context.
 * @returns Localized money string (e.g., `3.122,03 €` or `$3,371.79`).
 */
export function formatMoney(eurValue: number, prefs: FormatContext): string {
  return formatAmountInternal(eurValue, prefs, false);
}

/**
 * Formats a base EUR monetary delta with explicit `+` / `-` sign.
 *
 * @param eurValue Signed amount in base EUR.
 * @param prefs Display currency, FX rate, and language context.
 * @returns Signed money string (e.g., `+915,67 €`).
 */
export function formatSignedMoney(
  eurValue: number,
  prefs: FormatContext,
): string {
  return formatAmountInternal(eurValue, prefs, true);
}

/**
 * Formats a percentage ROI delta with 1 decimal place, or returns a zero-cost label.
 *
 * @param value ROI percentage or `null` when cost basis is zero.
 * @param language Display language (`'es'` | `'en'`).
 * @returns Formatted percentage string.
 */
export function formatSignedPct(
  value: number | null,
  language: AppLanguage = 'es',
): string {
  if (value === null || !Number.isFinite(value)) {
    return language === 'en' ? 'Zero cost' : 'Sin coste';
  }
  const rounded = Math.round(value * 10) / 10;
  const normalized = Object.is(rounded, -0) || rounded === 0 ? 0 : rounded;
  const sign = normalized > 0 ? '+' : normalized < 0 ? '-' : '';
  const isEn = language === 'en';
  const numStr = formatGroupedNumber(
    Math.abs(normalized),
    1,
    isEn ? ',' : '.',
    isEn ? '.' : ',',
  );
  return `${sign}${numStr}%`;
}

/**
 * Parses a localized user decimal input (accepting `.` or `,`) into a non-negative number.
 *
 * @param raw Raw input string.
 * @param fallback Value returned when empty or invalid.
 * @returns Parsed non-negative number.
 */
export function parseDecimalInput(raw: string, fallback = 0): number {
  const trimmed = raw.trim();
  if (!trimmed) {
    return fallback;
  }
  const cleaned = trimmed.replace(/\s+/g, '').replace(',', '.');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * Parses an integer quantity string clamped to `>= 1`.
 *
 * @param raw Raw input string.
 * @param fallback Default quantity when invalid.
 * @returns Parsed integer `>= 1`.
 */
export function parseIntInput(raw: string, fallback = 1): number {
  const parsed = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
}

/**
 * Normalizes diacritics and casing for diacritic-insensitive text search.
 *
 * @param text Raw string.
 * @returns Lowercase trimmed ASCII-folded text.
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Holding paired with its pre-calculated financial {@link CardMetrics}. */
export interface CardWithMetrics {
  card: CardHolding;
  metrics: CardMetrics;
}

/** Strategy map of collection filter predicates keyed by {@link CardFilter}. */
const CARD_FILTER_PREDICATES: Record<
  CardFilter,
  (metrics: CardMetrics) => boolean
> = {
  all: () => true,
  gain: (m) => m.profit > 0,
  loss: (m) => m.profit < 0,
  zeroCost: (m) => m.totalCost <= 0,
};

/**
 * Factory creating a specialized {@link CardWithMetrics} comparator for a sort criterion.
 *
 * @param sort Active sort criterion.
 * @param language Language used for locale-aware alphabetical ordering.
 * @returns Comparator compatible with `Array.prototype.sort`.
 */
export function createCardComparator(
  sort: CardSort,
  language: AppLanguage = 'es',
): (a: CardWithMetrics, b: CardWithMetrics) => number {
  const compareNames = (a: CardWithMetrics, b: CardWithMetrics) =>
    getCardPrimaryName(a.card, language).localeCompare(
      getCardPrimaryName(b.card, language),
      language,
    );

  switch (sort) {
    case 'value':
      return (a, b) =>
        b.metrics.totalMarket - a.metrics.totalMarket ||
        b.metrics.profit - a.metrics.profit ||
        compareNames(a, b);
    case 'profit':
      return (a, b) =>
        b.metrics.profit - a.metrics.profit ||
        b.metrics.totalMarket - a.metrics.totalMarket;
    case 'loss':
      return (a, b) =>
        a.metrics.profit - b.metrics.profit ||
        b.metrics.totalCost - a.metrics.totalCost;
    case 'roi':
      return (a, b) => {
        const aRoi = a.metrics.roiPct;
        const bRoi = b.metrics.roiPct;
        if (aRoi === null && bRoi === null) {
          return b.metrics.totalMarket - a.metrics.totalMarket;
        }
        if (aRoi === null) return 1;
        if (bRoi === null) return -1;
        return bRoi - aRoi || b.metrics.profit - a.metrics.profit;
      };
    case 'name':
      return compareNames;
    case 'date':
      return (a, b) =>
        b.card.purchaseDate.localeCompare(a.card.purchaseDate) ||
        (b.card.createdAt ?? 0) - (a.card.createdAt ?? 0);
  }
}

/**
 * Filters and sorts inventory holdings using search query, predicate strategy, and sort factory.
 *
 * @param cards Full inventory array.
 * @param query User search text.
 * @param filter Profit/cost filter chip key.
 * @param sort Active sort criterion.
 * @param language Active display language for name sorting.
 * @returns Filtered and sorted list of holdings paired with metrics.
 */
export function filterAndSortCards(
  cards: readonly CardHolding[],
  query: string,
  filter: CardFilter,
  sort: CardSort,
  language: AppLanguage = 'es',
): CardWithMetrics[] {
  const normalizedQuery = normalizeSearchText(query);
  const predicate = CARD_FILTER_PREDICATES[filter] ?? CARD_FILTER_PREDICATES.all;
  const items: CardWithMetrics[] = [];

  for (const card of cards) {
    const metrics = computeCardMetrics(card);
    if (!predicate(metrics)) continue;

    if (normalizedQuery) {
      const haystack = normalizeSearchText(
        `${card.nameEs} ${card.nameEn} ${card.setCode} ${card.setName} ${card.collectorNumber} ${card.deck ?? ''} ${card.id}`,
      );
      if (!haystack.includes(normalizedQuery)) continue;
    }

    items.push({ card, metrics });
  }

  return items.sort(createCardComparator(sort, language));
}

/**
 * Returns today's local calendar date formatted as `YYYY-MM-DD`.
 *
 * @returns ISO date string.
 */
export function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const MONTH_ABBR_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

const MONTH_ABBR_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const MONTH_TITLE_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const;

/**
 * Formats an ISO date (`YYYY-MM-DD`) into a compact chart axis label (e.g., `07 sep` / `Sep 7`).
 *
 * @param isoDate ISO calendar string.
 * @param language Display language.
 * @returns Localized compact label.
 */
export function formatShortDate(
  isoDate: string,
  language: AppLanguage = 'es',
): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    return isoDate;
  }
  const monthIdx = Number.parseInt(match[2], 10) - 1;
  const dayNum = Number.parseInt(match[3], 10);
  if (language === 'en') {
    const monthLabel = MONTH_ABBR_EN[monthIdx] ?? match[2];
    return `${monthLabel} ${dayNum}`;
  }
  const monthLabel = MONTH_ABBR_ES[monthIdx] ?? match[2];
  return `${match[3]} ${monthLabel}`;
}

/**
 * Shifts an ISO date (`YYYY-MM-DD`) by `deltaDays` days in UTC without DST drift.
 *
 * @param isoDate Base ISO date string.
 * @param deltaDays Signed day offset.
 * @returns Shifted ISO date string.
 */
export function shiftIsoDateDays(isoDate: string, deltaDays: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    return isoDate;
  }
  const dt = new Date(
    Date.UTC(
      Number.parseInt(match[1], 10),
      Number.parseInt(match[2], 10) - 1,
      Number.parseInt(match[3], 10) + deltaDays,
    ),
  );
  return formatUtcIsoDate(dt);
}

/**
 * Generic date-range slicer preserving at least 2 trailing points for zoomable time series.
 *
 * @param points Chronologically ordered array with `date` keys.
 * @param range Selected zoom window (`'7d'` | `'30d'` | `'all'`).
 * @returns Sliced copy matching the zoom window.
 */
export function sliceByDateRange<T extends { date: string }>(
  points: readonly T[],
  range: HistoryRange,
): T[] {
  if (range === 'all' || points.length <= 2) {
    return [...points];
  }
  const daysBack = range === '7d' ? 7 : 30;
  const lastDate = points[points.length - 1].date;
  const cutoff = shiftIsoDateDays(lastDate, -daysBack);
  const sliced = points.filter((p) => p.date >= cutoff);
  if (sliced.length >= 2) {
    return sliced;
  }
  return points.slice(-Math.min(points.length, daysBack));
}

/**
 * Slices a card {@link PricePoint} series by date range.
 *
 * @param points Card historical prices.
 * @param range Target range window.
 * @returns Filtered array of price points.
 */
export function slicePriceHistory(
  points: readonly PricePoint[],
  range: HistoryRange,
): PricePoint[] {
  return sliceByDateRange(points, range);
}

/** Aggregated store history series together with coverage and all-time peaks. */
export interface PortfolioHistoryResult {
  points: PortfolioHistoryPoint[];
  coveredCount: number;
  peakValueEur: number;
  peakProfitEur: number;
}

/**
 * Builds the daily portfolio valuation curve for a single store using carry-forward pricing
 * and respecting each card's `purchaseDate`.
 *
 * @param cards Portfolio holdings.
 * @param allHistoryByCard Map of card histories by store.
 * @param source Store valuation source.
 * @returns Time series points, native coverage count, and peak records.
 */
export function buildPortfolioHistorySeries(
  cards: readonly CardHolding[],
  allHistoryByCard: Record<string, CardPriceHistoryMap>,
  source: PriceSource,
): PortfolioHistoryResult {
  if (cards.length === 0) {
    return {
      points: [],
      coveredCount: 0,
      peakValueEur: 0,
      peakProfitEur: 0,
    };
  }

  const allDatesSet = new Set<string>();
  let coveredCount = 0;

  interface CardSeriesState {
    card: CardHolding;
    qty: number;
    totalCardCost: number;
    pts: PricePoint[];
    ptr: number;
  }

  const states: CardSeriesState[] = cards.map((card) => {
    const qty = Math.max(1, card.quantity || 1);
    const totalCardCost = card.unitCostEur * qty + card.shippingEur;
    const storePts = allHistoryByCard[card.id]?.[source];
    const hasNative = Boolean(storePts && storePts.length > 0);
    if (hasNative || source === 'Cardmarket') {
      coveredCount += 1;
    }

    if (storePts && storePts.length > 0) {
      for (const pt of storePts) {
        allDatesSet.add(pt.date);
      }
    }

    const pts: PricePoint[] =
      storePts && storePts.length > 0
        ? storePts
        : [
            {
              date: card.purchaseDate || todayIsoDate(),
              price: round2(card.marketPriceEur),
            },
          ];

    return { card, qty, totalCardCost, pts, ptr: 0 };
  });

  if (allDatesSet.size === 0) {
    allDatesSet.add(todayIsoDate());
  }

  const sortedDates = Array.from(allDatesSet).sort((a, b) =>
    a.localeCompare(b),
  );

  const points: PortfolioHistoryPoint[] = [];
  let peakValueEur = 0;
  let peakProfitEur = Number.NEGATIVE_INFINITY;

  for (const date of sortedDates) {
    let costSum = 0;
    let marketSum = 0;

    for (const st of states) {
      while (
        st.ptr + 1 < st.pts.length &&
        st.pts[st.ptr + 1].date <= date
      ) {
        st.ptr += 1;
      }

      if (st.card.purchaseDate && st.card.purchaseDate > date) {
        continue;
      }

      costSum += st.totalCardCost;
      const unitPrice =
        st.pts[st.ptr].date <= date ? st.pts[st.ptr].price : st.pts[0].price;
      marketSum += unitPrice * st.qty;
    }

    const cost = round2(costSum);
    const market = round2(marketSum);
    const profit = round2(market - cost);
    const roiPct = cost > 0 ? round2((profit / cost) * 100) : null;

    if (market > peakValueEur) {
      peakValueEur = market;
    }
    if (profit > peakProfitEur) {
      peakProfitEur = profit;
    }

    points.push({ date, cost, market, profit, roiPct });
  }

  return {
    points,
    coveredCount,
    peakValueEur: round2(peakValueEur),
    peakProfitEur: Number.isFinite(peakProfitEur) ? round2(peakProfitEur) : 0,
  };
}

/**
 * Builds daily portfolio valuation series for all 5 valuation sources.
 *
 * @param cards Inventory holdings.
 * @param allHistoryByCard Store price history dictionary.
 * @returns Record mapping each {@link PriceSource} to its {@link PortfolioHistoryResult}.
 */
export function buildAllStoreHistories(
  cards: readonly CardHolding[],
  allHistoryByCard: Record<string, CardPriceHistoryMap>,
): Record<PriceSource, PortfolioHistoryResult> {
  return {
    Cardmarket: buildPortfolioHistorySeries(
      cards,
      allHistoryByCard,
      'Cardmarket',
    ),
    Scryfall: buildPortfolioHistorySeries(cards, allHistoryByCard, 'Scryfall'),
    TCGPlayer: buildPortfolioHistorySeries(
      cards,
      allHistoryByCard,
      'TCGPlayer',
    ),
    CardKingdom: buildPortfolioHistorySeries(
      cards,
      allHistoryByCard,
      'CardKingdom',
    ),
    ManaPool: buildPortfolioHistorySeries(cards, allHistoryByCard, 'ManaPool'),
  };
}

/**
 * Slices a {@link PortfolioHistoryPoint} series by date range.
 *
 * @param points Daily portfolio points.
 * @param range Target zoom window.
 * @returns Filtered copy of portfolio history points.
 */
export function slicePortfolioHistory(
  points: readonly PortfolioHistoryPoint[],
  range: HistoryRange,
): PortfolioHistoryPoint[] {
  return sliceByDateRange(points, range);
}

/** Single histogram bucket matching the 8 ROI brackets in Excel. */
export interface RoiBucket {
  key: string;
  label: string;
  compactLabel: string;
  count: number;
  isNegative: boolean;
}

const ROI_BUCKET_DEFS: readonly {
  key: string;
  label: string;
  compactLabel: string;
  isNegative: boolean;
  matches: (roi: number) => boolean;
}[] = [
  {
    key: 'lt-100',
    label: '< -100%',
    compactLabel: '<-100%',
    isNegative: true,
    matches: (roi) => roi < -100,
  },
  {
    key: '-100..-50',
    label: '-100% .. -50%',
    compactLabel: '-100\n-50%',
    isNegative: true,
    matches: (roi) => roi >= -100 && roi < -50,
  },
  {
    key: '-50..-25',
    label: '-50% .. -25%',
    compactLabel: '-50\n-25%',
    isNegative: true,
    matches: (roi) => roi >= -50 && roi < -25,
  },
  {
    key: '-25..0',
    label: '-25% .. 0%',
    compactLabel: '-25\n0%',
    isNegative: true,
    matches: (roi) => roi >= -25 && roi < 0,
  },
  {
    key: '0..25',
    label: '0% .. +25%',
    compactLabel: '0\n+25%',
    isNegative: false,
    matches: (roi) => roi >= 0 && roi < 25,
  },
  {
    key: '25..50',
    label: '+25% .. +50%',
    compactLabel: '+25\n+50%',
    isNegative: false,
    matches: (roi) => roi >= 25 && roi < 50,
  },
  {
    key: '50..100',
    label: '+50% .. +100%',
    compactLabel: '+50\n100%',
    isNegative: false,
    matches: (roi) => roi >= 50 && roi <= 100,
  },
  {
    key: 'gt100',
    label: '> +100%',
    compactLabel: '>100%',
    isNegative: false,
    matches: (roi) => roi > 100,
  },
];

/**
 * Classifies paid holdings across the 8 ROI histogram brackets and tracks zero-cost holdings separately.
 *
 * @param items Holdings with computed {@link CardMetrics}.
 * @returns 8 ordered buckets, zero-cost count, and max count for scaling.
 */
export function computeRoiBuckets(items: readonly CardWithMetrics[]): {
  buckets: RoiBucket[];
  zeroCostCount: number;
  maxCount: number;
} {
  const counts = new Array<number>(ROI_BUCKET_DEFS.length).fill(0);
  let zeroCostCount = 0;

  for (const item of items) {
    const roi = item.metrics.roiPct;
    if (roi === null) {
      zeroCostCount += 1;
      continue;
    }
    const bucketIdx = ROI_BUCKET_DEFS.findIndex((def) => def.matches(roi));
    if (bucketIdx >= 0) {
      counts[bucketIdx] += 1;
    }
  }

  const buckets: RoiBucket[] = ROI_BUCKET_DEFS.map((def, idx) => ({
    key: def.key,
    label: def.label,
    compactLabel: def.compactLabel,
    count: counts[idx],
    isNegative: def.isNegative,
  }));

  return {
    buckets,
    zeroCostCount,
    maxCount: Math.max(1, ...counts),
  };
}

function parseIsoDateUtc(isoDate: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }
  return new Date(
    Date.UTC(
      Number.parseInt(match[1], 10),
      Number.parseInt(match[2], 10) - 1,
      Number.parseInt(match[3], 10),
    ),
  );
}

function formatUtcIsoDate(dt: Date): string {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Binary search (`O(log N)`) returning the latest point on or before `targetIso`. */
function findLatestPointOnOrBefore(
  dailyPoints: readonly PortfolioHistoryPoint[],
  targetIso: string,
): PortfolioHistoryPoint | null {
  let lo = 0;
  let hi = dailyPoints.length - 1;
  let result: PortfolioHistoryPoint | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (dailyPoints[mid].date <= targetIso) {
      result = dailyPoints[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

function computeBackfilledProfitOnDate(
  cards: readonly CardHolding[],
  allHistoryByCard: Record<string, CardPriceHistoryMap>,
  source: PriceSource,
  targetIso: string,
): number {
  let sum = 0;
  for (const card of cards) {
    if (card.purchaseDate && card.purchaseDate > targetIso) continue;
    const { priceEur } = computeSourceUnitPriceEur(
      card,
      allHistoryByCard[card.id],
      source,
    );
    sum += computeCardMetrics(card, priceEur).profit;
  }
  return round2(sum);
}

/** Resolves net profit on `targetIso` from daily history or backfills from owned holdings. */
function resolveProfitOnDate(
  cards: readonly CardHolding[],
  allHistoryByCard: Record<string, CardPriceHistoryMap>,
  source: PriceSource,
  dailyPoints: readonly PortfolioHistoryPoint[],
  firstDailyDate: string | null,
  targetIso: string,
): number {
  if (firstDailyDate !== null && targetIso >= firstDailyDate) {
    const exact = findLatestPointOnOrBefore(dailyPoints, targetIso);
    if (exact !== null) {
      return exact.profit;
    }
  }
  return computeBackfilledProfitOnDate(
    cards,
    allHistoryByCard,
    source,
    targetIso,
  );
}

/**
 * Computes net profit snapshots across the trailing `weeksCount` Sundays (default 20),
 * backfilling dates prior to scraped daily history using active card holdings.
 *
 * @param cards Portfolio holdings.
 * @param allHistoryByCard Store price histories.
 * @param source Selected valuation store.
 * @param weeksCount Number of trailing Sundays to emit.
 * @param precomputedDailyPoints Optional memoized daily points for `source`.
 * @returns Ordered weekly profit series (`dd/mm`).
 */
export function buildWeeklyProfitSeries(
  cards: readonly CardHolding[],
  allHistoryByCard: Record<string, CardPriceHistoryMap>,
  source: PriceSource,
  weeksCount = 20,
  precomputedDailyPoints?: readonly PortfolioHistoryPoint[],
): PeriodicProfitPoint[] {
  if (cards.length === 0 || weeksCount <= 0) {
    return [];
  }

  const dailyPoints =
    precomputedDailyPoints ??
    buildPortfolioHistorySeries(cards, allHistoryByCard, source).points;
  const maxDate =
    dailyPoints.length > 0
      ? dailyPoints[dailyPoints.length - 1].date
      : todayIsoDate();
  const firstDailyDate = dailyPoints.length > 0 ? dailyPoints[0].date : null;
  const lastSundayIso = shiftIsoDateDays(
    maxDate,
    -parseIsoDateUtc(maxDate).getUTCDay(),
  );

  const result: PeriodicProfitPoint[] = [];
  for (let i = weeksCount - 1; i >= 0; i--) {
    const sunIso = shiftIsoDateDays(lastSundayIso, -i * 7);
    const [, mm, dd] = sunIso.split('-');
    result.push({
      key: sunIso,
      label: `${dd}/${mm}`,
      profitEur: resolveProfitOnDate(
        cards,
        allHistoryByCard,
        source,
        dailyPoints,
        firstDailyDate,
        sunIso,
      ),
    });
  }

  return result;
}

/**
 * Computes net profit snapshots at each of the trailing `monthsCount` month-end dates (default 20),
 * localized cleanly in Spanish or English (`Abr 25` / `Apr 25`).
 *
 * @param cards Portfolio holdings.
 * @param allHistoryByCard Store price histories.
 * @param source Selected valuation store.
 * @param language Language for month abbreviations.
 * @param monthsCount Number of trailing months.
 * @param precomputedDailyPoints Optional memoized daily points for `source`.
 * @returns Ordered monthly profit series.
 */
export function buildMonthlyProfitSeries(
  cards: readonly CardHolding[],
  allHistoryByCard: Record<string, CardPriceHistoryMap>,
  source: PriceSource,
  language: AppLanguage = 'es',
  monthsCount = 20,
  precomputedDailyPoints?: readonly PortfolioHistoryPoint[],
): PeriodicProfitPoint[] {
  if (cards.length === 0 || monthsCount <= 0) {
    return [];
  }

  const dailyPoints =
    precomputedDailyPoints ??
    buildPortfolioHistorySeries(cards, allHistoryByCard, source).points;
  const maxDate =
    dailyPoints.length > 0
      ? dailyPoints[dailyPoints.length - 1].date
      : todayIsoDate();
  const firstDailyDate = dailyPoints.length > 0 ? dailyPoints[0].date : null;

  const maxDt = parseIsoDateUtc(maxDate);
  const maxYear = maxDt.getUTCFullYear();
  const maxMonth0 = maxDt.getUTCMonth();

  const result: PeriodicProfitPoint[] = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    const monthEndDt = new Date(Date.UTC(maxYear, maxMonth0 - i + 1, 0));
    const endYear = monthEndDt.getUTCFullYear();
    const endMonth0 = monthEndDt.getUTCMonth();
    const monthEndIso = formatUtcIsoDate(monthEndDt);
    const targetIso = monthEndIso > maxDate ? maxDate : monthEndIso;

    const monthName =
      language === 'en'
        ? (MONTH_ABBR_EN[endMonth0] ?? '')
        : (MONTH_TITLE_ES[endMonth0] ?? '');

    result.push({
      key: `${endYear}-${String(endMonth0 + 1).padStart(2, '0')}`,
      label: `${monthName} ${String(endYear).slice(-2)}`,
      profitEur: resolveProfitOnDate(
        cards,
        allHistoryByCard,
        source,
        dailyPoints,
        firstDailyDate,
        targetIso,
      ),
    });
  }

  return result;
}
