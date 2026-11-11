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

export const DEFAULT_EUR_TO_USD_RATE = 1.08;

export type FormatContext = Pick<
  AppPreferences,
  'language' | 'currency' | 'eurToUsdRate'
>;

export function round2(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) || rounded === 0 ? 0 : rounded;
}

export function normalizeExchangeRate(raw: number): number {
  return Number.isFinite(raw) && raw > 0.01 && raw < 1000
    ? Math.round(raw * 10000) / 10000
    : DEFAULT_EUR_TO_USD_RATE;
}

export function convertFromEur(
  eurValue: number,
  currency: CurrencyCode,
  eurToUsdRate: number = DEFAULT_EUR_TO_USD_RATE,
): number {
  if (currency !== 'USD') {
    return round2(eurValue);
  }
  const factor = normalizeExchangeRate(eurToUsdRate);
  return round2(eurValue * factor);
}

export function getCardPrimaryName(
  card: Pick<CardHolding, 'nameEs' | 'nameEn'>,
  language: AppLanguage,
): string {
  if (language === 'en') {
    return card.nameEn.trim() || card.nameEs.trim();
  }
  return card.nameEs.trim() || card.nameEn.trim();
}

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

export function computeSourceUnitPriceEur(
  card: CardHolding,
  historyMap: CardPriceHistoryMap | undefined,
  source: PriceSource,
): { priceEur: number; hasNativePrice: boolean } {
  const pts = historyMap?.[source];
  if (pts && pts.length > 0) {
    const latest = pts[pts.length - 1].price;
    if (source === 'Cardmarket') {
      // Keep portfolio in sync if the user edited card.marketPriceEur manually
      return { priceEur: round2(card.marketPriceEur), hasNativePrice: true };
    }
    return { priceEur: round2(latest), hasNativePrice: true };
  }
  return {
    priceEur: round2(card.marketPriceEur),
    hasNativePrice: source === 'Cardmarket',
  };
}

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
  const converted = convertFromEur(eurValue, prefs.currency, prefs.eurToUsdRate);
  const normalized = round2(converted);
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
  const symbol = prefs.currency === 'USD' ? '$' : '€';

  return isEn ? `${sign}${symbol}${numStr}` : `${sign}${numStr} ${symbol}`;
}

export function formatMoney(eurValue: number, prefs: FormatContext): string {
  return formatAmountInternal(eurValue, prefs, false);
}

export function formatSignedMoney(
  eurValue: number,
  prefs: FormatContext,
): string {
  return formatAmountInternal(eurValue, prefs, true);
}

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

export function parseDecimalInput(raw: string, fallback = 0): number {
  const trimmed = raw.trim();
  if (!trimmed) {
    return fallback;
  }
  const cleaned = trimmed.replace(/\s+/g, '').replace(',', '.');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function parseIntInput(raw: string, fallback = 1): number {
  const parsed = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
}

export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export interface CardWithMetrics {
  card: CardHolding;
  metrics: CardMetrics;
}

export function filterAndSortCards(
  cards: readonly CardHolding[],
  query: string,
  filter: CardFilter,
  sort: CardSort,
  language: AppLanguage = 'es',
): CardWithMetrics[] {
  const normalizedQuery = normalizeSearchText(query);
  const items: CardWithMetrics[] = [];

  for (const card of cards) {
    const metrics = computeCardMetrics(card);

    if (filter === 'gain' && metrics.profit <= 0) continue;
    if (filter === 'loss' && metrics.profit >= 0) continue;
    if (filter === 'zeroCost' && metrics.totalCost > 0) continue;

    if (normalizedQuery) {
      const haystack = normalizeSearchText(
        `${card.nameEs} ${card.nameEn} ${card.setCode} ${card.setName} ${card.collectorNumber} ${card.deck ?? ''} ${card.id}`,
      );
      if (!haystack.includes(normalizedQuery)) continue;
    }

    items.push({ card, metrics });
  }

  items.sort((a, b) => {
    switch (sort) {
      case 'value':
        return (
          b.metrics.totalMarket - a.metrics.totalMarket ||
          b.metrics.profit - a.metrics.profit ||
          getCardPrimaryName(a.card, language).localeCompare(
            getCardPrimaryName(b.card, language),
            language,
          )
        );
      case 'profit':
        return (
          b.metrics.profit - a.metrics.profit ||
          b.metrics.totalMarket - a.metrics.totalMarket
        );
      case 'loss':
        return (
          a.metrics.profit - b.metrics.profit ||
          b.metrics.totalCost - a.metrics.totalCost
        );
      case 'roi': {
        const aRoi = a.metrics.roiPct;
        const bRoi = b.metrics.roiPct;
        if (aRoi === null && bRoi === null) {
          return b.metrics.totalMarket - a.metrics.totalMarket;
        }
        if (aRoi === null) return 1;
        if (bRoi === null) return -1;
        return bRoi - aRoi || b.metrics.profit - a.metrics.profit;
      }
      case 'name':
        return getCardPrimaryName(a.card, language).localeCompare(
          getCardPrimaryName(b.card, language),
          language,
        );
      case 'date': {
        const dateCmp = b.card.purchaseDate.localeCompare(a.card.purchaseDate);
        if (dateCmp !== 0) return dateCmp;
        return (b.card.createdAt ?? 0) - (a.card.createdAt ?? 0);
      }
    }
  });

  return items;
}

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

export function shiftIsoDateDays(isoDate: string, deltaDays: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    return isoDate;
  }
  const y = Number.parseInt(match[1], 10);
  const m = Number.parseInt(match[2], 10) - 1;
  const d = Number.parseInt(match[3], 10);
  const dt = new Date(Date.UTC(y, m, d + deltaDays));
  const outY = dt.getUTCFullYear();
  const outM = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const outD = String(dt.getUTCDate()).padStart(2, '0');
  return `${outY}-${outM}-${outD}`;
}

export function slicePriceHistory(
  points: readonly PricePoint[],
  range: HistoryRange,
): PricePoint[] {
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

export interface PortfolioHistoryResult {
  points: PortfolioHistoryPoint[];
  coveredCount: number;
  peakValueEur: number;
  peakProfitEur: number;
}

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
        ? [...storePts]
        : [
            {
              date: card.purchaseDate || todayIsoDate(),
              price: round2(card.marketPriceEur),
            },
          ];

    return {
      card,
      qty,
      totalCardCost,
      pts,
      ptr: 0,
    };
  });

  if (allDatesSet.size === 0) {
    allDatesSet.add(todayIsoDate());
  }

  const sortedDates = Array.from(allDatesSet).sort((a, b) =>
    a.localeCompare(b),
  );

  if (sortedDates.length === 0) {
    return {
      points: [],
      coveredCount,
      peakValueEur: 0,
      peakProfitEur: 0,
    };
  }

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

      const ownedOnDate =
        !st.card.purchaseDate || st.card.purchaseDate <= date;
      if (!ownedOnDate) {
        continue;
      }

      costSum += st.totalCardCost;
      // Carry-forward if point exists on/before date, otherwise use earliest point
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
    Scryfall: buildPortfolioHistorySeries(
      cards,
      allHistoryByCard,
      'Scryfall',
    ),
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
    ManaPool: buildPortfolioHistorySeries(
      cards,
      allHistoryByCard,
      'ManaPool',
    ),
  };
}

export function slicePortfolioHistory(
  points: readonly PortfolioHistoryPoint[],
  range: HistoryRange,
): PortfolioHistoryPoint[] {
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

export interface RoiBucket {
  key: string;
  label: string;
  compactLabel: string;
  count: number;
  isNegative: boolean;
}

export function computeRoiBuckets(items: readonly CardWithMetrics[]): {
  buckets: RoiBucket[];
  zeroCostCount: number;
  maxCount: number;
} {
  let cLt100 = 0;
  let c100to50 = 0;
  let c50to25 = 0;
  let c25to0 = 0;
  let c0to25 = 0;
  let c25to50 = 0;
  let c50to100 = 0;
  let cGt100 = 0;
  let zeroCostCount = 0;

  for (const item of items) {
    const roi = item.metrics.roiPct;
    if (roi === null) {
      zeroCostCount += 1;
      continue;
    }
    if (roi < -100) cLt100 += 1;
    else if (roi < -50) c100to50 += 1;
    else if (roi < -25) c50to25 += 1;
    else if (roi < 0) c25to0 += 1;
    else if (roi < 25) c0to25 += 1;
    else if (roi < 50) c25to50 += 1;
    else if (roi <= 100) c50to100 += 1;
    else cGt100 += 1;
  }

  const buckets: RoiBucket[] = [
    {
      key: 'lt-100',
      label: '< -100%',
      compactLabel: '<-100%',
      count: cLt100,
      isNegative: true,
    },
    {
      key: '-100..-50',
      label: '-100% .. -50%',
      compactLabel: '-100\n-50%',
      count: c100to50,
      isNegative: true,
    },
    {
      key: '-50..-25',
      label: '-50% .. -25%',
      compactLabel: '-50\n-25%',
      count: c50to25,
      isNegative: true,
    },
    {
      key: '-25..0',
      label: '-25% .. 0%',
      compactLabel: '-25\n0%',
      count: c25to0,
      isNegative: true,
    },
    {
      key: '0..25',
      label: '0% .. +25%',
      compactLabel: '0\n+25%',
      count: c0to25,
      isNegative: false,
    },
    {
      key: '25..50',
      label: '+25% .. +50%',
      compactLabel: '+25\n+50%',
      count: c25to50,
      isNegative: false,
    },
    {
      key: '50..100',
      label: '+50% .. +100%',
      compactLabel: '+50\n100%',
      count: c50to100,
      isNegative: false,
    },
    {
      key: 'gt100',
      label: '> +100%',
      compactLabel: '>100%',
      count: cGt100,
      isNegative: false,
    },
  ];

  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  return { buckets, zeroCostCount, maxCount };
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

function lookupDailyProfitOnOrBefore(
  dailyPoints: readonly PortfolioHistoryPoint[],
  targetIso: string,
): number | null {
  if (dailyPoints.length === 0) return null;
  let match: PortfolioHistoryPoint | null = null;
  for (const pt of dailyPoints) {
    if (pt.date <= targetIso) {
      match = pt;
    } else {
      break;
    }
  }
  return match ? match.profit : null;
}

function computeBackfilledProfitOnDate(
  cards: readonly CardHolding[],
  allHistoryByCard: Record<string, CardPriceHistoryMap>,
  source: PriceSource,
  targetIso: string,
): number {
  let sum = 0;
  for (const card of cards) {
    const owned = !card.purchaseDate || card.purchaseDate <= targetIso;
    if (!owned) continue;
    const { priceEur } = computeSourceUnitPriceEur(
      card,
      allHistoryByCard[card.id],
      source,
    );
    sum += computeCardMetrics(card, priceEur).profit;
  }
  return round2(sum);
}

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

  const maxDt = parseIsoDateUtc(maxDate);
  // Step back to Sunday of maxDate's week (matches Excel maxD - WEEKDAY(maxD, 1) + 1)
  const lastSundayIso = shiftIsoDateDays(maxDate, -maxDt.getUTCDay());

  const result: PeriodicProfitPoint[] = [];
  for (let i = weeksCount - 1; i >= 0; i--) {
    const sunIso = shiftIsoDateDays(lastSundayIso, -i * 7);
    const [, mm, dd] = sunIso.split('-');
    let profitEur = 0;
    if (firstDailyDate !== null && sunIso >= firstDailyDate) {
      const exact = lookupDailyProfitOnOrBefore(dailyPoints, sunIso);
      profitEur =
        exact !== null
          ? exact
          : computeBackfilledProfitOnDate(
              cards,
              allHistoryByCard,
              source,
              sunIso,
            );
    } else {
      profitEur = computeBackfilledProfitOnDate(
        cards,
        allHistoryByCard,
        source,
        sunIso,
      );
    }
    result.push({
      key: sunIso,
      label: `${dd}/${mm}`,
      profitEur,
    });
  }

  return result;
}

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

    let profitEur = 0;
    if (firstDailyDate !== null && targetIso >= firstDailyDate) {
      const exact = lookupDailyProfitOnOrBefore(dailyPoints, targetIso);
      profitEur =
        exact !== null
          ? exact
          : computeBackfilledProfitOnDate(
              cards,
              allHistoryByCard,
              source,
              targetIso,
            );
    } else {
      profitEur = computeBackfilledProfitOnDate(
        cards,
        allHistoryByCard,
        source,
        targetIso,
      );
    }

    const monthName =
      language === 'en'
        ? (MONTH_ABBR_EN[endMonth0] ?? '')
        : (MONTH_TITLE_ES[endMonth0] ?? '');
    const shortYear = String(endYear).slice(-2);

    result.push({
      key: `${endYear}-${String(endMonth0 + 1).padStart(2, '0')}`,
      label: `${monthName} ${shortYear}`,
      profitEur,
    });
  }

  return result;
}

export const STORE_CHART_COLORS: Record<PriceSource, string> = {
  Cardmarket: '#2563EB',
  Scryfall: '#0D9488',
  TCGPlayer: '#D97706',
  CardKingdom: '#7C3AED',
  ManaPool: '#DB2777',
};
