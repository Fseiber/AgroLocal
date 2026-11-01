# AgroLocal

Marketplace B2B para la compraventa local de arroz con cáscara y elaborado en Argentina. Permite publicar ofertas y demandas, encontrar coincidencias por reglas y gestionar oportunidades y acuerdos entre empresas verificadas.

El proyecto nació en Lovable y conserva su integración y tecnologías. Está en desarrollo: compilar no equivale a tener los flujos comerciales o la configuración remota validados.

## Tecnologías

- React 19, TypeScript, TanStack Start/Router y TanStack Query.
- Tailwind CSS y componentes Radix.
- Supabase Auth, PostgreSQL con RLS/RPC y Storage privado sobre Lovable Cloud.
- Drizzle Kit/ORM para la integración existente de migraciones; el esquema declarativo está vacío y **no representa la base real**.
- Vite, Nitro, Bun, Vitest y ESLint.

## Instalación local

Se verificó este entorno con Node.js 24.21.0 y Bun 1.4.3 en Windows. Usá una versión de Node compatible con el Vite fijado en `bun.lock`. No cambies el gestor ni regeneres el lockfile durante la instalación.

```sh
bun install --frozen-lockfile
```

Copiá `.env.example` a `.env` y completá localmente los valores del backend autorizado:

```powershell
Copy-Item .env.example .env
```

Si ya existe `.env`, conservá su contenido: no lo sobrescribas. `.env` y sus variantes se excluyen de Git; solo se versiona la plantilla sin credenciales.

| Variables                                             | Uso                                                                                                                                       |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`  | URL y clave pública que recibe el navegador.                                                                                              |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`            | Configuración del cliente en servidor y middleware. Deben corresponder al mismo backend que el par público.                               |
| `SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PROJECT_ID`     | Identificadores públicos conservados por compatibilidad con Lovable.                                                                      |
| `SUPABASE_SERVICE_ROLE_KEY`                           | Secreto opcional del cliente administrativo de servidor. No es necesario para las pantallas actuales y nunca debe llevar prefijo `VITE_`. |
| `LOVABLE_DB_MIGRATION_URL`                            | Conexión PostgreSQL opcional para herramientas de migración; no es necesaria para iniciar la interfaz.                                    |
| `LOVABLE_CRON_SECRET`, `LOVABLE_CRON_SECRET_PREVIOUS` | Secretos opcionales del helper de cron existente; no se encontraron rutas que lo consuman actualmente.                                    |

Las claves publicables son públicas. Las claves secretas y `service_role` pueden omitir RLS y deben permanecer exclusivamente en entornos de servidor controlados. No pegues secretos en código, documentos ni commits.

```sh
bun run dev --host 127.0.0.1
```

El servidor muestra su dirección en consola; en este entorno utiliza `http://127.0.0.1:8080/`. Las lecturas y acciones se conectan al backend configurado: no es una base local automática.

## Verificaciones locales

```sh
bun run test
bun run lint
bun run typecheck
bun run build
```

- `test` ejecuta exclusivamente `src/**/*.{test,spec}.{ts,tsx}` con Vitest; no inicia E2E de backend.
- `typecheck` verifica aplicación/configuración original y, adicionalmente, scripts y configuración de Drizzle sin emitir JavaScript.
- `lint` conserva las reglas existentes; la deuda previa se informa, no se oculta desactivando reglas.
- `build` genera `.output/` para el destino Nitro/Cloudflare de Lovable. No despliega ni aplica migraciones.
- `bun run preview` permite inspeccionar el build. No se cambió el destino de despliegue.
- `bun run format` reescribe archivos: no es una comprobación ni un paso automático de auditoría.

Los resultados actuales y sus límites están en [la auditoría técnica](docs/TECHNICAL_AUDIT.md).

## E2E de backend: solo con base aislada confirmada

Existen `scripts/e2e/agrolocal_e2e.ts` y `scripts/e2e/phase3.ts`. Crean usuarios, empresas, roles temporales, publicaciones, operaciones y archivos, y ejecutan limpieza. **No deben ejecutarse sobre el proyecto de Lovable ni sobre producción.**

Antes de ejecutarlos, un responsable debe confirmar que el backend de destino es exclusivo, aislado y descartable, con las migraciones y los buckets necesarios. En esta auditoría no se confirmó ninguno y no se ejecutaron E2E.

Las entradas exigen variables independientes; no reutilizan `SUPABASE_*` como credenciales de prueba:

| Variable                        | Requisito                                                                  |
| ------------------------------- | -------------------------------------------------------------------------- |
| `E2E_SUPABASE_URL`              | Origen del backend aislado; HTTPS remoto o HTTP en loopback.               |
| `E2E_SUPABASE_PUBLISHABLE_KEY`  | Clave pública del backend aislado.                                         |
| `E2E_SUPABASE_SERVICE_ROLE_KEY` | Secreto administrativo del backend aislado, cargado fuera del repositorio. |
| `E2E_ISOLATED_DATABASE`         | Valor literal `true`, solo después de confirmar aislamiento.               |
| `E2E_CONFIRMED_URL`             | Debe coincidir con el origen de `E2E_SUPABASE_URL`.                        |

El preflight rechaza el proyecto identificado en `supabase/config.toml`, los orígenes de aplicación configurados y destinos ambiguos o incompletos antes de crear clientes. Si aplicación y prueba apuntan al mismo origen, se bloquea aunque sea local: configurá un backend separado. Esta barrera reduce errores accidentales; una declaración en variables no demuestra por sí sola aislamiento ni detecta todos los alias DNS de producción.

Solo tras esa confirmación y autorización:

```sh
bun scripts/e2e/agrolocal_e2e.ts
bun scripts/e2e/phase3.ts
```

El modo existente `PHASE3_BROWSER_FIXTURE=1` conserva recursos y exporta sesiones de prueba a `/tmp/browser/phase3/fixture.json` para una prueba de navegador. No lo uses en ejecuciones normales. Ese archivo contiene sesiones activas: debe permanecer local, fuera de Git, y eliminarse al terminar junto con los recursos de prueba. La ruta heredada requiere revisión para uso en Windows.

## Estructura

```text
src/routes/                 Rutas públicas, autenticación, panel y administración
src/routes/_authenticated/  Barrera de sesión para el panel (sin SSR privado)
src/components/             Formularios y componentes de interfaz
src/hooks/                  Sesión y pertenencia a empresas
src/lib/                    Unidades, mercado, operaciones y manejo de errores
src/integrations/supabase/  Clientes, middleware y tipos de la base
src/test/                   Pruebas locales y preflight E2E sin red
scripts/e2e/                Pruebas que escriben en backend y barrera de aislamiento
drizzle/migrations/         Historial SQL 0000–0009, conservado intacto
supabase/config.toml        Identificador del proyecto vinculado
docs/                       Auditoría, arquitectura, roadmap y propuestas de etapa 2
```

## Supabase, migraciones y despliegue

Las reglas de negocio viven en RLS, triggers y RPC `SECURITY DEFINER`. El navegador no es confiable. El stock se mueve mediante `apply_stock_movement`; la verificación, mediante `set_company_verification`. No sustituyas esas funciones por escrituras directas.

Fotos y documentos utilizan los buckets privados `listing-photos`, `company-docs` y `operation-docs`, con rutas que comienzan por empresa y enlaces firmados. Su creación, privacidad, límites y tipos permitidos deben comprobarse en el entorno autorizado: no están reproducidos íntegramente en las migraciones locales.

Antes de desplegar hay que verificar URLs de retorno de Auth para desarrollo/producción, confirmación de correo, entrega de emails, roles administrativos y migraciones realmente aplicadas. La recuperación de contraseña no está implementada en la interfaz revisada.

No ejecutes migraciones remotas sin autorización. No uses `drizzle-kit push` ni generes diferencias suponiendo que `drizzle/schema.ts` describe la base. No modifiques `0000–0009`: los cambios futuros requieren migraciones compatibles, revisión y pruebas aisladas. La concesión automática de administrador de `0001` continúa pendiente en etapa 2; no cambies ese archivo ni asumas que se retiró remotamente.

Lovable se conserva mediante `@lovable.dev/vite-tanstack-config`, `.lovable/` y `AGENTS.md`. No agregues duplicados de sus plugins, no cambies configuración remota ni reescribas historia publicada. Esta copia no contiene `.git`; no permite confirmar un remoto o sincronización activos.

## Estado y preparación de GitHub

Se conserva la implementación de mercado, empresas, roles, matching, oportunidades, acuerdos versionados, stock, entregas, documentación y comisiones. La existencia del código y los resultados históricos no prueban su funcionamiento actual en el backend remoto.

WhatsApp usa enlaces `wa.me`; no hay asistente integrado operativo. No se agregaron blockchain, comercio exterior ni nuevas funciones comerciales.

La etapa 1 protege archivos y herramientas y documenta las correcciones pendientes. La etapa 2 requiere aprobación independiente. Consultá [el roadmap](docs/ROADMAP.md) y [las propuestas técnicas](docs/PHASE2_PROPOSALS.md).

No se inicializó Git, no se crearon commits y no se subió nada. Antes de un primer commit, comprobá si existe un repositorio original conectado a Lovable y preferí recuperar esa historia. El nombre previsto del repositorio privado es `AgroLocal`. Los pasos manuales de revisión están en la auditoría.
