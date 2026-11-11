/**
 * @module types/card
 * Domain types, enumerations, and constants for MTG Vault portfolio tracking.
 */

/** Supported physical condition grades (Cardmarket standard). */
export const CARD_CONDITIONS = ['NM', 'EX', 'GD', 'LP', 'PL', 'PO'] as const;

/** Union type of valid card physical conditions. */
export type CardCondition = (typeof CARD_CONDITIONS)[number];

/** Human-readable labels for each {@link CardCondition}. */
export const CONDITION_NAMES: Record<CardCondition, string> = {
  NM: 'Near Mint',
  EX: 'Excellent',
  GD: 'Good',
  LP: 'Light Played',
  PL: 'Played',
  PO: 'Poor',
};

/** Supported card printing languages tracked per holding. */
export const CARD_LANGUAGES = ['en', 'sp', 'it', 'fr', 'de', 'jp'] as const;

/** Supported valuation markets / price data providers. */
export const PRICE_SOURCES = [
  'Cardmarket',
  'Scryfall',
  'TCGPlayer',
  'CardKingdom',
  'ManaPool',
] as const;

/** Union type of market valuation sources. */
export type PriceSource = (typeof PRICE_SOURCES)[number];

/** Single historical market valuation snapshot in base EUR. */
export interface PricePoint {
  /** ISO-8601 calendar date (`YYYY-MM-DD`). */
  date: string;
  /** Unit price in EUR. */
  price: number;
}

/** Per-store time series map for a single card. */
export type CardPriceHistoryMap = Partial<Record<PriceSource, PricePoint[]>>;

/** Available interactive zoom windows for time-series charts. */
export type HistoryRange = '7d' | '30d' | 'all';

/** Supported UI and card-name display languages. */
export type AppLanguage = 'es' | 'en';

/** Identifier for registered visual themes in `THEME_REGISTRY`. */
export type ThemeId = 'light' | 'dark';

/** Supported display currencies (amounts are persisted internally in EUR). */
export type CurrencyCode = 'EUR' | 'USD';

/** User-configurable application preferences stored locally in SQLite. */
export interface AppPreferences {
  /** Active language for UI strings and localized card names. */
  language: AppLanguage;
  /** Active theme identifier. */
  themeId: ThemeId;
  /** Display currency code. */
  currency: CurrencyCode;
  /** Conversion multiplier applied when `currency === 'USD'`. */
  eurToUsdRate: number;
}

/** Daily aggregated portfolio valuation snapshot in base EUR. */
export interface PortfolioHistoryPoint {
  date: string;
  cost: number;
  market: number;
  profit: number;
  roiPct: number | null;
}

/** Aggregated portfolio net profit at a weekly or monthly close. */
export interface PeriodicProfitPoint {
  key: string;
  label: string;
  profitEur: number;
}

/** Weekly reference market benchmarks sourced from the spreadsheet workbook. */
export interface MarketIndicesData {
  weeks: string[];
  collectibles: {
    dualLands10: number[];
    powerNine: number[];
    rlStaples: number[];
  };
  activePlay: {
    commanderBlueChips: number[];
    fetchlands10: number[];
  };
  compositeBase100: number[];
}

/** Primary domain entity representing a card inventory entry. */
export interface CardHolding {
  id: string;
  collectorNumber: string;
  orderId: string | null;
  purchaseDate: string;
  nameEs: string;
  nameEn: string;
  setCode: string;
  language: string;
  setName: string;
  deck: string | null;
  condition: CardCondition;
  shippingEur: number;
  quantity: number;
  unitCostEur: number;
  marketPriceEur: number;
  createdAt?: number;
}

/** Input payload for inserting a new {@link CardHolding}. */
export type NewCardInput = Omit<CardHolding, 'id' | 'createdAt'>;

/** Partial patch payload for updating an existing {@link CardHolding}. */
export type UpdateCardInput = Partial<Omit<CardHolding, 'id' | 'createdAt'>>;

/** Derived financial totals for a single holding in base EUR. */
export interface CardMetrics {
  totalCost: number;
  totalMarket: number;
  profit: number;
  roiPct: number | null;
}

/** Aggregated financial metrics across an entire portfolio. */
export interface PortfolioSummary {
  uniqueCount: number;
  totalCopies: number;
  totalCost: number;
  totalMarket: number;
  totalProfit: number;
  totalRoiPct: number | null;
}

/** Collection list profit/cost filter options. */
export type CardFilter = 'all' | 'gain' | 'loss' | 'zeroCost';

/** Collection list sort criteria keys. */
export type CardSort = 'value' | 'profit' | 'loss' | 'roi' | 'name' | 'date';
