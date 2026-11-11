/**
 * @module db/cardsRepository
 * Local SQLite persistence layer using a Singleton connection manager (`DatabaseManager`),
 * a record mapper (`CardRecordAdapter`), and exported CRUD repository helpers.
 */

import * as SQLite from 'expo-sqlite';
import seedCardsJson from '../data/seedCards.json';
import seedPriceHistoryJson from '../data/seedPriceHistory.json';
import { THEME_REGISTRY } from '../theme/tokens';
import {
  CARD_CONDITIONS,
  PRICE_SOURCES,
  type AppLanguage,
  type AppPreferences,
  type CardCondition,
  type CardHolding,
  type CardPriceHistoryMap,
  type CurrencyCode,
  type NewCardInput,
  type PricePoint,
  type PriceSource,
  type ThemeId,
  type UpdateCardInput,
} from '../types/card';
import {
  DEFAULT_EUR_TO_USD_RATE,
  normalizeExchangeRate,
  round2,
  todayIsoDate,
} from '../utils/cardMath';

const DB_NAME = 'mtg_vault.db';
const SEED_META_KEY = 'seed_v1_applied';
const SEED_HISTORY_META_KEY = 'seed_history_v1_applied';
const PREF_LANGUAGE_KEY = 'pref_language';
const PREF_THEME_KEY = 'pref_theme_id';
const PREF_CURRENCY_KEY = 'pref_currency';
const PREF_FX_RATE_KEY = 'pref_eur_usd_rate';

interface SeedPriceStoreBlock {
  dates: string[];
  cards: Record<string, (number | null)[]>;
}

interface SeedPriceHistoryPayload {
  stores: Partial<Record<PriceSource, SeedPriceStoreBlock>>;
}

interface CardDbRow {
  id: string;
  collector_number: string;
  order_id: string | null;
  purchase_date: string;
  name_es: string;
  name_en: string;
  set_code: string;
  language: string;
  set_name: string;
  deck: string | null;
  condition: string;
  shipping_eur: number;
  quantity: number;
  unit_cost_eur: number;
  market_price_eur: number;
  created_at: number;
}

const SQL_INSERT_CARD = `INSERT INTO cards (
  id, collector_number, order_id, purchase_date,
  name_es, name_en, set_code, language, set_name,
  deck, condition, shipping_eur, quantity,
  unit_cost_eur, market_price_eur, created_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const SQL_UPSERT_META =
  'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)';

const VALID_PRICE_SOURCES = new Set<string>(PRICE_SOURCES);

/**
 * Adapter encapsulating mapping and sanitization between SQLite storage formats
 * and {@link CardHolding} / {@link PricePoint} domain types.
 */
const CardRecordAdapter = {
  normalizeCondition(raw: string): CardCondition {
    const upper = raw.trim().toUpperCase();
    return (CARD_CONDITIONS as readonly string[]).includes(upper)
      ? (upper as CardCondition)
      : 'EX';
  },

  normalizeOptionalText(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  },

  toDomain(row: CardDbRow): CardHolding {
    return {
      id: row.id,
      collectorNumber: row.collector_number ?? '',
      orderId: row.order_id ?? null,
      purchaseDate: row.purchase_date,
      nameEs: row.name_es,
      nameEn: row.name_en,
      setCode: row.set_code,
      language: row.language ?? 'en',
      setName: row.set_name ?? '',
      deck: row.deck ?? null,
      condition: CardRecordAdapter.normalizeCondition(row.condition ?? 'EX'),
      shippingEur: Number(row.shipping_eur ?? 0),
      quantity: Math.max(1, Number(row.quantity ?? 1)),
      unitCostEur: Number(row.unit_cost_eur ?? 0),
      marketPriceEur: Number(row.market_price_eur ?? 0),
      createdAt: Number(row.created_at ?? 0),
    };
  },

  buildNewCard(
    id: string,
    input: NewCardInput,
    createdAt: number,
  ): CardHolding {
    const nameEs = input.nameEs.trim();
    const nameEn = (input.nameEn || nameEs).trim();
    return {
      id,
      collectorNumber: input.collectorNumber.trim(),
      orderId: CardRecordAdapter.normalizeOptionalText(input.orderId),
      purchaseDate: input.purchaseDate,
      nameEs,
      nameEn,
      setCode: input.setCode.trim().toUpperCase(),
      language: (input.language || 'en').trim().toLowerCase(),
      setName: input.setName.trim(),
      deck: CardRecordAdapter.normalizeOptionalText(input.deck),
      condition: CardRecordAdapter.normalizeCondition(input.condition),
      shippingEur: Math.max(0, input.shippingEur || 0),
      quantity: Math.max(1, Math.round(input.quantity || 1)),
      unitCostEur: Math.max(0, input.unitCostEur || 0),
      marketPriceEur: Math.max(0, input.marketPriceEur || 0),
      createdAt,
    };
  },

  mergePatch(current: CardHolding, patch: UpdateCardInput): CardHolding {
    const nameEs = (patch.nameEs ?? current.nameEs).trim();
    const nameEn = (patch.nameEn ?? current.nameEn).trim() || nameEs;
    return {
      ...current,
      ...patch,
      nameEs,
      nameEn,
      setCode: (patch.setCode ?? current.setCode).trim().toUpperCase(),
      setName: (patch.setName ?? current.setName).trim(),
      collectorNumber: (patch.collectorNumber ?? current.collectorNumber).trim(),
      language:
        (patch.language ?? current.language).trim().toLowerCase() || 'en',
      deck:
        patch.deck !== undefined
          ? CardRecordAdapter.normalizeOptionalText(patch.deck)
          : current.deck,
      orderId:
        patch.orderId !== undefined
          ? CardRecordAdapter.normalizeOptionalText(patch.orderId)
          : current.orderId,
      condition: CardRecordAdapter.normalizeCondition(
        patch.condition ?? current.condition,
      ),
      shippingEur: Math.max(0, patch.shippingEur ?? current.shippingEur),
      quantity: Math.max(1, Math.round(patch.quantity ?? current.quantity)),
      unitCostEur: Math.max(0, patch.unitCostEur ?? current.unitCostEur),
      marketPriceEur: Math.max(
        0,
        patch.marketPriceEur ?? current.marketPriceEur,
      ),
    };
  },

  toInsertParams(card: CardHolding): SQLite.SQLiteBindParams {
    return [
      card.id,
      card.collectorNumber,
      card.orderId,
      card.purchaseDate,
      card.nameEs,
      card.nameEn,
      card.setCode,
      card.language,
      card.setName,
      card.deck,
      card.condition,
      card.shippingEur,
      card.quantity,
      card.unitCostEur,
      card.marketPriceEur,
      card.createdAt ?? 0,
    ];
  },

  parsePointsJson(raw: string): PricePoint[] {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const points: PricePoint[] = [];
      for (const entry of parsed) {
        if (
          Array.isArray(entry) &&
          typeof entry[0] === 'string' &&
          typeof entry[1] === 'number' &&
          Number.isFinite(entry[1])
        ) {
          points.push({ date: entry[0], price: entry[1] });
        }
      }
      return points;
    } catch {
      return [];
    }
  },

  serializePoints(points: readonly PricePoint[]): string {
    return JSON.stringify(points.map((p) => [p.date, round2(p.price)]));
  },
};

/**
 * Thread-safe (async-deduplicated) Singleton owning the local SQLite database connection,
 * schema DDL creation, and one-time initial seed hydration.
 */
export class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

  private constructor() {}

  /**
   * Returns the global {@link DatabaseManager} singleton instance.
   *
   * @returns Shared manager instance.
   */
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Resolves the initialized SQLite database handle, initializing schema and seeds on first access.
   *
   * @returns Open SQLite database handle.
   */
  public async getConnection(): Promise<SQLite.SQLiteDatabase> {
    if (!this.initPromise) {
      this.initPromise = this.initialize().catch((err) => {
        this.initPromise = null;
        throw err;
      });
    }
    return this.initPromise;
  }

  private async initialize(): Promise<SQLite.SQLiteDatabase> {
    const db = await SQLite.openDatabaseAsync(DB_NAME);

    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY NOT NULL,
        collector_number TEXT NOT NULL DEFAULT '',
        order_id TEXT,
        purchase_date TEXT NOT NULL,
        name_es TEXT NOT NULL,
        name_en TEXT NOT NULL,
        set_code TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'en',
        set_name TEXT NOT NULL DEFAULT '',
        deck TEXT,
        condition TEXT NOT NULL DEFAULT 'EX',
        shipping_eur REAL NOT NULL DEFAULT 0,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_cost_eur REAL NOT NULL DEFAULT 0,
        market_price_eur REAL NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_cards_set_code ON cards(set_code);
      CREATE TABLE IF NOT EXISTS card_price_series (
        card_id TEXT NOT NULL,
        source TEXT NOT NULL,
        points_json TEXT NOT NULL,
        PRIMARY KEY (card_id, source)
      );
      CREATE INDEX IF NOT EXISTS idx_price_series_card ON card_price_series(card_id);
    `);

    await this.seedInventoryIfNeeded(db);
    await this.seedPriceHistoriesIfNeeded(db);

    return db;
  }

  private async seedInventoryIfNeeded(
    db: SQLite.SQLiteDatabase,
  ): Promise<void> {
    const meta = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_meta WHERE key = ?',
      [SEED_META_KEY],
    );
    if (meta) return;

    const existing = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM cards',
    );
    const seedList = seedCardsJson as CardHolding[];

    await db.withTransactionAsync(async () => {
      if ((existing?.count ?? 0) === 0 && seedList.length > 0) {
        for (let i = 0; i < seedList.length; i++) {
          const item = CardRecordAdapter.buildNewCard(
            seedList[i].id,
            seedList[i],
            i + 1,
          );
          await db.runAsync(
            SQL_INSERT_CARD,
            CardRecordAdapter.toInsertParams(item),
          );
        }
      }
      await db.runAsync(SQL_UPSERT_META, [SEED_META_KEY, '1']);
    });
  }

  private async seedPriceHistoriesIfNeeded(
    db: SQLite.SQLiteDatabase,
  ): Promise<void> {
    const historyMeta = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_meta WHERE key = ?',
      [SEED_HISTORY_META_KEY],
    );
    if (historyMeta) return;

    const existingCards = await db.getAllAsync<{ id: string }>(
      'SELECT id FROM cards',
    );
    const existingCardIds = new Set(existingCards.map((c) => c.id));
    const historyPayload = seedPriceHistoryJson as SeedPriceHistoryPayload;

    await db.withTransactionAsync(async () => {
      for (const source of PRICE_SOURCES) {
        const block = historyPayload.stores[source];
        if (!block) continue;

        const { dates, cards } = block;
        for (const [cardId, values] of Object.entries(cards)) {
          if (!existingCardIds.has(cardId)) continue;

          const compactPairs: [string, number][] = [];
          const len = Math.min(dates.length, values.length);
          for (let i = 0; i < len; i++) {
            const val = values[i];
            if (typeof val === 'number' && Number.isFinite(val)) {
              compactPairs.push([dates[i], val]);
            }
          }

          if (compactPairs.length > 0) {
            await db.runAsync(
              'INSERT OR IGNORE INTO card_price_series (card_id, source, points_json) VALUES (?, ?, ?)',
              [cardId, source, JSON.stringify(compactPairs)],
            );
          }
        }
      }

      await db.runAsync(SQL_UPSERT_META, [SEED_HISTORY_META_KEY, '1']);
    });
  }
}

async function generateNextCardId(
  db: SQLite.SQLiteDatabase,
): Promise<string> {
  const rows = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM cards WHERE id LIKE 'CARD-%'",
  );
  const existingIds = new Set<string>();
  let maxNum = 0;

  for (const row of rows) {
    existingIds.add(row.id);
    const match = /^CARD-(\d+)$/.exec(row.id);
    if (match) {
      const parsed = Number.parseInt(match[1], 10);
      if (parsed > maxNum) maxNum = parsed;
    }
  }

  let candidate = maxNum + 1;
  while (existingIds.has(`CARD-${String(candidate).padStart(5, '0')}`)) {
    candidate += 1;
  }
  return `CARD-${String(candidate).padStart(5, '0')}`;
}

async function upsertCardmarketPoint(
  db: SQLite.SQLiteDatabase,
  cardId: string,
  date: string,
  priceEur: number,
): Promise<void> {
  const existing = await db.getFirstAsync<{ points_json: string }>(
    'SELECT points_json FROM card_price_series WHERE card_id = ? AND source = ?',
    [cardId, 'Cardmarket'],
  );

  const points = existing
    ? CardRecordAdapter.parsePointsJson(existing.points_json)
    : [];
  const cleanPrice = round2(priceEur);
  const idx = points.findIndex((p) => p.date === date);
  if (idx >= 0) {
    points[idx] = { date, price: cleanPrice };
  } else {
    points.push({ date, price: cleanPrice });
    points.sort((a, b) => a.date.localeCompare(b.date));
  }

  await db.runAsync(
    'INSERT OR REPLACE INTO card_price_series (card_id, source, points_json) VALUES (?, ?, ?)',
    [cardId, 'Cardmarket', CardRecordAdapter.serializePoints(points)],
  );
}

/**
 * Fetches all card holdings sorted by total valuation descending.
 *
 * @returns Array of domain {@link CardHolding} records.
 */
export async function listCards(): Promise<CardHolding[]> {
  const db = await DatabaseManager.getInstance().getConnection();
  const rows = await db.getAllAsync<CardDbRow>(
    'SELECT * FROM cards ORDER BY market_price_eur * quantity DESC, id ASC',
  );
  return rows.map(CardRecordAdapter.toDomain);
}

/**
 * Fetches stored price time-series across all stores for a single card,
 * guaranteeing at least a synthetic Cardmarket point when no scraped series exists.
 *
 * @param card Target card holding.
 * @returns Per-store {@link CardPriceHistoryMap}.
 */
export async function getCardPriceHistory(
  card: CardHolding,
): Promise<CardPriceHistoryMap> {
  const db = await DatabaseManager.getInstance().getConnection();
  const rows = await db.getAllAsync<{ source: string; points_json: string }>(
    'SELECT source, points_json FROM card_price_series WHERE card_id = ?',
    [card.id],
  );

  const result: CardPriceHistoryMap = {};
  for (const row of rows) {
    if (VALID_PRICE_SOURCES.has(row.source)) {
      const pts = CardRecordAdapter.parsePointsJson(row.points_json);
      if (pts.length > 0) {
        result[row.source as PriceSource] = pts;
      }
    }
  }

  if (!result.Cardmarket || result.Cardmarket.length === 0) {
    result.Cardmarket = [
      {
        date: card.purchaseDate || todayIsoDate(),
        price: round2(card.marketPriceEur),
      },
    ];
  }

  return result;
}

/**
 * Inserts a new card holding and seeds its initial Cardmarket price point atomically.
 *
 * @param input Unvalidated card form payload.
 * @returns Persisted {@link CardHolding} with generated `id` (`CARD-xxxxx`).
 */
export async function insertCard(input: NewCardInput): Promise<CardHolding> {
  const db = await DatabaseManager.getInstance().getConnection();
  const id = await generateNextCardId(db);
  const created = CardRecordAdapter.buildNewCard(id, input, Date.now());

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      SQL_INSERT_CARD,
      CardRecordAdapter.toInsertParams(created),
    );
    await upsertCardmarketPoint(
      db,
      id,
      todayIsoDate(),
      created.marketPriceEur,
    );
  });

  return created;
}

/**
 * Applies a partial update patch to an existing card holding and appends a Cardmarket snapshot
 * if the unit market price changed.
 *
 * @param id Target holding identifier.
 * @param patch Partial field modifications.
 * @returns Updated {@link CardHolding}, or `null` when `id` does not exist.
 */
export async function updateCard(
  id: string,
  patch: UpdateCardInput,
): Promise<CardHolding | null> {
  const db = await DatabaseManager.getInstance().getConnection();
  const existing = await db.getFirstAsync<CardDbRow>(
    'SELECT * FROM cards WHERE id = ?',
    [id],
  );
  if (!existing) {
    return null;
  }

  const current = CardRecordAdapter.toDomain(existing);
  const updated = CardRecordAdapter.mergePatch(current, patch);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE cards SET
        collector_number = ?,
        order_id = ?,
        purchase_date = ?,
        name_es = ?,
        name_en = ?,
        set_code = ?,
        language = ?,
        set_name = ?,
        deck = ?,
        condition = ?,
        shipping_eur = ?,
        quantity = ?,
        unit_cost_eur = ?,
        market_price_eur = ?
      WHERE id = ?`,
      [
        updated.collectorNumber,
        updated.orderId,
        updated.purchaseDate,
        updated.nameEs,
        updated.nameEn,
        updated.setCode,
        updated.language,
        updated.setName,
        updated.deck,
        updated.condition,
        updated.shippingEur,
        updated.quantity,
        updated.unitCostEur,
        updated.marketPriceEur,
        id,
      ],
    );

    if (
      patch.marketPriceEur !== undefined &&
      round2(updated.marketPriceEur) !== round2(current.marketPriceEur)
    ) {
      await upsertCardmarketPoint(
        db,
        id,
        todayIsoDate(),
        updated.marketPriceEur,
      );
    }
  });

  return updated;
}

/**
 * Deletes a card holding along with its stored price history series atomically.
 *
 * @param id Holding identifier to remove.
 */
export async function deleteCard(id: string): Promise<void> {
  const db = await DatabaseManager.getInstance().getConnection();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM cards WHERE id = ?', [id]);
    await db.runAsync('DELETE FROM card_price_series WHERE card_id = ?', [id]);
  });
}

/**
 * Loads all stored price series across the entire collection indexed by `cardId`.
 *
 * @returns Dictionary mapping card IDs to store price maps.
 */
export async function getAllPriceHistory(): Promise<
  Record<string, CardPriceHistoryMap>
> {
  const db = await DatabaseManager.getInstance().getConnection();
  const rows = await db.getAllAsync<{
    card_id: string;
    source: string;
    points_json: string;
  }>('SELECT card_id, source, points_json FROM card_price_series');

  const result: Record<string, CardPriceHistoryMap> = {};
  for (const row of rows) {
    if (!VALID_PRICE_SOURCES.has(row.source)) {
      continue;
    }
    const pts = CardRecordAdapter.parsePointsJson(row.points_json);
    if (pts.length === 0) {
      continue;
    }
    if (!result[row.card_id]) {
      result[row.card_id] = {};
    }
    result[row.card_id][row.source as PriceSource] = pts;
  }
  return result;
}

/**
 * Reads user preferences from `app_meta`, applying safe defaults for absent keys.
 *
 * @param defaultThemeId System-derived fallback theme identifier.
 * @returns Validated {@link AppPreferences}.
 */
export async function getPreferences(
  defaultThemeId: ThemeId,
): Promise<AppPreferences> {
  const db = await DatabaseManager.getInstance().getConnection();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM app_meta WHERE key IN (?, ?, ?, ?)',
    [PREF_LANGUAGE_KEY, PREF_THEME_KEY, PREF_CURRENCY_KEY, PREF_FX_RATE_KEY],
  );

  const metaMap = new Map(rows.map((row) => [row.key, row.value]));

  const rawLang = metaMap.get(PREF_LANGUAGE_KEY);
  const language: AppLanguage = rawLang === 'en' ? 'en' : 'es';

  const rawTheme = metaMap.get(PREF_THEME_KEY);
  const themeId: ThemeId =
    rawTheme && Object.prototype.hasOwnProperty.call(THEME_REGISTRY, rawTheme)
      ? (rawTheme as ThemeId)
      : defaultThemeId;

  const rawCurrency = metaMap.get(PREF_CURRENCY_KEY);
  const currency: CurrencyCode = rawCurrency === 'USD' ? 'USD' : 'EUR';

  const rawRate = metaMap.get(PREF_FX_RATE_KEY);
  const parsedRate = rawRate ? Number.parseFloat(rawRate) : Number.NaN;
  const eurToUsdRate = Number.isFinite(parsedRate)
    ? normalizeExchangeRate(parsedRate)
    : DEFAULT_EUR_TO_USD_RATE;

  return { language, themeId, currency, eurToUsdRate };
}

/**
 * Persists user preferences into `app_meta` within a single SQLite transaction.
 *
 * @param prefs Preferences snapshot to persist.
 */
export async function savePreferences(prefs: AppPreferences): Promise<void> {
  const db = await DatabaseManager.getInstance().getConnection();
  const entries: [string, string][] = [
    [PREF_LANGUAGE_KEY, prefs.language],
    [PREF_THEME_KEY, prefs.themeId],
    [PREF_CURRENCY_KEY, prefs.currency],
    [PREF_FX_RATE_KEY, String(normalizeExchangeRate(prefs.eurToUsdRate))],
  ];

  await db.withTransactionAsync(async () => {
    for (const [key, value] of entries) {
      await db.runAsync(SQL_UPSERT_META, [key, value]);
    }
  });
}
