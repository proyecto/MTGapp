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

function normalizeCondition(raw: string): CardCondition {
  const upper = raw.trim().toUpperCase();
  return (CARD_CONDITIONS as readonly string[]).includes(upper)
    ? (upper as CardCondition)
    : 'EX';
}

function mapRowToCard(row: CardDbRow): CardHolding {
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
    condition: normalizeCondition(row.condition ?? 'EX'),
    shippingEur: Number(row.shipping_eur ?? 0),
    quantity: Math.max(1, Number(row.quantity ?? 1)),
    unitCostEur: Number(row.unit_cost_eur ?? 0),
    marketPriceEur: Number(row.market_price_eur ?? 0),
    createdAt: Number(row.created_at ?? 0),
  };
}

function parsePointsJson(raw: string): PricePoint[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
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
}

function serializePoints(points: readonly PricePoint[]): string {
  return JSON.stringify(points.map((p) => [p.date, round2(p.price)]));
}

let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
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

  const meta = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    [SEED_META_KEY],
  );

  if (!meta) {
    const existing = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM cards',
    );
    const seedList = seedCardsJson as CardHolding[];

    await db.withTransactionAsync(async () => {
      if ((existing?.count ?? 0) === 0 && seedList.length > 0) {
        for (let i = 0; i < seedList.length; i++) {
          const item = seedList[i];
          await db.runAsync(
            `INSERT INTO cards (
              id, collector_number, order_id, purchase_date,
              name_es, name_en, set_code, language, set_name,
              deck, condition, shipping_eur, quantity,
              unit_cost_eur, market_price_eur, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.id,
              item.collectorNumber ?? '',
              item.orderId ?? null,
              item.purchaseDate,
              item.nameEs,
              item.nameEn || item.nameEs,
              item.setCode.toUpperCase(),
              (item.language || 'en').toLowerCase(),
              item.setName ?? '',
              item.deck ?? null,
              normalizeCondition(item.condition),
              Number(item.shippingEur ?? 0),
              Math.max(1, Number(item.quantity ?? 1)),
              Number(item.unitCostEur ?? 0),
              Number(item.marketPriceEur ?? 0),
              i + 1,
            ],
          );
        }
      }

      await db.runAsync(
        'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
        [SEED_META_KEY, '1'],
      );
    });
  }

  const historyMeta = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    [SEED_HISTORY_META_KEY],
  );

  if (!historyMeta) {
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

      await db.runAsync(
        'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
        [SEED_HISTORY_META_KEY, '1'],
      );
    });
  }

  return db;
}

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInitPromise) {
    dbInitPromise = initDatabase().catch((err) => {
      dbInitPromise = null;
      throw err;
    });
  }
  return dbInitPromise;
}

async function generateNextCardId(db: SQLite.SQLiteDatabase): Promise<string> {
  const rows = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM cards WHERE id LIKE 'CARD-%'",
  );
  let maxNum = 0;
  for (const row of rows) {
    const match = /^CARD-(\d+)$/.exec(row.id);
    if (match) {
      const parsed = Number.parseInt(match[1], 10);
      if (parsed > maxNum) {
        maxNum = parsed;
      }
    }
  }
  let candidate = maxNum + 1;
  while (true) {
    const id = `CARD-${String(candidate).padStart(5, '0')}`;
    const existing = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM cards WHERE id = ?',
      [id],
    );
    if (!existing) {
      return id;
    }
    candidate += 1;
  }
}

export async function listCards(): Promise<CardHolding[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CardDbRow>(
    'SELECT * FROM cards ORDER BY market_price_eur * quantity DESC, id ASC',
  );
  return rows.map(mapRowToCard);
}

export async function getCardPriceHistory(
  card: CardHolding,
): Promise<CardPriceHistoryMap> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ source: string; points_json: string }>(
    'SELECT source, points_json FROM card_price_series WHERE card_id = ?',
    [card.id],
  );

  const result: CardPriceHistoryMap = {};
  for (const row of rows) {
    if ((PRICE_SOURCES as readonly string[]).includes(row.source)) {
      const pts = parsePointsJson(row.points_json);
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

  const points = existing ? parsePointsJson(existing.points_json) : [];
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
    [cardId, 'Cardmarket', serializePoints(points)],
  );
}

export async function insertCard(input: NewCardInput): Promise<CardHolding> {
  const db = await getDb();
  const id = await generateNextCardId(db);
  const createdAt = Date.now();
  const cleanNameEs = input.nameEs.trim();
  const cleanNameEn = (input.nameEn || cleanNameEs).trim();
  const cleanSetCode = input.setCode.trim().toUpperCase();
  const cleanSetName = input.setName.trim();
  const cleanLanguage = (input.language || 'en').trim().toLowerCase();
  const cleanDeck = input.deck && input.deck.trim() ? input.deck.trim() : null;
  const cleanOrderId =
    input.orderId && input.orderId.trim() ? input.orderId.trim() : null;
  const cleanCondition = normalizeCondition(input.condition);
  const cleanQty = Math.max(1, Math.round(input.quantity || 1));
  const cleanShipping = Math.max(0, input.shippingEur || 0);
  const cleanUnitCost = Math.max(0, input.unitCostEur || 0);
  const cleanMarket = Math.max(0, input.marketPriceEur || 0);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO cards (
        id, collector_number, order_id, purchase_date,
        name_es, name_en, set_code, language, set_name,
        deck, condition, shipping_eur, quantity,
        unit_cost_eur, market_price_eur, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.collectorNumber.trim(),
        cleanOrderId,
        input.purchaseDate,
        cleanNameEs,
        cleanNameEn,
        cleanSetCode,
        cleanLanguage,
        cleanSetName,
        cleanDeck,
        cleanCondition,
        cleanShipping,
        cleanQty,
        cleanUnitCost,
        cleanMarket,
        createdAt,
      ],
    );

    await upsertCardmarketPoint(db, id, todayIsoDate(), cleanMarket);
  });

  return {
    id,
    collectorNumber: input.collectorNumber.trim(),
    orderId: cleanOrderId,
    purchaseDate: input.purchaseDate,
    nameEs: cleanNameEs,
    nameEn: cleanNameEn,
    setCode: cleanSetCode,
    language: cleanLanguage,
    setName: cleanSetName,
    deck: cleanDeck,
    condition: cleanCondition,
    shippingEur: cleanShipping,
    quantity: cleanQty,
    unitCostEur: cleanUnitCost,
    marketPriceEur: cleanMarket,
    createdAt,
  };
}

export async function updateCard(
  id: string,
  patch: UpdateCardInput,
): Promise<CardHolding | null> {
  const db = await getDb();
  const existing = await db.getFirstAsync<CardDbRow>(
    'SELECT * FROM cards WHERE id = ?',
    [id],
  );
  if (!existing) {
    return null;
  }

  const current = mapRowToCard(existing);
  const updated: CardHolding = {
    ...current,
    ...patch,
    nameEs: (patch.nameEs ?? current.nameEs).trim(),
    nameEn:
      (patch.nameEn ?? current.nameEn).trim() ||
      (patch.nameEs ?? current.nameEs).trim(),
    setCode: (patch.setCode ?? current.setCode).trim().toUpperCase(),
    setName: (patch.setName ?? current.setName).trim(),
    collectorNumber: (patch.collectorNumber ?? current.collectorNumber).trim(),
    language: (patch.language ?? current.language).trim().toLowerCase() || 'en',
    deck:
      patch.deck !== undefined
        ? patch.deck && patch.deck.trim()
          ? patch.deck.trim()
          : null
        : current.deck,
    orderId:
      patch.orderId !== undefined
        ? patch.orderId && patch.orderId.trim()
          ? patch.orderId.trim()
          : null
        : current.orderId,
    condition: normalizeCondition(patch.condition ?? current.condition),
    shippingEur: Math.max(0, patch.shippingEur ?? current.shippingEur),
    quantity: Math.max(1, Math.round(patch.quantity ?? current.quantity)),
    unitCostEur: Math.max(0, patch.unitCostEur ?? current.unitCostEur),
    marketPriceEur: Math.max(0, patch.marketPriceEur ?? current.marketPriceEur),
  };

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

export async function deleteCard(id: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM cards WHERE id = ?', [id]);
    await db.runAsync('DELETE FROM card_price_series WHERE card_id = ?', [id]);
  });
}

export async function getAllPriceHistory(): Promise<
  Record<string, CardPriceHistoryMap>
> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    card_id: string;
    source: string;
    points_json: string;
  }>('SELECT card_id, source, points_json FROM card_price_series');

  const result: Record<string, CardPriceHistoryMap> = {};
  for (const row of rows) {
    if (!(PRICE_SOURCES as readonly string[]).includes(row.source)) {
      continue;
    }
    const pts = parsePointsJson(row.points_json);
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

export async function getPreferences(
  defaultThemeId: ThemeId,
): Promise<AppPreferences> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM app_meta WHERE key IN (?, ?, ?, ?)',
    [PREF_LANGUAGE_KEY, PREF_THEME_KEY, PREF_CURRENCY_KEY, PREF_FX_RATE_KEY],
  );

  const metaMap = new Map<string, string>();
  for (const row of rows) {
    metaMap.set(row.key, row.value);
  }

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

  return {
    language,
    themeId,
    currency,
    eurToUsdRate,
  };
}

export async function savePreferences(prefs: AppPreferences): Promise<void> {
  const db = await getDb();
  const cleanRate = normalizeExchangeRate(prefs.eurToUsdRate);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
      [PREF_LANGUAGE_KEY, prefs.language],
    );
    await db.runAsync(
      'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
      [PREF_THEME_KEY, prefs.themeId],
    );
    await db.runAsync(
      'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
      [PREF_CURRENCY_KEY, prefs.currency],
    );
    await db.runAsync(
      'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
      [PREF_FX_RATE_KEY, String(cleanRate)],
    );
  });
}
