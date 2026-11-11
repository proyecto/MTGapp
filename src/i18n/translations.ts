/**
 * @module i18n/translations
 * Complete Spanish and English UI translation dictionaries (Registry pattern keyed by {@link AppLanguage}).
 */

import type {
  AppLanguage,
  CardFilter,
  CardSort,
  CurrencyCode,
  HistoryRange,
  ThemeId,
} from '../types/card';

/** Complete localization dictionary contract enforced at compile time for every supported language. */
export interface Translations {
  tabs: {
    collection: string;
    charts: string;
  };
  common: {
    settings: string;
    close: string;
    cancel: string;
    save: string;
    saving: string;
    edit: string;
    delete: string;
    retry: string;
    zeroCost: string;
    copySingular: string;
    copyPlural: string;
    recordSingular: string;
    recordPlural: string;
    allRange: string;
    loadingCollection: string;
    dbOpenError: string;
    loadErrorTitle: string;
  };
  header: {
    eyebrowCollection: (currency: CurrencyCode) => string;
    investmentMeta: (
      investmentStr: string,
      copies: number,
      records: number,
    ) => string;
    showingCount: (count: number) => string;
  };
  search: {
    placeholder: string;
    clearLabel: string;
    sortModalTitle: string;
    sortLabel: (shortLabel: string) => string;
    filters: Record<CardFilter, string>;
    sorts: Record<CardSort, { label: string; shortLabel: string }>;
  };
  empty: {
    collectionTitle: string;
    collectionSubtitle: string;
    noResultsTitle: string;
    noResultsSubtitle: string;
    clearFilters: string;
  };
  toasts: {
    added: (name: string) => string;
    updated: (name: string) => string;
    deleted: (name?: string) => string;
  };
  quickAdd: {
    eyebrow: string;
    title: string;
    nameEsLabel: string;
    nameEsPlaceholder: string;
    nameEnLabel: string;
    nameEnPlaceholder: string;
    setCodeLabel: string;
    collectorLabel: string;
    collectorPlaceholder: string;
    setNameLabel: string;
    setNamePlaceholder: string;
    conditionLabel: string;
    languageLabel: string;
    quantityLabel: string;
    unitCostLabel: string;
    shippingLabel: string;
    marketPriceLabel: string;
    purchaseDateLabel: string;
    deckLabel: string;
    deckPlaceholder: string;
    orderIdLabel: string;
    orderIdPlaceholder: string;
    previewCost: string;
    previewValue: string;
    previewProfit: string;
    submitButton: string;
    errMissingName: string;
    errMissingSet: string;
    errSaveFailed: string;
    eurBaseHint: string;
  };
  detail: {
    currentValue: string;
    investment: string;
    profit: string;
    condition: string;
    language: string;
    quantity: string;
    unitCost: string;
    shipping: string;
    marketUnit: string;
    purchaseDate: string;
    orderId: string;
    deck: string;
    cardId: string;
    storePricesTitle: string;
    storePricesHint: string;
    chartTitle: (source: string) => string;
    chartNoData: string;
    chartSingleRecord: string;
    chartMinMax: (minStr: string, maxStr: string) => string;
    chartCostRef: (costStr: string) => string;
    deleteConfirmTitle: string;
    deleteConfirmBody: (name: string, setCode: string) => string;
    errDelete: string;
    errUpdate: string;
    errMissingRequired: string;
    nameEsEdit: string;
    nameEnEdit: string;
    setCodeEdit: string;
    setNameEdit: string;
    optional: string;
  };
  settings: {
    eyebrow: string;
    title: string;
    languageTitle: string;
    languageSubtitle: string;
    languages: Record<AppLanguage, string>;
    themeTitle: string;
    themeSubtitle: string;
    themes: Record<ThemeId, string>;
    currencyTitle: string;
    currencySubtitle: string;
    currencies: Record<CurrencyCode, string>;
    rateLabel: string;
    rateHint: string;
  };
  dashboard: {
    eyebrow: string;
    title: string;
    sourceLabel: string;
    coverageNote: (covered: number, total: number) => string;
    kpiValue: string;
    kpiValueRecord: (val: string) => string;
    kpiCost: string;
    kpiCostSub: string;
    kpiProfit: string;
    kpiProfitRecord: (val: string) => string;
    kpiRoi: string;
    kpiRoiSub: string;
    evolutionTitle: string;
    evolutionSubtitle: string;
    legendValue: string;
    legendCost: string;
    noChartData: string;
    rankingsTabs: {
      topValue: string;
      topGain: string;
      topLoss: string;
      roiBuckets: string;
    };
    purchaseLabel: (costStr: string) => string;
    noLossCards: string;
    noGainCards: string;
    zeroCostBucketNote: (count: number) => string;
    tapHint: string;
    rangeLabels: Record<HistoryRange, string>;
    categories: {
      all: string;
      evolution: string;
      rankings: string;
      periods: string;
      indices: string;
    };
    sections: {
      evolution: string;
      rankings: string;
      periods: string;
      indices: string;
    };
    modeActiveStore: string;
    modeMultiStore: string;
    modeUnit: string;
    modeTotal: string;
    profitTitle: string;
    profitSubtitle: string;
    profitPeakRef: (peakStr: string) => string;
    roiTitle: string;
    roiSubtitle: string;
    top20Title: string;
    top20Subtitle: string;
    legendProfit: string;
    roiDistTitle: string;
    roiDistSubtitle: string;
    topGainTitle: string;
    topGainSubtitle: string;
    topLossTitle: string;
    topLossSubtitle: string;
    weeklyTitle: string;
    weeklySubtitle: string;
    monthlyTitle: string;
    monthlySubtitle: string;
    minLabel: (val: string) => string;
    maxLabel: (val: string) => string;
    currentLabel: (val: string) => string;
    indicesCollectTitle: string;
    indicesCollectSubtitle: string;
    indicesActiveTitle: string;
    indicesActiveSubtitle: string;
    indicesCompositeTitle: string;
    indicesCompositeSubtitle: string;
    indexNormalizedLabel: string;
    indexDualLands: string;
    indexPowerNine: string;
    indexRlStaples: string;
    indexCommander: string;
    indexFetchlands: string;
    indexComposite: string;
    ptsUnit: string;
  };
}

const ES: Translations = {
  tabs: {
    collection: 'Colección',
    charts: 'Gráficas',
  },
  common: {
    settings: 'Configuración',
    close: 'Cerrar',
    cancel: 'Cancelar',
    save: 'Guardar',
    saving: 'Guardando…',
    edit: 'Editar',
    delete: 'Eliminar',
    retry: 'Reintentar',
    zeroCost: 'Sin coste',
    copySingular: 'copia',
    copyPlural: 'copias',
    recordSingular: 'ficha',
    recordPlural: 'fichas',
    allRange: 'Todo',
    loadingCollection: 'Cargando colección…',
    dbOpenError: 'No se pudo abrir la base de datos local.',
    loadErrorTitle: 'Error al cargar',
  },
  header: {
    eyebrowCollection: (currency) => `MI COLECCIÓN · ${currency}`,
    investmentMeta: (investmentStr, copies, records) =>
      `Inversión ${investmentStr} · ${copies} ${copies === 1 ? 'copia' : 'copias'} (${records} ${records === 1 ? 'ficha' : 'fichas'})`,
    showingCount: (count) => `Mostrando ${count}`,
  },
  search: {
    placeholder: 'Buscar carta (ES/EN), set, nº o mazo…',
    clearLabel: 'Limpiar búsqueda',
    sortModalTitle: 'Ordenar colección',
    sortLabel: (shortLabel) => `↕ ${shortLabel}`,
    filters: {
      all: 'Todas',
      gain: 'Ganancia',
      loss: 'Pérdida',
      zeroCost: 'Sin coste',
    },
    sorts: {
      value: { label: 'Mayor valor total', shortLabel: 'Valor ↓' },
      profit: { label: 'Mayor ganancia', shortLabel: 'Profit ↓' },
      loss: { label: 'Mayor pérdida', shortLabel: 'Pérdida ↓' },
      roi: { label: 'Mayor rentabilidad (%)', shortLabel: 'ROI % ↓' },
      name: { label: 'Nombre (A–Z)', shortLabel: 'A–Z' },
      date: { label: 'Compra más reciente', shortLabel: 'Recientes' },
    },
  },
  empty: {
    collectionTitle: 'Tu colección está vacía',
    collectionSubtitle:
      'Pulsa el botón + para registrar tu primera carta manualmente.',
    noResultsTitle: 'Sin resultados',
    noResultsSubtitle:
      'Ninguna carta coincide con tu búsqueda o filtro actual.',
    clearFilters: 'Limpiar filtros',
  },
  toasts: {
    added: (name) => `Añadida «${name}»`,
    updated: (name) => `Actualizada «${name}»`,
    deleted: (name) => (name ? `Eliminada «${name}»` : 'Carta eliminada'),
  },
  quickAdd: {
    eyebrow: 'NUEVA CARTA',
    title: 'Añadir a la colección',
    nameEsLabel: 'Nombre (ES) *',
    nameEsPlaceholder: 'ej. Ángel de Serra o Demonic Tutor',
    nameEnLabel: 'Nombre (EN)',
    nameEnPlaceholder: 'Opcional si coincide con el nombre principal',
    setCodeLabel: 'Edición (cód.) *',
    collectorLabel: 'Nº colección',
    collectorPlaceholder: 'ej. 40',
    setNameLabel: 'Nombre edición (opcional)',
    setNamePlaceholder: 'ej. Revised Edition',
    conditionLabel: 'Estado',
    languageLabel: 'Idioma de la carta',
    quantityLabel: 'Cantidad',
    unitCostLabel: 'Coste unit. (€)',
    shippingLabel: 'Gastos envío (€)',
    marketPriceLabel: 'Mercado hoy (€)',
    purchaseDateLabel: 'Fecha compra',
    deckLabel: 'Mazo / Carpeta',
    deckPlaceholder: 'ej. Álbum RL',
    orderIdLabel: 'ID Pedido (opcional)',
    orderIdPlaceholder: 'ej. 1106877908',
    previewCost: 'Inversión total',
    previewValue: 'Valor total',
    previewProfit: 'Beneficio',
    submitButton: 'Guardar carta',
    errMissingName: 'Introduce al menos el nombre de la carta.',
    errMissingSet: 'Introduce el código de edición (ej. 3ED, 2ED, ARN).',
    errSaveFailed: 'No se pudo guardar la carta en SQLite.',
    eurBaseHint: 'Los importes introducidos se guardan en EUR (€ base).',
  },
  detail: {
    currentValue: 'Valor hoy',
    investment: 'Inversión',
    profit: 'Beneficio',
    condition: 'Estado',
    language: 'Idioma',
    quantity: 'Cantidad',
    unitCost: 'Coste unitario',
    shipping: 'Gastos de envío',
    marketUnit: 'Mercado (unidad)',
    purchaseDate: 'Fecha de compra',
    orderId: 'ID Pedido',
    deck: 'Mazo / Carpeta',
    cardId: 'ID ficha',
    storePricesTitle: 'Precios por tienda (unidad)',
    storePricesHint: 'Toca para ver gráfica',
    chartTitle: (source) => `Histórico · ${source}`,
    chartNoData: 'Sin histórico de precios disponible para esta fuente.',
    chartSingleRecord: '1 registro guardado',
    chartMinMax: (minStr, maxStr) => `Mín ${minStr} · Máx ${maxStr}`,
    chartCostRef: (costStr) => `--- Línea discontinua: tu coste unitario (${costStr})`,
    deleteConfirmTitle: 'Eliminar carta',
    deleteConfirmBody: (name, setCode) =>
      `¿Seguro que quieres eliminar «${name}» (${setCode}) de tu colección?`,
    errDelete: 'No se pudo eliminar la carta.',
    errUpdate: 'No se pudieron guardar los cambios.',
    errMissingRequired: 'Nombre y código de edición son obligatorios.',
    nameEsEdit: 'Nombre (ES) *',
    nameEnEdit: 'Nombre (EN)',
    setCodeEdit: 'Edición *',
    setNameEdit: 'Nombre edición',
    optional: 'Opcional',
  },
  settings: {
    eyebrow: 'PREFERENCIAS',
    title: 'Configuración',
    languageTitle: 'Idioma',
    languageSubtitle:
      'Cambia el idioma de la interfaz y el nombre de tus cartas (ES / EN).',
    languages: {
      es: 'Español',
      en: 'English',
    },
    themeTitle: 'Tema visual',
    themeSubtitle:
      'Por ahora Claro y Oscuro. Más temas llegarán próximamente.',
    themes: {
      light: 'Claro',
      dark: 'Oscuro',
    },
    currencyTitle: 'Moneda de visualización',
    currencySubtitle:
      'Convierte los valores mostrados entre Euros y Dólares.',
    currencies: {
      EUR: 'Euros (€)',
      USD: 'Dólares ($)',
    },
    rateLabel: 'Tipo de cambio (1 € = USD)',
    rateHint: 'Conversión local sin conexión para mostrar importes en $.',
  },
  dashboard: {
    eyebrow: 'PANEL DE CARTERA',
    title: 'Gráficas Generales',
    sourceLabel: 'Fuente de valoración',
    coverageNote: (covered, total) => `${covered}/${total} fichas con precio`,
    kpiValue: 'Valor de Cartera',
    kpiValueRecord: (val) => `Récord: ${val}`,
    kpiCost: 'Inversión Total',
    kpiCostSub: 'Incl. envíos',
    kpiProfit: 'Plusvalía Neta',
    kpiProfitRecord: (val) => `Récord: ${val}`,
    kpiRoi: 'Rentabilidad (ROI)',
    kpiRoiSub: 'Sobre coste total',
    evolutionTitle: 'Evolución: Valor vs Inversión',
    evolutionSubtitle: 'Comparativa diaria de cartera',
    legendValue: 'Cotización',
    legendCost: 'Inversión',
    noChartData: 'Sin datos históricos suficientes para esta fuente.',
    rankingsTabs: {
      topValue: 'Top 10 Valor',
      topGain: 'Mayor Profit',
      topLoss: 'Mayor Pérdida',
      roiBuckets: 'Tramos ROI',
    },
    purchaseLabel: (costStr) => `Compra ${costStr}`,
    noLossCards: 'Sin cartas en pérdida actualmente.',
    noGainCards: 'Sin cartas en ganancia actualmente.',
    zeroCostBucketNote: (count) =>
      `${count} ${count === 1 ? 'carta sin coste registrado (0 €)' : 'cartas sin coste registrado (0 €)'}`,
    tapHint: 'Toca cualquier carta para ver su ficha y gráfica individual',
    rangeLabels: {
      '7d': '7D',
      '30d': '30D',
      all: 'Todo',
    },
    categories: {
      all: 'Todas (12)',
      evolution: 'Evolución (3)',
      rankings: 'Top & ROI (4)',
      periods: 'Temporal (2)',
      indices: 'Índices (3)',
    },
    sections: {
      evolution: 'TENDENCIA DIARIA DE CARTERA',
      rankings: 'RANKINGS Y DISTRIBUCIÓN',
      periods: 'BALANCE POR SEMANAS Y MESES',
      indices: 'ÍNDICES DE MERCADO (CARDMARKET)',
    },
    modeActiveStore: 'Tienda',
    modeMultiStore: '5 Tiendas',
    modeUnit: 'Unitario',
    modeTotal: 'Total',
    profitTitle: 'Evolución del Beneficio Neto',
    profitSubtitle: 'Plusvalía acumulada y récord',
    profitPeakRef: (peakStr) => `Récord del tramo: ${peakStr}`,
    roiTitle: 'Evolución del ROI (%)',
    roiSubtitle: 'Rentabilidad porcentual diaria',
    top20Title: 'Top 20 Cartas Más Valiosas',
    top20Subtitle: 'Desglose de inversión y plusvalía',
    legendProfit: 'Plusvalía',
    roiDistTitle: 'Distribución de Rentabilidad (ROI %)',
    roiDistSubtitle: 'Número de fichas por tramo de retorno',
    topGainTitle: 'Top 10 Mayor Plusvalía',
    topGainSubtitle: 'Mayores ganancias acumuladas',
    topLossTitle: 'Top 10 Mayor Pérdida',
    topLossSubtitle: 'Cartas actualmente bajo coste',
    weeklyTitle: 'Plusvalía Últimas 20 Semanas',
    weeklySubtitle: 'Instantánea semanal (domingos)',
    monthlyTitle: 'Plusvalía Últimos 20 Meses',
    monthlySubtitle: 'Evolución a cierre mensual',
    minLabel: (val) => `Mín ${val}`,
    maxLabel: (val) => `Máx ${val}`,
    currentLabel: (val) => `Actual ${val}`,
    indicesCollectTitle: 'Selectivos de Coleccionismo',
    indicesCollectSubtitle: 'Variación % acumulada vs Sem. 06/09',
    indicesActiveTitle: 'Selectivos de Juego Activo',
    indicesActiveSubtitle: 'Commander Blue Chips vs Fetchlands 10',
    indicesCompositeTitle: 'Índice MTG Composite (Base 100)',
    indicesCompositeSubtitle: 'Referencia agregada semanal',
    indexNormalizedLabel: 'Base 100 (%)',
    indexDualLands: 'Dual Lands 10',
    indexPowerNine: 'Power Nine',
    indexRlStaples: 'Reserved List',
    indexCommander: 'Commander BC',
    indexFetchlands: 'Fetchlands 10',
    indexComposite: 'MTG Composite',
    ptsUnit: 'pts',
  },
};

const EN: Translations = {
  tabs: {
    collection: 'Collection',
    charts: 'Charts',
  },
  common: {
    settings: 'Settings',
    close: 'Close',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving…',
    edit: 'Edit',
    delete: 'Delete',
    retry: 'Retry',
    zeroCost: 'Zero cost',
    copySingular: 'copy',
    copyPlural: 'copies',
    recordSingular: 'entry',
    recordPlural: 'entries',
    allRange: 'All',
    loadingCollection: 'Loading collection…',
    dbOpenError: 'Could not open local database.',
    loadErrorTitle: 'Load error',
  },
  header: {
    eyebrowCollection: (currency) => `MY COLLECTION · ${currency}`,
    investmentMeta: (investmentStr, copies, records) =>
      `Invested ${investmentStr} · ${copies} ${copies === 1 ? 'copy' : 'copies'} (${records} ${records === 1 ? 'entry' : 'entries'})`,
    showingCount: (count) => `Showing ${count}`,
  },
  search: {
    placeholder: 'Search card (EN/ES), set, # or deck…',
    clearLabel: 'Clear search',
    sortModalTitle: 'Sort collection',
    sortLabel: (shortLabel) => `↕ ${shortLabel}`,
    filters: {
      all: 'All',
      gain: 'Gain',
      loss: 'Loss',
      zeroCost: 'Zero cost',
    },
    sorts: {
      value: { label: 'Highest total value', shortLabel: 'Value ↓' },
      profit: { label: 'Highest profit', shortLabel: 'Profit ↓' },
      loss: { label: 'Biggest loss', shortLabel: 'Loss ↓' },
      roi: { label: 'Highest ROI (%)', shortLabel: 'ROI % ↓' },
      name: { label: 'Name (A–Z)', shortLabel: 'A–Z' },
      date: { label: 'Most recent purchase', shortLabel: 'Recent' },
    },
  },
  empty: {
    collectionTitle: 'Your collection is empty',
    collectionSubtitle: 'Tap the + button to add your first card.',
    noResultsTitle: 'No matches',
    noResultsSubtitle: 'No cards match your current search or filter.',
    clearFilters: 'Clear filters',
  },
  toasts: {
    added: (name) => `Added "${name}"`,
    updated: (name) => `Updated "${name}"`,
    deleted: (name) => (name ? `Deleted "${name}"` : 'Card deleted'),
  },
  quickAdd: {
    eyebrow: 'NEW CARD',
    title: 'Add to collection',
    nameEsLabel: 'Spanish Name (ES)',
    nameEsPlaceholder: 'Optional if identical to English name',
    nameEnLabel: 'English Name (EN) *',
    nameEnPlaceholder: 'e.g. Serra Angel or Demonic Tutor',
    setCodeLabel: 'Set code *',
    collectorLabel: 'Collector #',
    collectorPlaceholder: 'e.g. 40',
    setNameLabel: 'Set name (optional)',
    setNamePlaceholder: 'e.g. Revised Edition',
    conditionLabel: 'Condition',
    languageLabel: 'Card language',
    quantityLabel: 'Quantity',
    unitCostLabel: 'Unit cost (€)',
    shippingLabel: 'Shipping (€)',
    marketPriceLabel: 'Market today (€)',
    purchaseDateLabel: 'Purchase date',
    deckLabel: 'Deck / Binder',
    deckPlaceholder: 'e.g. RL Binder',
    orderIdLabel: 'Order ID (optional)',
    orderIdPlaceholder: 'e.g. 1106877908',
    previewCost: 'Total cost',
    previewValue: 'Total value',
    previewProfit: 'Profit',
    submitButton: 'Save card',
    errMissingName: 'Please enter a card name.',
    errMissingSet: 'Please enter a set code (e.g. 3ED, 2ED, ARN).',
    errSaveFailed: 'Could not save the card to SQLite.',
    eurBaseHint: 'Entered amounts are stored in base EUR (€).',
  },
  detail: {
    currentValue: 'Value today',
    investment: 'Total cost',
    profit: 'Profit',
    condition: 'Condition',
    language: 'Language',
    quantity: 'Quantity',
    unitCost: 'Unit cost',
    shipping: 'Shipping',
    marketUnit: 'Market (unit)',
    purchaseDate: 'Purchase date',
    orderId: 'Order ID',
    deck: 'Deck / Binder',
    cardId: 'Entry ID',
    storePricesTitle: 'Prices by store (unit)',
    storePricesHint: 'Tap to switch chart',
    chartTitle: (source) => `History · ${source}`,
    chartNoData: 'No price history available for this source.',
    chartSingleRecord: '1 recorded point',
    chartMinMax: (minStr, maxStr) => `Min ${minStr} · Max ${maxStr}`,
    chartCostRef: (costStr) => `--- Dashed line: your unit cost (${costStr})`,
    deleteConfirmTitle: 'Delete card',
    deleteConfirmBody: (name, setCode) =>
      `Are you sure you want to delete "${name}" (${setCode}) from your collection?`,
    errDelete: 'Could not delete the card.',
    errUpdate: 'Could not save changes.',
    errMissingRequired: 'Card name and set code are required.',
    nameEsEdit: 'Spanish Name (ES)',
    nameEnEdit: 'English Name (EN) *',
    setCodeEdit: 'Set code *',
    setNameEdit: 'Set name',
    optional: 'Optional',
  },
  settings: {
    eyebrow: 'PREFERENCES',
    title: 'Settings',
    languageTitle: 'Language',
    languageSubtitle:
      'Changes both the app interface and card names (Spanish / English).',
    languages: {
      es: 'Español',
      en: 'English',
    },
    themeTitle: 'Appearance',
    themeSubtitle: 'Light and Dark available now. More themes coming soon.',
    themes: {
      light: 'Light',
      dark: 'Dark',
    },
    currencyTitle: 'Display currency',
    currencySubtitle: 'Converts displayed values between Euros and US Dollars.',
    currencies: {
      EUR: 'Euros (€)',
      USD: 'US Dollars ($)',
    },
    rateLabel: 'Exchange rate (1 € = USD)',
    rateHint: 'Local offline rate used to display amounts in USD.',
  },
  dashboard: {
    eyebrow: 'PORTFOLIO OVERVIEW',
    title: 'Portfolio Charts',
    sourceLabel: 'Valuation source',
    coverageNote: (covered, total) => `${covered}/${total} entries priced`,
    kpiValue: 'Portfolio Value',
    kpiValueRecord: (val) => `Peak: ${val}`,
    kpiCost: 'Total Invested',
    kpiCostSub: 'Incl. shipping',
    kpiProfit: 'Net Profit',
    kpiProfitRecord: (val) => `Peak: ${val}`,
    kpiRoi: 'Return (ROI)',
    kpiRoiSub: 'On total cost',
    evolutionTitle: 'Evolution: Value vs Invested',
    evolutionSubtitle: 'Daily portfolio comparison',
    legendValue: 'Market Value',
    legendCost: 'Invested Cost',
    noChartData: 'Not enough historical points for this source.',
    rankingsTabs: {
      topValue: 'Top 10 Value',
      topGain: 'Top Profit',
      topLoss: 'Top Loss',
      roiBuckets: 'ROI Buckets',
    },
    purchaseLabel: (costStr) => `Cost ${costStr}`,
    noLossCards: 'No losing cards right now.',
    noGainCards: 'No winning cards right now.',
    zeroCostBucketNote: (count) =>
      `${count} ${count === 1 ? 'card with zero recorded cost (€0)' : 'cards with zero recorded cost (€0)'}`,
    tapHint: 'Tap any card to open its detail sheet and price chart',
    rangeLabels: {
      '7d': '7D',
      '30d': '30D',
      all: 'All',
    },
    categories: {
      all: 'All (12)',
      evolution: 'Trends (3)',
      rankings: 'Top & ROI (4)',
      periods: 'Weekly/Mo (2)',
      indices: 'Indices (3)',
    },
    sections: {
      evolution: 'DAILY PORTFOLIO TRENDS',
      rankings: 'RANKINGS & RETURN DISTRIBUTION',
      periods: 'WEEKLY & MONTHLY PROFIT',
      indices: 'MARKET INDICES (CARDMARKET)',
    },
    modeActiveStore: 'Active',
    modeMultiStore: '5 Stores',
    modeUnit: 'Per unit',
    modeTotal: 'Total',
    profitTitle: 'Net Profit Evolution',
    profitSubtitle: 'Cumulative gain and peak record',
    profitPeakRef: (peakStr) => `Range peak: ${peakStr}`,
    roiTitle: 'ROI (%) Evolution',
    roiSubtitle: 'Daily return percentage trend',
    top20Title: 'Top 20 Most Valuable Cards',
    top20Subtitle: 'Cost basis and net profit breakdown',
    legendProfit: 'Profit',
    roiDistTitle: 'Return Distribution (ROI %)',
    roiDistSubtitle: 'Entry count per ROI bucket',
    topGainTitle: 'Top 10 Highest Profit',
    topGainSubtitle: 'Top performing positions',
    topLossTitle: 'Top 10 Biggest Loss',
    topLossSubtitle: 'Positions currently below cost',
    weeklyTitle: 'Profit Last 20 Weeks',
    weeklySubtitle: 'Weekly snapshots (Sundays)',
    monthlyTitle: 'Profit Last 20 Months',
    monthlySubtitle: 'Month-end profit evolution',
    minLabel: (val) => `Min ${val}`,
    maxLabel: (val) => `Max ${val}`,
    currentLabel: (val) => `Latest ${val}`,
    indicesCollectTitle: 'Collectibles Market Indices',
    indicesCollectSubtitle: 'Cumulative % change vs Sep 06',
    indicesActiveTitle: 'Active Play Market Indices',
    indicesActiveSubtitle: 'Commander Blue Chips vs Fetchlands 10',
    indicesCompositeTitle: 'MTG Composite Index (Base 100)',
    indicesCompositeSubtitle: 'Weekly aggregated benchmark',
    indexNormalizedLabel: 'Base 100 (%)',
    indexDualLands: 'Dual Lands 10',
    indexPowerNine: 'Power Nine',
    indexRlStaples: 'Reserved List',
    indexCommander: 'Commander BC',
    indexFetchlands: 'Fetchlands 10',
    indexComposite: 'MTG Composite',
    ptsUnit: 'pts',
  },
};

/**
 * Returns the UI translation dictionary for the requested language.
 *
 * @param language Active language code (`'es'` | `'en'`).
 * @returns Strongly typed {@link Translations} dictionary.
 */
export function getTranslations(language: AppLanguage): Translations {
  return language === 'en' ? EN : ES;
}

