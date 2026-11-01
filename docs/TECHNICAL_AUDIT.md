# Auditoría técnica — AgroLocal, etapa 1

Fecha: 1 de noviembre de 2026. Alcance: copia local, saneamiento autorizado y verificaciones sin escritura en bases remotas. Estado: **APTO CON OBSERVACIONES para preparar un repositorio privado; no validado para producción.**

## Resumen ejecutivo

Conviene continuar con este código. React/TypeScript/TanStack Start, Supabase/PostgreSQL, Drizzle y Tailwind se conservan. RLS, funciones transaccionales y bloqueos de stock son una base adecuada para el marketplace; requieren pruebas reales aisladas antes de uso comercial.

La etapa 1 protege archivos locales y entradas E2E, documenta instalación/arquitectura y agrega verificación TypeScript ampliada. No cambia fórmulas, permisos de negocio, landing, migraciones históricas ni configuración remota de Lovable. No se inició la implementación de etapa 2.

No se inicializó Git ni se crearon commits/remotos. Hay metadatos y dependencias de Lovable, pero no `.git`, por lo que no se puede confirmar historia o sincronización activa. No se ejecutaron migraciones ni E2E remotos.

## Método y límites

Se revisaron AGENTS, README, package/lockfile, configuración de Vite/Nitro/Vitest/TypeScript/ESLint, schema y migraciones `0000–0009`, autenticación, acceso Supabase, rutas públicas/privadas, almacenamiento, stock y scripts de prueba. Se compararon hashes anteriores/posteriores y se ejecutaron verificaciones locales.

El análisis es estático más unitarias/compilación. No inspecciona el historial Git ausente, el estado remoto de RLS, roles reales, migraciones aplicadas, buckets ni entrega de correo. No incluye prueba de penetración, carga o auditoría completa de vulnerabilidades de dependencias. Los resultados históricos de `PHASE3-VERIFICATION.md` son antecedentes, no pruebas repetidas ahora.

## Hallazgos y gravedad

No se confirmó un hallazgo CRÍTICO en el alcance local. No implica ausencia de vulnerabilidades desconocidas.

| ID       | Gravedad | Hallazgo y evidencia                                                                                                                               | Estado                                                                                                                     |
| -------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| SEC-01   | ALTO     | `.gitignore` no excluía `.env` ni variantes; faltaba plantilla.                                                                                    | Corregido en etapa 1. `.env` existente preservado.                                                                         |
| SEC-02   | ALTO     | `0001_bootstrap_platform_admin.sql` concede rol admin cuando un correo fijo está confirmado.                                                       | Pendiente etapa 2. No es una concesión a cualquier correo ni sin confirmación. Depende de la cuenta y de Auth remoto.      |
| DATA-01  | ALTO     | `0000` exige valores positivos y peso por bolsa, pero no consistencia entre cantidad original, factor y `quantity_kg`.                             | Pendiente validación SQL, diagnóstico de filas previas y regresiones.                                                      |
| DOC-01   | ALTO     | Insertar metadatos de análisis/ficha activa `documented` sin comprobar objeto Storage; quitar respaldo no recalcula estado.                        | Pendiente etapa 2. No se borraron/reclasificaron documentos actuales.                                                      |
| TEST-01  | ALTO     | E2E usaban credenciales generales sin exigir destino aislado.                                                                                      | Barrera local agregada a ambas entradas antes de crear clientes. Aislamiento real sigue requiriendo confirmación humana.   |
| RPC-01   | MEDIO    | `0002` revoca ejecución a `anon`, no a `PUBLIC`.                                                                                                   | Pendiente matriz de privilegios efectivos; las funciones tienen además controles internos. No se demostró escalada remota. |
| STOCK-01 | MEDIO    | Propuesta bloquea oportunidad/publicación/operación; acción bloquea operación y luego publicación.                                                 | Riesgo de interbloqueo pendiente de reproducción y corrección aislada. No se observó pérdida de stock.                     |
| MATCH-01 | MEDIO    | `match_pairs` compara precios sin normalizar unidad; parte del ranking no exige moneda igual.                                                      | Pendiente etapa 2.                                                                                                         |
| AUDIT-01 | MEDIO    | `set_opportunity_status` usa `o.status` para el evento después de actualizar `o`.                                                                  | Pendiente corregir `from_status` de eventos futuros sin reescribir historia.                                               |
| AUTH-01  | MEDIO    | Existe registro/login/logout y barrera de sesión; no hay recuperación de contraseña en interfaz.                                                   | Pendiente separado. Registro, confirmación por email y retorno real no verificados ahora.                                  |
| DB-01    | MEDIO    | `drizzle/schema.ts` y snapshots vacíos; SQL tiene el modelo real. Buckets no se crean/configuran íntegramente en migraciones.                      | Documentado; no usar `drizzle-kit push` ni inferir despliegue completo.                                                    |
| TEST-02  | MEDIO    | Limpieza E2E no comprueba todos los resultados; el E2E general no retira su archivo de `company-docs`. El modo fixture conserva sesiones/recursos. | Documentado. Se agregó salida no cero ante aserciones fallidas del E2E general; no se ejecutó.                             |
| MAINT-01 | BAJO     | README genérico, sin `typecheck`; generados fuera de los ignores de herramientas.                                                                  | Corregido/documentado en etapa 1.                                                                                          |
| MAINT-02 | BAJO     | Deuda de formato, `any`, componente/ruta extensos y errores ignorados en algunas consultas.                                                        | Pendiente por lotes; reglas no desactivadas.                                                                               |
| SCALE-01 | MEDIO    | Mercado obtiene hasta 500 filas y filtra en navegador.                                                                                             | Pendiente paginación/filtros SQL y medición; no cambiar interfaz en esta etapa.                                            |

La gravedad describe el impacto potencial, no incidentes remotos confirmados. `STOCK-01` se considera MEDIO hasta reproducir impacto en disponibilidad.

## Correcciones realizadas y archivos

Archivos existentes modificados:

- `.gitignore`: env y variantes, secretos comunes, fixtures/sesiones y generados locales; excepción para `.env.example`.
- `.prettierignore`: configuración sensible, auditoría local y generados fuera de formato automático.
- `eslint.config.js`: exclusiones de archivos generados/locales; se mantienen reglas de calidad y formato.
- `package.json`: script `typecheck`, sin cambios de dependencias.
- `README.md`: instalación con Bun/lockfile, variables, arquitectura, comandos, E2E, Supabase, Lovable y estado real.
- `scripts/e2e/agrolocal_e2e.ts`: preflight antes de clientes y salida no cero ante aserciones fallidas.
- `scripts/e2e/phase3.ts`: mismo preflight y anotación de tipo `string[]` en IDs, sin cambio de comportamiento comercial.

Archivos nuevos:

- `.env.example`: nombres y placeholders vacíos; secretos opcionales comentados, sin valores reales.
- `tsconfig.scripts.json`: verificación estricta sin emisión para scripts y configuración Drizzle.
- `scripts/e2e/safety.ts`: preflight sin red, variables exclusivas E2E, confirmación de aislamiento/origen, bloqueo de proyecto vinculado y backend de aplicación.
- `src/test/e2e-safety.test.ts`: 17 casos locales de preflight con placeholders, sin clientes ni peticiones Supabase.
- `docs/TECHNICAL_AUDIT.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/PHASE2_PROPOSALS.md`.

Se conservaron sin cambios `bun.lock`, `.env`, `AGENTS.md`, `vite.config.ts`, `.lovable/`, `supabase/config.toml`, `drizzle/schema.ts`, todo el historial/meta de Drizzle y todo el código de aplicación previo de `src/` (incluida la landing). `src/test/e2e-safety.test.ts` es la única adición en `src/`.

Los logs/baseline están en `.audit.local/`, excluido de Git. Los builds generados quedan en `.output/` y otros directorios ignorados.

## Protección E2E y límites

Ambas entradas llaman a `requireIsolatedE2EConfig()` antes de `createClient`. Exigen `E2E_SUPABASE_URL`, claves públicas/administrativas exclusivas E2E, `E2E_ISOLATED_DATABASE=true` y `E2E_CONFIRMED_URL` del mismo origen. No hay fallback a claves generales. Se rechazan el identificador vinculado de `supabase/config.toml`, los orígenes de aplicación configurados, URL con credenciales/path/query/fragment, HTTP remoto y configuración incompleta.

El preflight es una defensa contra errores accidentales, no una frontera contra alguien que modifica el código o declara falsamente aislamiento. No prueba qué datos contiene el destino ni identifica todo alias DNS del backend real. Tampoco prueba el funcionamiento de las regresiones SQL. No se ejecutaron los entrypoints E2E; se probaron únicamente las funciones de validación sin red.

## Resultados de verificaciones

Dependencias instaladas previamente con `bun install --frozen-lockfile` (540 paquetes). No fue necesario reinstalar ni actualizar dependencias en etapa 1. Bun 1.4.3, Node 24.21.0.

| Verificación                                            | Resultado                            | Alcance                                                                                                                     |
| ------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Unitarias iniciales                                     | PASS, 17/17; 3 archivos              | Pruebas existentes de dominio, operaciones y coincidencia de ruta.                                                          |
| Unitarias finales, `bun run test`                       | PASS, 34/34; 4 archivos              | Incluye 17 casos del preflight E2E sin red.                                                                                 |
| TypeScript original                                     | PASS                                 | Aplicación y configuración incluidas en `tsconfig.json`.                                                                    |
| `bun run typecheck` ampliado                            | PASS                                 | Aplicación más todos los scripts y `drizzle.config.ts`. Detectó y corrigió únicamente el tipo del arreglo de IDs en fase 3. |
| Build inicial/final, `bun run build`                    | PASS                                 | Build de producción Nitro/Cloudflare; sin deploy ni migraciones.                                                            |
| ESLint inicial                                          | FAIL: 2.215 errores y 9 advertencias | 2.192 formato, 22 `no-explicit-any`, 1 `prefer-const`; 9 advertencias React Refresh.                                        |
| ESLint final, `bun run lint`                            | FAIL: 2.214 errores y 9 advertencias | 2.191 formato, 22 `no-explicit-any`, 1 `prefer-const`; mismas 9 advertencias.                                               |
| ESLint de helper, pruebas nuevas y configuración ESLint | PASS                                 | Sin errores ni advertencias en esos archivos. No se ocultó deuda de otros módulos.                                          |
| Migraciones SQL y metadatos                             | Hashes conservados                   | Comparación con baseline de etapa 1; no prueba del despliegue remoto.                                                       |
| `bun.lock`, `.env` y código previo de aplicación        | Hashes conservados                   | Sin actualizaciones de dependencias, credenciales ni lógica comercial.                                                      |
| E2E backend                                             | NO EJECUTADOS                        | Falta base aislada confirmada; escriben y borran datos.                                                                     |
| Correo, roles y Storage remotos                         | NO VERIFICADOS                       | Requieren entorno/cuentas autorizados.                                                                                      |

Se conserva el aviso informativo de `vite-tsconfig-paths`: el plugin Lovable lo incluye y no se alteró esa integración para eliminar un aviso. No impide compilar.

## Secretos y archivos candidatos a Git

El escaneo local por patrones no detectó claves privadas, JWT completos, tokens GitHub/AWS, claves secretas Supabase con formato de credencial real ni conexiones PostgreSQL con contraseña en archivos candidatos. Esto no sustituye revisión manual ni un escáner de secretos en CI. Los placeholders de pruebas no son credenciales reales.

`.env` contiene configuración pública Supabase, sin variables de secreto de servidor no vacías; sus valores no se imprimieron ni se copiaron a documentos. No hay evidencia local que requiera rotación. No se puede descartar una exposición histórica fuera de esta copia sin Git.

Se inspeccionaron los 40 bundles JavaScript públicos del build: no contienen los nombres de variables de secreto de servidor revisados. El texto literal `sb_secret_` aparece como reconocimiento de prefijo en el helper público existente, no como credencial completa. Esto comprueba el build actual, no configuraciones futuras con secretos mal prefijados como `VITE_`.

Las reglas de ignore se verificaron con el parser local `ignore` (usado por las herramientas): `.env` y variantes, dependencias, outputs, fixtures, claves y auditoría quedan excluidos; `.env.example`, lockfile, README y metadatos Lovable quedan disponibles. No se usó `git check-ignore` porque no hay repositorio inicializado; habrá que confirmar con Git al recuperar/crear el repositorio.

## Pendientes y criterio de GitHub

**APTO CON OBSERVACIONES** para preparar el repositorio privado `AgroLocal`: credenciales locales excluidas, plantilla/documentación presentes, lockfile conservado y pruebas/build/TypeScript correctos. ESLint sigue rojo; una política que exija todas las verificaciones verdes impide considerar el repositorio listo para ese gate. La etapa 2 comercial y de seguridad está pendiente; no es aprobación para producción.

Recomendación: continuar incrementalmente, corregir deuda lint por cambios revisables, confirmar aislamiento E2E y validar las propuestas antes de escribir/aplicar correcciones SQL. No migrar frameworks ni reescribir el producto.

## Primer commit: pasos manuales futuros (no ejecutados)

1. Confirmar si Lovable ya está enlazado a un repositorio. Si existe, recuperar/clonar ese repositorio y conservar historia/remoto; no inicializar encima ni forzar un push. Revisar el saneamiento contra esa copia antes de llevarlo allí.
2. Solo si se confirma que no existe repositorio previo y se autoriza su creación, crear el repositorio privado `AgroLocal` y ejecutar localmente `git init -b main`.
3. Revisar candidatos sin agregarlos: `git status --short --ignored` y `git add --dry-run .`. Comprobar que no aparecen `.env`, claves, fixtures, dependencias ni outputs.
4. Ejecutar las cuatro verificaciones de README. Aceptar expresamente la deuda lint o corregirla antes de exigir un gate verde; no usar opciones para ignorar fallos.
5. Solo después de la revisión, preparar el índice con `git add .`; revisar `git diff --cached --name-only`, `git diff --cached --check` y el contenido de `git diff --cached`. La única plantilla env admisible es `.env.example`.
6. Ejecutar el primer commit únicamente cuando se autorice: `git commit -m "Prepare AgroLocal for private repository"`.
7. Conectar/subir al repositorio privado requiere autorización posterior y verificación de la integración Lovable; no se configuró ni ejecutó en esta etapa.

## Referencias técnicas

- [Supabase: claves públicas y secretas](https://supabase.com/docs/guides/getting-started/api-keys).
- [Supabase: permisos de funciones y SECURITY DEFINER](https://supabase.com/docs/guides/database/functions).
- [PostgreSQL: bloqueos e interbloqueos](https://www.postgresql.org/docs/current/explicit-locking.html).

Estas referencias apoyan criterios generales. Los hallazgos específicos se derivan del código local y las verificaciones descritas.
