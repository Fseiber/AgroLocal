# Consistencia de cantidades — implementación local

Fecha de referencia: 2 de noviembre de 2026. Demo prevista: 3 de noviembre. **0011 está preparada, no aplicada a ningún backend.** No hubo escrituras ni lecturas de datos de producción, commits o push.

## Reglas

Se conservan `kg`, `qq` (100 kg), `t` (1.000 kg), `bolsa` y `big_bag`. Cantidad y peso usado deben ser positivos y finitos. El total de ofertas y demandas debe coincidir con la multiplicación decimal redondeada a tres decimales; no se reemplaza silenciosamente un total contradictorio.

`original_quantity` se expresa en `original_unit`. `unit_count` cuenta envases, es opcional y no se infiere de una cantidad de masa: 2,5 t pueden describirse como 100 envases de 25 kg. Si está informado, requiere peso y coherencia con el total; en bolsa/big bag debe coincidir con la cantidad original. Se conservan fracciones de envase admitidas por el modelo actual.

`presentation` y `price_unit` siguen siendo conceptos distintos de la unidad de cantidad. Un peso adicional en una publicación en toneladas no cambia el factor 1.000. No se cambia cálculo de precio, comisión ni cotización de monedas.

Los mínimos opcionales deben ser positivos, finitos y no superiores al total. Los contadores de stock siguen protegidos por los triggers existentes. `released_kg` es acumulativo: no se limita al total publicado.

## Backend

`drizzle/migrations/0011_quantity_consistency.sql` agrega cuatro funciones puras `SECURITY INVOKER` y ocho restricciones en siete tablas:

- Ofertas/demandas: consistencia de unidad, cantidad, peso, total, conteo y mínimos.
- Ofertas: finitud de contadores de stock.
- Oportunidades, movimientos y entregas: kg positivos y finitos.
- Operaciones/versiones: cantidad de términos positiva y finita; se conservan cadenas numéricas aceptadas por las RPC actuales.
- Operaciones: contadores finitos y no negativos, sin reescribir sus valores.

Las operaciones ya expresadas en kg conservan su precisión histórica; no se fuerzan al total del lote ni se redondean términos aceptados. Las firmas y cuerpos de `request_quote`, `apply_stock_movement`, `propose_operation` y `operation_action` no se modifican.

Las funciones se conceden explícitamente a los roles necesarios para evaluar restricciones; no leen datos ni omiten RLS. No se agregan columnas, defaults ni dependencias. Los metadatos siguen la estructura vacía preexistente de Drizzle: no constituyen una reconstrucción del esquema declarativo.

## Redondeo

`src/lib/decimal-quantity.ts` multiplica coeficientes decimales con BigInt y redondea empates positivos hacia arriba, conforme a `round(numeric,3)`. Trabaja con la representación decimal que JSON enviaría, evitando el producto binario de JavaScript. Si el resultado no puede serializarse fielmente como número, se rechaza; no se inventa un máximo comercial.

Los 13 vectores de `src/test/quantity-cases.ts` son compartidos por unitarias y la regresión PostgreSQL preparada: cinco unidades, envases fraccionarios, redondeo al gramo, empate, producto decimal y notación científica. Las unitarias verifican los resultados esperados y entradas inválidas. **No se afirma equivalencia empírica con una instancia PostgreSQL: la comparación real todavía no se ejecutó.**

## Diagnóstico de datos previos

`scripts/sql/check_quantity_consistency.sql` contiene dos consultas de solo lectura, independientes de los helpers de 0011. Incluyen demos, publicaciones, cantidades de operaciones/versiones, movimientos, entregas y referencias a acuerdos vinculados.

No se ejecutó contra una base real. Los ejemplos demo del SQL histórico son compatibles; eso no permite afirmar que producción esté limpia. La consulta debe correrse con visibilidad autorizada completa, no solo filas públicas o visibles por RLS a un usuario común.

Las representaciones numéricas extremas se señalan para revisión manual en vez de arriesgar overflow durante el diagnóstico. Una fila señalada para revisión no implica necesariamente que deba corregirse. No se incluyen datos de contacto ni credenciales en la salida.

## Aplicación posterior: autorización independiente

1. Confirmar backup, destino y responsable; probar primero en una copia aislada completa.
2. Ejecutar el diagnóstico de solo lectura y revisar todos sus resultados.
3. Si hay contradicciones, determinar qué dato es verdadero: cantidad original, peso, conteo o kg. No actualizar stock ni acuerdos automáticamente.
4. Probar instalación limpia y actualización con datos existentes. Una fila incompatible debe impedir la aplicación, conservando el estado anterior mediante rollback.
5. Aplicar 0011 solo con un ejecutor transaccional y manejo de errores. Drizzle instalado usa una transacción para las migraciones PostgreSQL; debe comprobarse también el ejecutor real de Lovable antes del despliegue. No pegar sentencias individuales en producción.
6. Los CHECK validan datos existentes. No se usa NOT VALID para esconder inconsistencias que podrían bloquear actualizaciones posteriores. Evaluar tiempos de bloqueo según tamaño de tablas.
7. Validar publicación → cotización → propuesta → reserva → entrega → recepción → liberación en el aislado y recién entonces evaluar autorización remota.

**Para la demo no hace falta aplicar 0011.** El backend de presentación sigue intacto. Los cambios de cliente son puntuales: conversión decimal común, rechazo de valores inválidos, mínimo de demanda coherente y cotizaciones con fracciones de kg (antes se redondeaban a kg enteros). El total mostrado no cambia el diseño ni el circuito de estados.

## Pruebas y resultados

- Unitarias: **65/65**, cinco archivos. Las 34 previas siguen pasando; se agregan 31 casos.
- TypeScript: aplicación y scripts **aprobados**.
- Build de producción: **aprobado**, sin deploy.
- ESLint de los cuatro archivos nuevos TypeScript: **aprobado**, sin errores ni advertencias.
- PostgreSQL/E2E: **no ejecutados**, no existe una base aislada confirmada en el entorno; tampoco se detectaron CLI psql/Docker disponibles.
- Histórico SQL 0000–0010, sus snapshots y lockfile: verificación por hashes antes/después. No se editaron credenciales ni definiciones de RPC históricas.
- La deuda ESLint previa del proyecto sigue siendo un pendiente separado; no se hizo un reformateo general.

## Regresión PostgreSQL preparada

`scripts/e2e/quantity-consistency.ts` utiliza la barrera existente de aislamiento y variables E2E independientes. Primero verifica que 0011 esté disponible, antes de crear fixtures; **no aplica migraciones**.

Prepara comparación TypeScript/PostgreSQL sobre los mismos vectores, pruebas directas de INSERT/UPDATE, conteos opcionales y masa frente a envases, mínimos, finitud SQL y recorrido de reserva/entrega/recepción idempotente/liberación. Comprueba conservación de precisión en versiones y denegación de cantidades inválidas en versiones/entregas. Solo limpia IDs creados por esa ejecución y comprueba errores de limpieza. No imprime sesiones, contraseñas ni claves.

Después de la autorización y configuración de una base aislada:

```sh
bun scripts/e2e/quantity-consistency.ts
```

El ensayo de migración sobre datos incompatibles y su rollback está preparado en scripts/sql/test_quantity_migration_rollback.sql para psql, contra una copia aislada ANTES de 0011. Exige confirmación explícita AGROLOCAL_QUANTITY_ISOLATED=true; inserta solo un fixture nuevo dentro de una transacción, espera el fallo de la migración y comprueba el rollback de sus helpers/restricciones. La transacción final se revierte. No se ejecutó. El E2E de API espera 0011 ya instalada y no certifica ese paso por sí solo.

## Riesgos pendientes

- Falta ejecución real de SQL, diagnóstico y diferencial; la sintaxis y el comportamiento de las restricciones no están certificados por un PostgreSQL en esta sesión.
- No se conoce cuántas filas históricas serían incompatibles. La migración no las corregirá y abortará ante ellas si se ejecuta transaccionalmente.
- Los campos numéricos del cliente continúan siendo JavaScript number: no se puede recuperar precisión perdida antes de convertir un texto a number.
- La validación del cliente no sustituye 0011: el backend remoto todavía conserva sus validaciones anteriores.
- Pruebas de RLS completas, concurrencia, documentos, matching económico y administración inicial siguen pendientes de sus propios alcances.

## Archivos de esta entrega

Modificados: README.md; docs/PHASE2_PROPOSALS.md; docs/ROADMAP.md; roadmap.md; drizzle/migrations/meta/_journal.json; src/lib/domain.ts; src/components/listing-form.tsx; src/components/quote-button.tsx; src/routes/_authenticated/panel.demandas.nueva.tsx.

Nuevos: este informe; drizzle/migrations/0011_quantity_consistency.sql; drizzle/migrations/meta/0011_snapshot.json; scripts/sql/check_quantity_consistency.sql; scripts/sql/test_quantity_migration_rollback.sql; scripts/e2e/quantity-consistency.ts; src/lib/decimal-quantity.ts; src/test/quantity-cases.ts; src/test/quantity-consistency.test.ts.
