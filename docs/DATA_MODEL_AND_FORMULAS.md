# Modelo de Datos, SQLite y Fórmulas Excel

## Esquema relacional en SQLite (`mtg_vault.db`)

La base de datos local se configura con `PRAGMA journal_mode = WAL` en [`src/db/cardsRepository.ts`](../src/db/cardsRepository.ts) y consta de tres tablas:

### 1. Tabla `cards`

Almacena todas las entradas del inventario con nombres bilingües y precios unitarios en euros (`EUR`) como moneda base.

| Columna | Tipo SQL | Propiedad TS (`CardHolding`) | Notas |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT PRIMARY KEY` | `id` | Formato `CARD-00001` generado secuencialmente |
| `collector_number` | `TEXT NOT NULL` | `collectorNumber` | Número dentro de la edición |
| `order_id` | `TEXT` | `orderId` | Identificador opcional de pedido (ej. Cardmarket) |
| `purchase_date` | `TEXT NOT NULL` | `purchaseDate` | Fecha ISO `YYYY-MM-DD` |
| `name_es` | `TEXT NOT NULL` | `nameEs` | Nombre en español |
| `name_en` | `TEXT NOT NULL` | `nameEn` | Nombre en inglés |
| `set_code` | `TEXT NOT NULL` | `setCode` | Código de edición en mayúsculas (ej. `3ED`, `USG`) |
| `language` | `TEXT NOT NULL` | `language` | Idioma físico de la carta (`en`, `sp`, `it`, `fr`, `de`, `jp`) |
| `set_name` | `TEXT NOT NULL` | `setName` | Nombre completo de la edición |
| `deck` | `TEXT` | `deck` | Mazo o carpeta asociada (opcional) |
| `condition` | `TEXT NOT NULL` | `condition` | Grado Cardmarket: `NM`, `EX`, `GD`, `LP`, `PL`, `PO` |
| `shipping_eur` | `REAL NOT NULL` | `shippingEur` | Gastos de envío totales de la línea en EUR |
| `quantity` | `INTEGER NOT NULL` | `quantity` | Copias (`>= 1`) |
| `unit_cost_eur` | `REAL NOT NULL` | `unitCostEur` | Precio de compra unitario en EUR |
| `market_price_eur` | `REAL NOT NULL` | `marketPriceEur` | Precio de mercado Cardmarket más reciente en EUR |
| `created_at` | `INTEGER NOT NULL` | `createdAt` | Orden/timestamp de inserción |

Índice adicional: `idx_cards_set_code` sobre `cards(set_code)`.

### 2. Tabla `card_price_series`

Almacena las cotizaciones históricas diarias por carta y tienda:

| Columna | Tipo SQL | Descripción |
| :--- | :--- | :--- |
| `card_id` | `TEXT NOT NULL` | Identificador de la carta |
| `source` | `TEXT NOT NULL` | `Cardmarket`, `Scryfall`, `TCGPlayer`, `CardKingdom` o `ManaPool` |
| `points_json` | `TEXT NOT NULL` | Matriz JSON compacta `[["2026-09-07", 12.50], ...]` ordenada ascendentemente |

Clave primaria compuesta `(card_id, source)` e índice `idx_price_series_card(card_id)`.

### 3. Tabla `app_meta`

Tabla clave-valor (`key PRIMARY KEY`, `value`) que persiste banderas de inicialización y preferencias del usuario:

- `seed_v1_applied` y `seed_history_v1_applied`: evitan re-importar los JSON semilla si el usuario modifica o vacía su colección.
- `pref_language`: `'es'` o `'en'`.
- `pref_theme_id`: identificador registrado en `THEME_REGISTRY` (`'light'` o `'dark'`).
- `pref_currency`: `'EUR'` o `'USD'`.
- `pref_eur_usd_rate`: multiplicador decimal validado en el rango `(0.01, 1000)` (`1.08` por defecto).

---

## Fórmulas financieras y paridad con el Excel

Todas las operaciones aritméticas se redondean al céntimo mediante `round2()` evitando ceros negativos (`-0`).

### Métricas por carta ([`computeCardMetrics`](../src/utils/cardMath.ts))

$$\text{totalCost} = \text{round2}(\text{unitCostEur} \times \text{quantity} + \text{shippingEur})$$

$$\text{totalMarket} = \text{round2}(\text{unitMarketEur} \times \text{quantity})$$

$$\text{profit} = \text{round2}(\text{totalMarket} - \text{totalCost})$$

$$\text{roiPct} = \begin{cases} \dfrac{\text{profit}}{\text{totalCost}} \times 100 & \text{si } \text{totalCost} > 0 \\[6pt] \text{null} & \text{si } \text{totalCost} = 0 \end{cases}$$

> **Cartas sin coste (`totalCost === 0`)**: Existen 32 registros en la colección inicial cuyo coste de compra y envío es `0 €` (cartas regaladas, de sobres antiguos o heredadas). Para evitar divisiones por cero, `roiPct` es `null` y se etiqueta en UI como **`Sin coste`** / **`Zero cost`**.

### Regla de valoración por tienda ([`computeSourceUnitPriceEur`](../src/utils/cardMath.ts))

- Si la tienda seleccionada es **`Cardmarket`**, prevalece siempre `card.marketPriceEur` del registro en `cards`, garantizando que cualquier edición manual o alta rápida se refleje inmediatamente tanto en el listado como en todas las gráficas.
- Para el resto de tiendas (`Scryfall`, `TCGPlayer`, `CardKingdom`, `ManaPool`), si existe serie histórica para la carta, se toma su último precio disponible; en caso de no existir cobertura nativa para esa tienda, se aplica fallback a `card.marketPriceEur` para no distorsionar la valoración total de la cartera.

### Conversión y formato de divisa ([`formatMoney`](../src/utils/cardMath.ts) / [`formatSignedMoney`](../src/utils/cardMath.ts))

- La persistencia interna siempre ocurre en **EUR**.
- Al activar **USD ($)** en Configuración, `CURRENCY_STRATEGIES.USD` multiplica en pantalla el valor por `eurToUsdRate` antes de aplicar el formato local:
  - Español (`es`): separador de miles `.`, decimal `,` y símbolo al final (`3.122,03 €`, `108,00 $`, `+41,5%`).
  - Inglés (`en`): separador de miles `,`, decimal `.` y símbolo delante (`€3,122.03`, `$108.00`, `-$13.75`).

---

## Correspondencia con las 12 gráficas del Excel (`Graficos`)

| # | Gráfica en MTG Vault | Hoja / Concepto origen | Comportamiento y mejoras aplicadas |
| :-: | :--- | :--- | :--- |
| 1 | **Valor vs Coste invertido** | Evolución valoración total vs desembolso | Conmutador `Tienda | 5 Tiendas`, zoom `7D | 30D | Todo`, *carry-forward* diario respetando `purchaseDate`. |
| 2 | **Beneficio neto diario** | Ganancia acumulada neta | Referencia horizontal discontinua en `0 €` (si aplica) y pico máximo del rango visible. |
| 3 | **ROI (%) diario multitienda** | Rentabilidad porcentual diaria | Comparativa simultánea entre los 5 mercados con referencia `0%`. |
| 4 | **Top 20 más valiosas** | Ranking de valor con desglose Coste + Profit | Barras horizontales apiladas; las posiciones en pérdida muestran barra de mercado y déficit en rojo suave. |
| 5 | **Distribución ROI (8 tramos)** | Histograma de rentabilidad | Tramos exactos: `< -100%`, `-100..-50%`, `-50..-25%`, `-25..0%`, `0..+25%`, `+25..+50%`, `+50..+100%`, `> +100%`. Excluye las 32 cartas sin coste con nota informativa al pie. |
| 6 | **Top 10 mayor ganancia** | Cartas más rentables | Conmutador **Unitario** (idéntico al gráfico unitario del Excel) / **Total** (`× copias`). |
| 7 | **Top 10 mayor pérdida** | Cartas con mayor retroceso | Conmutador **Unitario** / **Total**, ordenado de menor a mayor beneficio negativo. |
| 8 | **Beneficio últimas 20 semanas** | Cierre de últimos 20 domingos | Barras verticales con inspección táctil y *backfill* automático completo de las **120 cartas** (subsanando el límite de filas `$S$2:$S$100` del Excel original). |
| 9 | **Beneficio últimos 20 meses** | Cierre de últimos 20 meses | Mismo algoritmo *carry-forward* + *backfill* al último día de cada mes (topado a `maxDate` para el mes en curso). |
| 10 | **Índices de Coleccionismo (Base 100)** | Dual Lands 10 · Power Nine · Reserved List | Normalización **Base 100 (%)** respecto a la primera semana para que índices de 700 € y 17.000 € sean legibles a la vez, conservando el valor real y `%` en la leyenda. |
| 11 | **Índices de Juego Activo** | Commander Blue Chips · Fetchlands 10 | Series comparadas en divisa activa desde `seedMarketIndices.json`. |
| 12 | **Índice Compuesto MTG (Base 100)** | Media compuesta semanal | Evolución en puntos (`pts`) con insignia de variación en el periodo. |

### Valores de referencia validados (colección semilla 120 cartas en Cardmarket)

- **Coste total invertido**: `2.206,36 €` (`120` registros, `167` copias totales).
- **Valor de mercado Cardmarket**: `3.122,03 €` (máximo histórico diario registrado: `3.253,38 €`).
- **Beneficio neto**: `+915,67 €` (`+41,5%` ROI).
- **Distribución exacta 8 tramos ROI**: `[0, 5, 20, 17, 17, 15, 6, 8]` + `32` cartas sin coste.
- **Semanas / Meses clave**: cierre semanal `27/09` (`+1.030,49 €`), último domingo (`+900,19 €`); últimos 3 cierres mensuales (`+1.002,99 €`, `+877,57 €`, `+915,67 €`).

