# Documentación Técnica — MTG Vault

Bienvenido a la documentación de ingeniería de **MTG Vault**. Esta carpeta describe la arquitectura modular, los patrones de diseño empleados, las fórmulas financieras heredadas de la hoja de cálculo original, el sistema de diseño *Calm Paper* y las herramientas de validación y generación automática de documentación a partir del código fuente.

## Índice de documentos

| Documento | Contenido principal |
| :--- | :--- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Diagrama de capas, ciclo de vida SQLite, catálogo detallado de patrones (**Singleton**, **Adapter**, **Strategy**, **Registry**, **Factory**, **Repository Facade**) y optimizaciones algorítmicas (`O(log N)`). |
| [DATA_MODEL_AND_FORMULAS.md](DATA_MODEL_AND_FORMULAS.md) | Esquema relacional en SQLite (`app_meta`, `cards`, `card_price_series`), paridad de métricas financieras, conversión offline `EUR ↔ USD`, los 8 tramos ROI y el mapeo de las 12 gráficas analíticas. |
| [UI_AND_THEMES.md](UI_AND_THEMES.md) | Guía visual *Calm Paper*, extensión del `THEME_REGISTRY` para añadir nuevos temas, contrato bilingüe `ES/EN` y catálogo de componentes UI y gráficas SVG compartidas. |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Requisitos de Expo SDK 58 / Android, comandos de tipo/lint/exportación, generación de API Docs mediante **TypeDoc / JSDoc** y convenciones técnicas del repositorio. |

