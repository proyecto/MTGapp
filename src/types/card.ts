export const CARD_CONDITIONS = ['NM', 'EX', 'GD', 'LP', 'PL', 'PO'] as const;

export type CardCondition = (typeof CARD_CONDITIONS)[number];

export const CONDITION_NAMES: Record<CardCondition, string> = {
  NM: 'Near Mint',
  EX: 'Excellent',
  GD: 'Good',
  LP: 'Light Played',
  PL: 'Played',
  PO: 'Poor',
};

export const CARD_LANGUAGES = ['en', 'sp', 'it', 'fr', 'de', 'jp'] as const;

export const PRICE_SOURCES = [
  'Cardmarket',
  'Scryfall',
  'TCGPlayer',
  'CardKingdom',
  'ManaPool',
] as const;

export type PriceSource = (typeof PRICE_SOURCES)[number];

export interface PricePoint {
  date: string;
  price: number;
}

export type CardPriceHistoryMap = Partial<Record<PriceSource, PricePoint[]>>;

export type HistoryRange = '7d' | '30d' | 'all';

export type AppLanguage = 'es' | 'en';

export type ThemeId = 'light' | 'dark';

export type CurrencyCode = 'EUR' | 'USD';

export interface AppPreferences {
  language: AppLanguage;
  themeId: ThemeId;
  currency: CurrencyCode;
  eurToUsdRate: number;
}

export interface PortfolioHistoryPoint {
  date: string;
  cost: number;
  market: number;
  profit: number;
  roiPct: number | null;
}

export interface PeriodicProfitPoint {
  key: string;
  label: string;
  profitEur: number;
}

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

export type NewCardInput = Omit<CardHolding, 'id' | 'createdAt'>;

export type UpdateCardInput = Partial<Omit<CardHolding, 'id' | 'createdAt'>>;

export interface CardMetrics {
  totalCost: number;
  totalMarket: number;
  profit: number;
  roiPct: number | null;
}

export interface PortfolioSummary {
  uniqueCount: number;
  totalCopies: number;
  totalCost: number;
  totalMarket: number;
  totalProfit: number;
  totalRoiPct: number | null;
}

export type CardFilter = 'all' | 'gain' | 'loss' | 'zeroCost';

export type CardSort = 'value' | 'profit' | 'loss' | 'roi' | 'name' | 'date';

export const SORT_OPTIONS: { value: CardSort; label: string; shortLabel: string }[] = [
  { value: 'value', label: 'Mayor valor total', shortLabel: 'Valor ↓' },
  { value: 'profit', label: 'Mayor ganancia (€)', shortLabel: 'Profit ↓' },
  { value: 'loss', label: 'Mayor pérdida (€)', shortLabel: 'Pérdida ↓' },
  { value: 'roi', label: 'Mayor rentabilidad (%)', shortLabel: 'ROI % ↓' },
  { value: 'name', label: 'Nombre (A–Z)', shortLabel: 'A–Z' },
  { value: 'date', label: 'Compra más reciente', shortLabel: 'Recientes' },
];

