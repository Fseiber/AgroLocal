# Traspaso: Supabase de desarrollo y pruebas — 3 de noviembre de 2026

Preparado el 2 de noviembre. Responsable de ejecución: integrante designado por el equipo. **La configuración independiente queda pospuesta. En esta entrega solo se documenta: no se cambia el entorno de presentación ni se ejecuta ningún paso remoto.**

## 1. Entorno que hay que preservar

- Carpeta actual: `P:\Descargar (Chorme)\AgroLocal`.
- Presentación local: `http://127.0.0.1:8080/`.
- Backend actual vinculado a Lovable: `https://wtuwglijhxqjnxwjrajp.supabase.co`.
- Referencia protegida: `wtuwglijhxqjnxwjrajp`, también registrada en `supabase/config.toml`.
- Mantener intactos `.env`, `supabase/config.toml`, configuración Lovable, permisos, roles y datos de ese backend.
- No ejecutar migraciones, E2E, altas ni pruebas de escritura contra él.
- Logo y navegación pública ya se comprobaron en Chrome; las últimas unitarias fueron 65/65 y TypeScript/build aprobaron. Eso no certifica el circuito remoto de reserva.

No reemplazar el backend de presentación a último momento. El entorno nuevo solo podrá utilizarse para presentar después de un ensayo completo aprobado; si no alcanza el tiempo, conservar la presentación actual y sus límites conocidos.

## 2. Requisitos y decisiones previas del responsable

- Acceso autorizado a una organización Supabase y a un proyecto nuevo, separado y descartable de desarrollo/pruebas.
- Definir nombre, referencia, URL, propietario y presupuesto del proyecto; un nombre con “test” no demuestra aislamiento.
- Acceso técnico al catálogo SQL, Auth y Storage del NUEVO proyecto; secretos mediante el mecanismo seguro del equipo, nunca en este documento, Git, capturas o chat.
- Dos correos de ensayo controlados, teléfono controlado y dos CUIT de prueba aprobados, válidos y disponibles.
- Identificar quién autoriza/provisiona el primer administrador de plataforma del aislado.
- Acordar el alcance de creación de infraestructura, aplicación de migraciones históricas y datos ficticios. Esta guía no autoriza ninguna de esas acciones sobre Lovable.
- No importar usuarios, sesiones, archivos ni datos comerciales reales del backend actual.

## 3. Separar carpeta, proceso y navegador

1. Preparar una copia de trabajo independiente, por ejemplo `P:\Descargar (Chorme)\AgroLocal-pruebas`, sin copiar `.env`, credenciales, `node_modules`, outputs, perfiles de navegador ni `.audit.local`.
2. Entregar el estado local actual de los archivos necesarios: hay cambios y archivos nuevos SIN commit. Un `git clone` o un `git diff` aislado puede omitirlos; revisar también `git status --short` y los archivos sin seguimiento. No hacer commits/push como parte de este traspaso.
3. Usar otra terminal y puerto: `8081` para pruebas, `8080` para presentación.
4. Usar perfiles de navegador independientes para vendedor/comprador del aislado. No reutilizar sesiones del backend de Lovable.
5. Instalar en la carpeta de pruebas con `bun install --frozen-lockfile`, conservando el lockfile.

## 4. Identificar el nuevo proyecto antes de conectarlo

En el panel Supabase del proyecto nuevo, registrar URL y Project Reference. Deben ser diferentes de `wtuwglijhxqjnxwjrajp`. Confirmar también la identidad de la conexión SQL y la clave pública: tienen que pertenecer a ese MISMO proyecto nuevo.

Mantener una ficha sin secretos:

| Campo                                  | Completar mañana |
| -------------------------------------- | ---------------- |
| Nombre del proyecto                    |                  |
| Project Reference nuevo                |                  |
| URL nueva                              |                  |
| Propietario/responsable                |                  |
| Confirmación de que difiere de Lovable |                  |
| Carpeta de pruebas / puerto 8081       |                  |
| Fecha y responsable de autorización    |                  |

No editar la referencia protegida del repositorio ni enlazar la carpeta de presentación con comandos CLI. Si una herramienta necesita vinculación, usar un directorio de infraestructura separado y el Project Reference explícito del aislado.

## 5. Configurar variables SOLO en la copia de pruebas

Crear su `.env` desde `.env.example`, completándolo localmente. No copiar el `.env` de la presentación.

| Variable                                                    | Contenido esperado                                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`, `SUPABASE_URL`                         | URL del nuevo aislado                                                                     |
| `VITE_SUPABASE_PROJECT_ID`, `SUPABASE_PROJECT_ID`           | Referencia del nuevo aislado                                                              |
| `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY` | Misma clave pública del nuevo aislado                                                     |
| `LOVABLE_DB_MIGRATION_URL`                                  | Opcional: conexión SQL del NUEVO aislado, solo para el ejecutor autorizado de migraciones |
| `SUPABASE_SERVICE_ROLE_KEY`                                 | Opcional de servidor; no necesaria para el flujo normal de la app                         |
| `E2E_*`                                                     | Solo si posteriormente se autorizan suites que escriben y borran datos                    |

El nombre heredado `LOVABLE_DB_MIGRATION_URL` no implica usar Lovable: si se utiliza en pruebas debe apuntar exclusivamente al proyecto nuevo. No usar secretos con prefijo `VITE_`.

Revisar identidad antes de cada aplicación de SQL. Reiniciar solo el servidor de pruebas tras configurar variables. Ejecución futura, únicamente en la copia independiente:

```powershell
bun run dev --host 127.0.0.1 --port 8081
```

## 6. Auth

1. Habilitar acceso por email/contraseña y registro en el aislado según el alcance aprobado.
2. Mantener confirmación de email habilitada. Comprobar entrega real mediante correo controlado; la configuración por sí sola no prueba recepción.
3. Configurar Site URL para `http://127.0.0.1:8081/` y retorno autorizado `http://127.0.0.1:8081/panel`. Agregar localhost solo si efectivamente se va a usar; no mezclar orígenes durante el ensayo.
4. Si se utiliza un dominio de prueba adicional, añadir únicamente sus retornos previstos.
5. Configurar proveedor de correo/SMTP si hace falta para la entrega. No almacenar credenciales SMTP en el frontend.
6. Revisar las invitaciones pendientes de los correos previstos ANTES de altas, confirmación o login. `useMe` llama automáticamente `accept_pending_invitations` al cargar el panel, incluso después del retorno de confirmación de email.
7. Si hay invitaciones inesperadas, detener la preparación y resolver con el responsable; no aceptarlas/borrarlas como atajo.

## 7. Migraciones históricas: selección explícita

**El diario local ya incluye 0011. No lanzar una migración general sin limitar el rango. 0011 sigue pendiente de autorización y NO es requisito de la demo.**

El nuevo proyecto debe proveer primero los esquemas/roles habituales de Supabase (Auth y Storage). No ejecutar el SQL como si fuera una base PostgreSQL vacía sin esos componentes.

Procedimiento futuro del responsable, exclusivamente en el aislado y con autorización:

1. Revisar el catálogo y el historial real. Si ya hay objetos o migraciones, no volver a aplicar `0000` ni adivinar qué falta.
2. Para instalación limpia, seleccionar en orden **solo los once archivos 0000–0010** desde `drizzle/migrations`, sin editar su SQL.
3. Usar un ejecutor transaccional con destino verificado y registro de aplicaciones. Si se utiliza Drizzle, preparar fuera de la carpeta de presentación un artefacto de despliegue con copias exactas de esos archivos y manifiesto limitado a esas entradas. Configurar explícitamente ese directorio; no modificar el diario/historial del repositorio ni incluir 0011. Si no puede garantizarse el límite, detenerse.
4. Registrar los hashes y los resultados. Ante error, hacer rollback y diagnosticar; no continuar ejecutando sentencias sueltas ni cambiar RLS/grants para hacer pasar la demo.
5. No usar `drizzle-kit push`: `drizzle/schema.ts` y los snapshots están vacíos y no describen la base real.
6. No usar un `db push` genérico o un enlace CLI que pueda apuntar a Lovable. Revisar el destino efectivo, no solo el nombre del archivo de configuración.
7. No afirmar que una migración está aplicada porque figure en `meta/_journal.json`: es un registro local.

Dependencias críticas a comprobar con `scripts/sql/demo_commercial_preflight.sql`:

| Migración      | Verificación                                                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 0000           | Tablas base, vistas, RLS, triggers y stock                                                                                                   |
| 0002           | Registro con CUIT, oportunidades y request_quote                                                                                             |
| 0003–0005      | Operaciones/versiones/eventos, propuesta, aceptación y reserva                                                                               |
| 0007           | Autorización limitada del comprador dentro del movimiento de stock; revisar las funciones efectivas porque el parche usa reemplazos de texto |
| 0006/0008/0009 | Documentos y correcciones de cierre/liberación; no forman parte del recorrido mínimo pero sí del historial                                   |
| 0010           | Invitaciones: correo canónico confirmado y permisos efectivos                                                                                |
| 0011           | No aplicar ni incluir en el ejecutor general                                                                                                 |

`0001` conserva un bootstrap administrativo ligado a un correo fijo. No editarlo ni usar ese correo como estrategia para las cuentas ficticias. Su existencia no prueba un administrador legítimo disponible.

## 8. Storage: tres buckets privados

Crear/configurar los buckets en el NUEVO proyecto con el mecanismo soportado de Supabase. Las migraciones locales tienen políticas, pero no reproducen íntegramente la creación/configuración de buckets.

| Bucket           | Privacidad | Límite de referencia del cliente | Tipos previstos      |
| ---------------- | ---------- | -------------------------------- | -------------------- |
| `listing-photos` | Privado    | 10 MiB                           | JPEG, PNG, WEBP      |
| `company-docs`   | Privado    | 10 MiB                           | PDF, JPEG, PNG, WEBP |
| `operation-docs` | Privado    | 20 MiB                           | PDF, JPEG, PNG, WEBP |

Comprobar `public=false`, límites compatibles y MIME permitidos; no dar por verificados esos valores hasta leerlos en el proyecto nuevo. Respetar las políticas de rutas que comienzan por empresa y, según el caso, publicación/operación. No volver públicos los buckets para resolver un fallo.

Que las fotos del marketplace sean visibles mediante las políticas/URLs firmadas no convierte en pública la documentación privada. Las lecturas/firmas y descargas deberán probarse con archivos ficticios solo después de autorizar ese ensayo.

La operación mínima hasta reserva puede hacerse sin adjuntos: reduce dependencias, pero no certifica Storage.

## 9. Administrador y dos usuarios de ensayo

Primero comprobar mediante lectura si existe una cuenta confirmada y legítima con `public.user_roles.role='admin'`. Es distinto de administrar una empresa.

En un proyecto NUEVO puede no existir ningún administrador. En ese caso, el propietario debe obtener autorización explícita para provisionar el primer administrador por UUID de una cuenta confirmada, desde un canal técnico controlado y con auditoría. **No está ejecutado ni autorizado sobre el backend actual.** No usar metadata del usuario, el navegador o un cambio de políticas para conceder privilegios.

Después, con preparación de datos autorizada únicamente en el aislado:

1. Registrar y confirmar dos cuentas controladas en perfiles independientes, sin invitaciones pendientes.
2. Vendedor: registrar ENSAYO 3NOV — Productor, actividad Productor, intención Vender, Mercedes/Corrientes.
3. Comprador: registrar ENSAYO 3NOV — Molino, actividad Molino arrocero, intención Comprar, Goya/Corrientes.
4. Usar CUIT válidos/aprobados y disponibles, emails y teléfono controlados; no datos comerciales de terceros.
5. `register_company` crea la membresía admin de la empresa propia. Eso ya satisface el permiso comercial; no asignar admin de plataforma a vendedor/comprador.
6. El administrador de plataforma autorizado verifica ambas empresas mediante la interfaz/RPC existente y una observación de ensayo.
7. Comprobar una sola membresía por actor, empresas diferentes, estado verified y rol admin/operator. La UI toma la primera membresía y no tiene selector explícito.
8. Para operar, usar registros nuevos de ensayo con `is_demo=false` y rótulo visible PRUEBA CONTROLADA; no quitar la marca a las semillas demo ni editar sus datos.

Los registros no-demo pueden aparecer en el marketplace del aislado. Confirmar el destino antes de crearlos.

## 10. Verificación y ensayo mínimo

En la copia independiente:

```sh
bun run test
bun run typecheck
bun run build
```

La deuda ESLint previa está documentada; no se ocultó desactivando reglas. Ejecutar lint permite informar su estado, pero no equiparar el build con validación del backend.

Después de comprobar identidad/acceso, ejecutar las consultas de solo lectura de `scripts/sql/demo_commercial_preflight.sql` y las verificaciones de Storage/administración de `docs/DEMO_BACKEND_VALIDACION.md`. Completar los parámetros de correos/IDs: los NULL representan desconocidos, no “cero problemas”.

Ensayo comercial, solo con autorización de escritura:

- Publicar lote ficticio de 100 t (100.000 kg), granel, venta parcial sí, mínimo 10 t, precio ficticio ARS 200.000/t, sin adjuntos.
- Comprador solicita 35 en el campo toneladas. Guardar código OP; stock todavía sin reservar.
- Vendedor usa Registrar acuerdo comercial y propone 35.000 en el campo kg, no 35.
- Comprador revisa versión y pulsa Aceptar términos y reservar una vez.
- Recargar ambos perfiles y comprobar: operación reserved, comprador aceptado, 35.000 kg reservados, 65.000 disponibles y 0 vendidos.
- Conservar evidencia sin secretos y registrar IDs. No registrar entrega, pago o limpieza como parte de ese recorrido mínimo.

Si falla una operación, consultar el estado real antes de reintentar. No usar reserva manual para simular aceptación ni cambios de permisos para ocultar un fallo. El guion y alternativas están en `docs/DEMO_PREPARACION_UI.md` y `docs/DEMO_2026-11-03.md`.

## 11. E2E opcionales: no son requisito de la presentación

Las suites crean y eliminan datos. Algunas asignan roles temporales. Solo se usarán con autorización específica y destino descartable confirmado.

Las variables `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY`, `E2E_SUPABASE_SERVICE_ROLE_KEY`, `E2E_ISOLATED_DATABASE=true` y `E2E_CONFIRMED_URL` son independientes de las de la aplicación.

El guard rechaza tanto la referencia protegida de Lovable como un destino que coincida con `SUPABASE_URL`/`VITE_SUPABASE_URL` del proceso. Si la copia de pruebas ya apunta al mismo aislado, no debilitar el guard: usar un proceso/terminal E2E separado, sin variables de aplicación heredadas y con la configuración E2E explícita. Bun admite `--no-env-file` para impedir la autocarga de .env; su disponibilidad se comprobó en la ayuda local, no se ejecutaron suites.

`scripts/e2e/quantity-consistency.ts` exige 0011 ya instalada: **no ejecutarla en la preparación de esta demo**. El ensayo de rollback de cantidades también queda para la etapa 0011, no para el recorrido comercial histórico.

## 12. Lista de entrega del compañero

- [ ] Referencia/URL nuevas registradas y diferentes de Lovable.
- [ ] Carpeta, puerto 8081, variables y sesiones separados de la presentación.
- [ ] Migraciones históricas autorizadas, aplicadas y verificadas; 0011 excluida.
- [ ] Auth por email y entrega/retornos comprobados.
- [ ] Buckets privados y sus políticas/configuración revisados.
- [ ] Administrador legítimo confirmado y dos cuentas/empresas de ensayo verificadas.
- [ ] Preflight sin bloqueos ni invitaciones inesperadas.
- [ ] Ensayo de 35 t observado y persistente después de recargar.
- [ ] Evidencia, IDs, incidencias y plan de limpieza aprobados.
- [ ] Decisión expresa del equipo sobre qué entorno se mostrará el 3 de noviembre.

Si no se completa esta lista, informar qué falta y mantener la conexión de presentación intacta. No etiquetar como funcional un circuito que solo está implementado en archivos.
