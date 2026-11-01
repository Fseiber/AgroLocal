# Arquitectura de AgroLocal

Estado observado el 1 de noviembre de 2026. Describe el código local; no certifica el estado del backend remoto.

## Capas y responsabilidades

| Área             | Archivos                                                 | Responsabilidad                                                           |
| ---------------- | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| Aplicación       | `src/router.tsx`, `src/routes/__root.tsx`                | Router, QueryClient y estructura común.                                   |
| Interfaz pública | `src/routes/index.tsx`, `mercado.*`, `como-funciona.tsx` | Landing, exploración y detalle de ofertas/demandas.                       |
| Autenticación    | `src/routes/auth.tsx`, `src/hooks/use-session.ts`        | Registro, acceso, sesión y membresías.                                    |
| Panel            | `src/routes/_authenticated/route.tsx`, `panel.*`         | Redirección sin sesión, empresas, publicaciones y operaciones.            |
| Administración   | `admin.tsx`, `src/components/commercial-admin.tsx`       | Interfaz de verificación/configuración; la autorización real está en SQL. |
| Dominio          | `src/lib/domain.ts`, `operations.ts`, `market.ts`        | Unidades, cálculos de visualización y acceso a datos.                     |
| Integración      | `src/integrations/supabase/`                             | Cliente público, cliente administrativo de servidor, tipos y middleware.  |
| Servidor web     | `src/start.ts`, `src/server.ts`                          | Middleware de errores, CSRF para server functions y entrada SSR.          |
| Persistencia     | `drizzle/migrations/0000–0009`                           | Tablas, vistas, RLS, triggers y RPC comerciales.                          |
| Herramientas     | `scripts/e2e/`, `src/test/`                              | E2E con escritura aislada y pruebas locales.                              |

## Flujo de acceso

El navegador habla directamente con Supabase mediante la clave pública y el JWT del usuario. Supabase Auth identifica al usuario; PostgreSQL aplica RLS y las comprobaciones dentro de cada RPC. La validación Zod o los controles de pantalla no reemplazan permisos de base.

La ruta `_authenticated` usa `getUser()` y `ssr: false`. Los componentes usan membresías para presentar acciones. Esos controles visuales no protegen de llamadas directas a la API.

Las páginas públicas consultan `companies_public`, sin datos de contacto. `get_company_contact` verifica la pertenencia a una empresa verificada o la condición de administrador. Las oportunidades tienen además RPC de participantes y solicitud de contacto, con sus propios controles.

El cierre de sesión existente cancela consultas y vacía la caché de TanStack Query. Se debe verificar el ciclo real de registro, confirmación, renovación y cierre con correo y cuentas aisladas. No se encontró recuperación de contraseña implementada.

## Roles y frontera de servidor

- `user_roles`: administración de plataforma; habilita verificación y configuración comercial.
- `company_members`: administrador, operador y lector por empresa.
- RLS restringe lecturas/escrituras; las operaciones críticas se realizan mediante RPC.
- `0001` concede administración automáticamente a un correo confirmado fijo. Sigue intacta y su reemplazo está propuesto, no implementado.

`client.server.ts` lee el secreto administrativo en servidor y omite RLS. No se encontraron consumidores desde las pantallas revisadas. Se debe preservar esa separación y revisar el bundle al incorporar futuros handlers.

## Operación comercial

1. `match_pairs` calcula coincidencias por requisitos y pendientes; no utiliza porcentajes.
2. `request_quote` crea o recupera una oportunidad abierta; WhatsApp no mueve stock.
3. `set_opportunity_status` registra estado y declaración propia de cada parte.
4. `propose_operation` crea propuestas versionadas del vendedor y toma instantáneas de comisión/documentación.
5. `operation_action` confirma por comprador, reserva, registra/acepta entregas y maneja liberación, disputa, cierre y comisión.
6. `apply_stock_movement` bloquea la publicación y mueve existencias; triggers protegen reservas, ventas y reservas asignadas a acuerdos.
7. Solo las entregas aceptadas consumen la reserva asignada y se registran como vendidas.

Estos controles están presentes en SQL. Unidades, metadatos documentales y orden de bloqueos tienen hallazgos pendientes; ver `PHASE2_PROPOSALS.md`.

## Archivos

Las rutas comienzan por empresa. Las fotos de mercado se sirven con URLs firmadas desde `listing-photos`; que el bucket sea privado no significa que su política de lectura sea exclusiva de miembros. `company-docs` restringe acceso por empresa; `operation-docs`, por participantes y administración.

`operation_document_action` registra consultas desde la interfaz antes de pedir URLs de cinco minutos. Las lecturas directas autorizadas por Storage no generan ese evento. No se promete auditoría de toda descarga.

Los límites MIME/tamaño de interfaz no garantizan los límites del bucket remoto. La configuración real requiere revisión autorizada.

## Drizzle y Lovable

Drizzle conserva configuración, diario y migraciones, pero `drizzle/schema.ts` y los snapshots están vacíos. El modelo efectivo está en SQL y en los tipos generados de Supabase. No se debe usar la representación vacía para sincronizar la base.

`0007–0009` modifican funciones mediante reemplazos de texto sobre `pg_get_functiondef`; es importante probar la secuencia completa y contrastarla con lo aplicado. No se reescribe ese historial.

Lovable aporta configuración Vite/TanStack/Nitro y compatibilidad de sesiones en sus previews. Se conserva el plugin y sus archivos. No se verifica conexión Git activa porque falta `.git`.

## Escalabilidad y mantenimiento

La separación de interfaz y reglas en PostgreSQL es adecuada para continuar un MVP. Las transacciones y RLS son esenciales, no código a trasladar al cliente.

Una segunda fase debe incluir paginación/filtros SQL (el mercado carga hasta 500 filas y filtra en navegador), planes de consulta e índices con datos representativos, orden uniforme de bloqueos, monitoreo y pruebas de carga. Componentes extensos, conversiones `any` y errores ignorados requieren mejoras incrementales; no justifican una migración de framework.
