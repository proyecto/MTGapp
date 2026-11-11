# Interfaz Calm Paper, Temas e Internacionalización

## Sistema visual *Calm Paper*

Inspirado en **Things 3** y **Todoist**, el diseño prioriza la legibilidad financiera sin ruido visual:

- **Fondos cálidos / neutros**: `#F8F8F6` en modo claro y `#121417` en modo oscuro para evitar fatiga ocular y contrastar con las tarjetas limpias (`#FFFFFF` / `#1A1D22`).
- **Alineación tabular (`TABULAR_NUMS_STYLE`)**: todas las cifras monetarias, porcentajes, cantidades y fechas utilizan `fontVariant: ['tabular-nums']` para que las columnas de importes queden perfectamente alineadas.
- **Navegación inferior unificada (`BottomNavBar`)**: 3 accesos directos (`Colección`, `Gráficas`, `Configuración`) respetando los márgenes de área segura inferiores en Android/iOS.

---

## Extensibilidad del sistema de temas (`THEME_REGISTRY`)

Cada tema implementa íntegramente el contrato [`AppTheme`](../src/theme/tokens.ts) y se registra en `THEME_REGISTRY`.

### Pasos para añadir un nuevo tema (ej. `'sepia'` u `'oled'`)

1. **Declarar el identificador** en [`src/types/card.ts`](../src/types/card.ts):
   ```ts
   export type ThemeId = 'light' | 'dark' | 'sepia';
   ```
2. **Definir la paleta y registrarla** en [`src/theme/tokens.ts`](../src/theme/tokens.ts):
   ```ts
   export const SEPIA_THEME: AppTheme = { id: 'sepia', mode: 'light', ... };
   export const THEME_REGISTRY: Record<ThemeId, AppTheme> = {
     light: LIGHT_THEME,
     dark: DARK_THEME,
     sepia: SEPIA_THEME,
   };
   ```
3. **Añadir la traducción del nombre** en `settings.themes` dentro de [`src/i18n/translations.ts`](../src/i18n/translations.ts) para `ES` y `EN`.
4. [`SettingsModal`](../src/components/SettingsModal.tsx) leerá automáticamente `Object.keys(THEME_REGISTRY)` y renderizará la nueva pastilla con su muestra cromática sin modificar su JSX.

---

## Internacionalización bilingüe (`ES` / `EN`)

El sistema i18n ubicado en [`src/i18n/translations.ts`](../src/i18n/translations.ts) no solo traduce menús, etiquetas y ejes de gráficas:

- **`getCardPrimaryName(card, language)`** y **`getCardSecondaryName(card, language)`** conmutan dinámicamente el título visible de cada carta entre `nameEs` y `nameEn`.
- El algoritmo de ordenación alfabética (`createCardComparator('name', language)`) y la búsqueda (`normalizeSearchText`) respetan ambos nombres al mismo tiempo, permitiendo buscar una carta en inglés aunque la app esté en español y viceversa.

---

## Catálogo de componentes reutilizables

### Controles y formularios (`src/components/shared/`)

| Componente | Uso principal |
| :--- | :--- |
| [`ModalSheet`](../src/components/shared/ModalSheet.tsx) | Contenedor modal inferior estandarizado con `KeyboardAvoidingView`, cierre táctil en backdrop, cabecera personalizable y pie fijo. Reutilizado por `QuickAddCardModal`, `CardDetailModal` y `SettingsModal`. |
| [`SegmentedToggle`](../src/components/shared/FormControls.tsx) | Selector tipo cápsula para alternar vistas (`Tienda | 5 Tiendas`, `Unitario | Total`, `7D | 30D | Todo`). |
| [`ChipSelector`](../src/components/shared/FormControls.tsx) | Tira envolvente de chips seleccionables para estados físicos (`NM..PO`) e idiomas de carta (`EN..JP`). |
| [`FormField`](../src/components/shared/FormControls.tsx) | Campo etiquetado con bordes suaves, ancho flexible a 1 o 2 columnas (`halfWidth`) y numeración tabular opcional. |
| [`CardFormFields`](../src/components/shared/CardFormFields.tsx) | Bloque unificado de 14 campos de carta + factoría de inicialización (`createCardFormValues`) y validación (`buildCardPayload`). |

### Primitivos gráficos SVG (`src/components/charts/`)

| Componente | Capacidades principales |
| :--- | :--- |
| [`MultiSeriesLineChart`](../src/components/charts/MultiSeriesLineChart.tsx) | Múltiples series sólidas/discontinuas, relleno degradado bajo la serie principal, líneas de referencia horizontales, zoom temporal (`7d`/`30d`/`all`), leyenda dinámica y modo compacto adaptado para `PriceEvolutionChart`. |
| [`VerticalBarChart`](../src/components/charts/VerticalBarChart.tsx) | Columnas verticales con línea base cero automática para valores positivos/negativos, etiquetas superiores opcionales, eje adaptativo (completo en 8 barras ROI; muestreado en 5 hitos para 20 semanas/meses) y selección táctil por columna. |
| [`HorizontalRankingChart`](../src/components/charts/HorizontalRankingChart.tsx) | Filas numeradas interactivas con barras simples o apiladas (Coste + Profit/Déficit) y apertura directa de la ficha de carta. |

