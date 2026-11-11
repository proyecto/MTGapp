# MTG Vault

> Gestor móvil *local-first* y panel analítico de cartera para colecciones de cartas **Magic: The Gathering**, inspirado en la claridad visual *Calm Paper* de Things 3 y Todoist.

Construido con **Expo SDK 58**, **React Native 0.88**, **TypeScript** y **SQLite**, pensado para funcionar 100 % offline en Android (y compatible con iOS/Web) con sincronía financiera directa respecto al libro Excel original de seguimiento.

---

## Características principales

- **Colección interactiva (`Colección`)**:
  - Cabecera resumen con valoración total de mercado, beneficio neto, ROI (%) global e inversión total.
  - Búsqueda instantánea sin diacríticos (busca por nombre ES/EN, código de edición, nombre de set, número de coleccionista, mazo o ID).
  - Filtros rápidos (`Todas`, `Con ganancia`, `En pérdida`, `Sin coste`) con contadores en vivo y 6 criterios de ordenación (`Valor total`, `Mayor ganancia`, `Mayor pérdida`, `Mayor ROI %`, `Nombre`, `Fecha de compra`).
  - **Alta rápida (`QuickAddCardModal`)**: creación de nuevas cartas con cálculo previo en vivo de coste total, valor de mercado, beneficio y ROI.
  - **Detalle, histórico y edición (`CardDetailModal`)**: inspección de KPIs individuales, gráfica interactiva de evolución de precio por tienda (`7D | 30D | Todo` con referencia discontinua al precio de compra), tabla comparativa multi-tienda clickeable, edición completa y borrado con confirmación.

- **Panel analítico completo — 12 gráficas (`Gráficas`)**:
  - Selector de fuente de valoración (`Cardmarket`, `Scryfall`, `TCGPlayer`, `CardKingdom`, `ManaPool`) con cobertura real y tarjetas KPI 2×2 (incluyendo máximos históricos registrados).
  - Filtros por bloque (`Todas`, `Evolución`, `Rankings y ROI`, `Semanas y meses`, `Índices de mercado`) cubriendo las **12 gráficas**:
    1. **Valor vs Coste invertido** (tienda activa o superposición de las 5 tiendas).
    2. **Beneficio neto diario** con línea de pico del rango y línea base cero.
    3. **Evolución ROI (%) multitienda**.
    4. **Top 20 cartas más valiosas** (barras apiladas de coste + ganancia/déficit, con apertura directa de ficha al pulsar).
    5. **Distribución ROI en 8 tramos** (`< -100%` hasta `> +100%`, con desglose explícito de cartas sin coste).
    6. **Top 10 mayor ganancia** (conmutador `Unitario` / `Total`).
    7. **Top 10 mayor pérdida** (conmutador `Unitario` / `Total`).
    8. **Beneficio semanal (últimos 20 domingos)** con inspección táctil barra a barra.
    9. **Beneficio mensual (últimos 20 cierres de mes)** localizado en ES/EN.
    10. **Índices de Coleccionismo (Base 100)**: `Dual Lands 10`, `Power Nine` y `Reserved List`.
    11. **Índices de Juego Activo**: `Commander BC` y `Fetchlands 10`.
    12. **Índice Compuesto MTG (Base 100)**.

- **Configuración (`Configuración`)**:
  - **Idioma (`ES` / `EN`)**: cambia simultáneamente los textos de la interfaz y el nombre principal de cada carta (`nameEs` / `nameEn`), manteniendo el nombre alternativo como subtítulo.
  - **Tema (`Claro` / `Oscuro`)**: paleta *Calm Paper* de alta legibilidad gestionada mediante `THEME_REGISTRY` (preparado para incorporar nuevos temas).
  - **Divisa (`EUR €` / `USD $`)**: todos los importes se persisten internamente en euros y se convierten en presentación mediante un tipo de cambio offline editable (`1.08` por defecto).

---

## Stack tecnológico

| Tecnología | Versión | Rol en la aplicación |
| :--- | :--- | :--- |
| Expo | `~58.0.23` | Entorno gestionado (CNG), bundling Metro y configuración nativa |
| React Native | `0.88.1` | Renderizado móvil multiplataforma |
| React | `19.3.0` | Núcleo declarativo y gestión de estado |
| TypeScript | `~6.0.3` | Tipado estricto (`strict: true`) |
| `expo-sqlite` | `~58.0.15` | Base de datos relacional local en modo WAL |
| `react-native-svg` | `15.16.0` | Primitivos gráficos SVG nativos (líneas, áreas y barras) |
| `react-native-safe-area-context` | `~5.11.1` | Adaptación a recortes, barras de estado y gestos |

---

## Arquitectura y patrones de diseño

El código ha sido modularizado eliminando duplicidad entre pantallas, modales y constructores de gráficas mediante patrones de diseño clásicos documentados en formato **TSDoc/JSDoc**:

| Patrón | Implementación | Archivo principal |
| :--- | :--- | :--- |
| **Singleton** | `DatabaseManager.getInstance()` con deduplicación asíncrona de apertura e hidratación SQLite | [`src/db/cardsRepository.ts`](src/db/cardsRepository.ts) |
| **Adapter** | `CardRecordAdapter` (filas SQLite ↔ entidades de dominio) y `PriceEvolutionChart` (adapta series por carta a `MultiSeriesLineChart`) | [`src/db/cardsRepository.ts`](src/db/cardsRepository.ts), [`src/components/PriceEvolutionChart.tsx`](src/components/PriceEvolutionChart.tsx) |
| **Strategy + Registry** | `CURRENCY_STRATEGIES`, `CARD_FILTER_PREDICATES`, `THEME_REGISTRY` + `resolveTheme()`, diccionarios `ES`/`EN` | [`src/utils/cardMath.ts`](src/utils/cardMath.ts), [`src/theme/tokens.ts`](src/theme/tokens.ts), [`src/i18n/translations.ts`](src/i18n/translations.ts) |
| **Factory** | `createCardComparator()`, constructores de las 12 gráficas en `chartSeriesFactory` y `createCardFormValues()` / `buildCardPayload()` | [`src/utils/cardMath.ts`](src/utils/cardMath.ts), [`src/utils/chartSeriesFactory.ts`](src/utils/chartSeriesFactory.ts), [`src/components/shared/CardFormFields.tsx`](src/components/shared/CardFormFields.tsx) |
| **Repository Facade** | Funciones CRUD tipadas que ocultan SQL, transacciones y series JSON compactas `[fecha, precio]` | [`src/db/cardsRepository.ts`](src/db/cardsRepository.ts) |
| **Composición compartida** | Primitivos UI reutilizables (`ModalSheet`, `SegmentedToggle`, `ChipSelector`, `FormField`, `CardFormFields`) | [`src/components/shared/`](src/components/shared/ModalSheet.tsx) |

Para un análisis detallado con diagramas de flujo, revisa [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Estructura del proyecto

```text
MTGapp/
├── App.tsx                             # Raíz, carga inicial SQLite, estado global y toast
├── app.json                            # Configuración Expo (CNG + plugin expo-sqlite)
├── index.ts                            # Punto de entrada Expo
├── docs/                               # Documentación técnica del proyecto
│   ├── README.md                       # Índice de documentación
│   ├── ARCHITECTURE.md                 # Arquitectura por capas y patrones de diseño
│   ├── DATA_MODEL_AND_FORMULAS.md      # Esquema SQLite, cálculos y las 12 gráficas Excel
│   ├── UI_AND_THEMES.md                # Sistema Calm Paper, i18n y componentes compartidos
│   └── DEVELOPMENT.md                  # Flujo de desarrollo, verificación y TypeDoc
└── src/
    ├── components/
    │   ├── BottomNavBar.tsx            # Barra inferior (Colección · Gráficas · Configuración)
    │   ├── CardDetailModal.tsx         # Ficha completa, histórico, comparador y edición
    │   ├── CardRow.tsx                 # Fila memoizada de carta en el listado
    │   ├── CollectionHeader.tsx        # Resumen superior de valoración e inversión
    │   ├── PriceEvolutionChart.tsx     # Adaptador de gráfica de precio individual
    │   ├── QuickAddCardModal.tsx       # Modal de alta rápida con preview financiero
    │   ├── SearchAndFilters.tsx        # Buscador, filtros por ganancia/coste y ordenación
    │   ├── SettingsModal.tsx           # Preferencias de idioma, tema y moneda
    │   ├── charts/
    │   │   ├── HorizontalRankingChart.tsx  # Barras horizontales simples y apiladas
    │   │   ├── MultiSeriesLineChart.tsx    # Gráfica SVG multiserie con área y zoom
    │   │   └── VerticalBarChart.tsx        # Columnas verticales con inspección táctil
    │   └── shared/
    │       ├── CardFormFields.tsx      # Formulario unificado Alta / Edición + Factory
    │       ├── FormControls.tsx        # SegmentedToggle, ChipSelector y FormField
    │       └── ModalSheet.tsx          # Contenedor slide-up modal reutilizable
    ├── data/
    │   ├── seedCards.json              # 120 cartas iniciales importadas del Excel
    │   ├── seedPriceHistory.json       # Series históricas diarias de las 5 tiendas
    │   └── seedMarketIndices.json      # Índices semanales del mercado MTG
    ├── db/
    │   └── cardsRepository.ts          # Singleton SQLite, Adapter y CRUD transaccional
    ├── i18n/
    │   └── translations.ts             # Diccionario completo Español / Inglés
    ├── screens/
    │   ├── CollectionScreen.tsx        # Pantalla principal de inventario + FAB "+"
    │   └── DashboardScreen.tsx         # Panel analítico con 12 gráficas y KPIs
    ├── theme/
    │   └── tokens.ts                   # Tokens Calm Paper y THEME_REGISTRY
    ├── types/
    │   └── card.ts                     # Tipos e invariantes del dominio MTG
    └── utils/
        ├── cardMath.ts                 # Cálculos, FX, filtros, ordenación y series diarias
        └── chartSeriesFactory.ts       # Factorías de datasets para DashboardScreen
```

---

## Inicio rápido

1. **Instalar dependencias**:

   ```bash
   npm install
   ```

2. **Iniciar servidor de desarrollo Expo**:

   ```bash
   npx expo start
   ```

   También puedes lanzar directamente Android:

   ```bash
   npx expo start --android
   ```

3. **Comprobar tipos, lint y bundle**:

   ```bash
   npx tsc --noEmit
   npx eslint .
   npx expo lint
   ```

4. **Generar documentación automática de código (TypeDoc)**:

   Todo el código fuente incluye etiquetas **TSDoc/JSDoc** (`@module`, `@param`, `@returns`). Puedes generar una web HTML navegable de la API con:

   ```bash
   npx typedoc --entryPointStrategy expand App.tsx src
   ```

---

## Documentación adicional

Consulta el índice completo en [`docs/README.md`](docs/README.md):

- [Arquitectura y Patrones de Diseño](docs/ARCHITECTURE.md)
- [Modelo de Datos, SQLite y Fórmulas Excel](docs/DATA_MODEL_AND_FORMULAS.md)
- [Interfaz Calm Paper, Temas e Internacionalización](docs/UI_AND_THEMES.md)
- [Guía de Desarrollo, Pruebas y Generación de API Docs](docs/DEVELOPMENT.md)
