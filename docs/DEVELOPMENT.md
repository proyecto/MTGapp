# Guía de Desarrollo, Pruebas y Documentación API

## Requisitos previos

- **Node.js** (LTS recomendado) y **npm**.
- **Expo Go** en dispositivo Android/iOS para pruebas rápidas, o **Development Build** (`npx expo run:android` / EAS) si se añaden módulos nativos personalizados.
- Este proyecto utiliza **Continuous Native Generation (CNG)**: no existen ni deben editarse manualmente carpetas `android/` o `ios/`. Cualquier ajuste nativo se declara en [`app.json`](../app.json).

---

## Comandos de desarrollo y verificación

```bash
# Instalar dependencias con resolución compatible con Expo SDK 58
npx expo install <paquete>

# Arrancar servidor Metro
npx expo start
npx expo start --android

# Comprobación estricta de tipos TypeScript (debe salir con 0 errores)
npx tsc --noEmit

# Linting (ESLint directo y envoltorio Expo)
npx eslint .
npx expo lint

# Exportación de prueba para verificar empaquetado completo del bundle Android
npx expo export --platform android --output-dir /tmp/mtg-export-check
```

---

## Generación automática de documentación (TSDoc / JSDoc)

Todos los módulos en [`App.tsx`](../App.tsx) y `src/**/*.ts(x)` están anotados con bloques estándar **TSDoc / JSDoc** (`@module`, `@param`, `@returns`, documentación de interfaces, propiedades y tipos exportados).

Puedes extraer un sitio web estático de documentación API o documentación en Markdown utilizando **TypeDoc** sin modificar la configuración del proyecto:

```bash
# Generar sitio HTML en docs/api/ (sin añadir dependencia fija si usas npx)
npx --yes typedoc \
  --entryPointStrategy expand \
  --out docs/api \
  --exclude "**/node_modules/**" \
  --skipErrorChecking \
  App.tsx src
```

Si prefieres integrarlo de forma permanente en `package.json`:

```bash
npm install --save-dev typedoc
```

---

## Convenciones y notas técnicas importantes

1. **Compatibilidad React Native `0.88` + React `19.3`**:
   - La propiedad `StyleSheet.absoluteFillObject` no forma parte de los tipos estrictos en RN `0.88`; para capas absolutas superpuestas (como en `VerticalBarChart`) usar coordenadas explícitas `{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }`.
   - La regla ESLint `react-hooks/set-state-in-effect` prohíbe llamar a `setState` de forma síncrona dentro de un `useEffect`. Para reiniciar estado al abrir un modal, se emplea `key` por sesión en [`App.tsx`](../App.tsx) junto con inicializadores perezosos en `useState(() => ...)` y reseteo explícito en manejadores de eventos (`handleStartEdit`).
2. **Identificadores SVG únicos**:
   - Cada instancia de `MultiSeriesLineChart` (y su adaptador `PriceEvolutionChart`) debe recibir un `gradientId` único globalmente dentro del árbol SVG montado (p. ej. `chart-portfolio-value`, `chart-portfolio-profit`, `chart-portfolio-roi`, `chart-index-collect`, `chart-index-active`, `chart-index-composite`, `priceAreaGrad`).
3. **Almacenamiento en EUR base**:
   - Nunca guardar importes ya multiplicados por el tipo de cambio en SQLite; la tabla `cards` y `card_price_series` operan exclusivamente en `EUR` para evitar deriva acumulada si el usuario ajusta el ratio `EUR → USD`.

