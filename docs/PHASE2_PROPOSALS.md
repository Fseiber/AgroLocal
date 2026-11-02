# Propuestas técnicas — Etapa 2 (sin aplicar)

Fecha: 1 de noviembre de 2026. Requieren revisión antes de modificar lógica comercial. No se alteraron `0000–0009`, no se registraron migraciones nuevas ni se aplicaron cambios remotos.

Los nombres SQL siguientes son propuestas a partir de `0010`; orden/numeración se confirmarán contra el historial real antes de escribirlas en `drizzle/migrations/`. Las regresiones SQL quedarían en `scripts/e2e/` detrás del preflight de aislamiento y no se ejecutarán sin confirmar ese destino.

## 1. Cantidades y unidades

**Archivos propuestos:** nueva migración `0010_quantity_validation.sql`; `scripts/e2e/quantity-regression.ts`; solo si hace falta, validaciones/pruebas de `src/lib/domain.ts` y `src/test/domain.test.ts`.

**Cambio:** comprobar en INSERT/UPDATE de ofertas/demandas que unidad sea válida, valores finitos/positivos, peso por bolsa/big bag exista y kg coincidan con cantidad original por factor/peso, con la precisión de tres decimales del cliente. Validar mínimos coherentes. El stock continúa moviéndose solo mediante `apply_stock_movement`.

**Compatibilidad:** primero diagnosticar inconsistencias existentes sin cambios. No recalcular stock histórico. Decidir expresamente si filas previas inconsistentes quedan reportadas hasta corrección manual o si se bloquean modificaciones relevantes. No agregar una restricción que falle al desplegar sin conocer los datos.

**Pruebas:** kg/qq/t/bolsa/big bag válidos; peso ausente, cero, negativos, NaN/infinito, unidad desconocida y kg discrepantes; mínimos; edición de descripción histórica; reservas/ventas previas conservadas; reservas concurrentes sin sobreventa.

## 2. Respaldo documental

**Archivos propuestos:** `0011_listing_document_integrity.sql`; `scripts/e2e/document-regression.ts`; cambios puntuales en `src/components/listing-form.tsx` solo si hace falta gestionar errores de subida/metadatos.

**Cambio:** exigir objeto existente en el bucket declarado, correspondencia de empresa/publicación/ruta y tipo permitido. Recalcular `quality_status` al agregar o quitar respaldo válido. Mantener permisos de fotos y documentos privados.

**Compatibilidad:** listar referencias huérfanas antes de actuar; no borrar archivos/metadatos históricos automáticamente. Definir gestión de borrados directos autorizados en Storage sin añadir triggers no soportados sobre tablas internas de Supabase. Una referencia válida acredita un archivo adjunto, no certifica su contenido.

**Pruebas:** archivo propio real, referencia sin archivo, empresa ajena, ruta/bucket incorrectos, foto frente a análisis/ficha, eliminación del último respaldo y de uno entre varios, lectura privada y URLs firmadas. Verificar documentos de operaciones limitados a participantes.

## 3. Matching de precio y moneda

**Archivos propuestos:** `0012_matching_price_normalization.sql`; `scripts/e2e/matching-regression.ts`. Si se alinea el filtro visual de precio máximo, revisar aparte `src/routes/mercado.index.tsx`, sin cambiar diseño.

**Cambio:** llevar precios a una base en kg; comparar solo monedas iguales y unidades conocidas con peso válido. Si falta información, mostrar precio pendiente y no otorgar prioridad económica. Mantener requisitos excluyentes, stock vivo, separación demo y resultados sin porcentajes.

**Pruebas:** precios equivalentes por kg/qq/t/bolsa/big bag; moneda distinta; peso desconocido; precio nulo; variedad/mínimos excluyentes; datos demo; ranking sin puntos por precios incomparables. No introducir conversión de divisas.

## 4. Historial de oportunidades

**Archivos propuestos:** `0013_opportunity_event_status.sql`; `scripts/e2e/opportunity-history-regression.ts`.

**Cambio:** conservar el estado previo antes del UPDATE de `set_opportunity_status` y usarlo en `from_status` del evento. Mantener transiciones y declaraciones bilaterales.

**Compatibilidad:** corregir solo eventos futuros, sin reescribir ni inventar historia.

**Pruebas:** solicitud → negociación → declaración/cancelación; declaración de la otra parte; acciones ajenas rechazadas; evento correcto y stock sin movimientos por cotización/declaración.

## 5. Permisos RPC

**Archivos propuestos:** `0014_rpc_execute_privileges.sql`; `scripts/e2e/rpc-permissions-regression.ts`.

**Cambio:** inventariar firmas y privilegios efectivos; revocar `PUBLIC` y grants directos no deseados en RPC privadas; conceder explícitamente lo requerido. Preservar `match_pairs`, funciones públicas y helpers RLS. Evitar revocación global indiscriminada.

**Compatibilidad:** comparar permisos antes/después. Los cuerpos seguirán autorizando actor, empresa y operación; un grant no reemplaza esas comprobaciones.

**Pruebas:** matriz anon/lector/operador/admin de empresa/admin de plataforma; mercado, membresías, contacto, verificación, funciones comerciales, aislamiento entre empresas y dependencias RLS.

## 6. Administración inicial

**Archivos propuestos:** `0015_retire_bootstrap_admin.sql`; procedimiento README/arquitectura; `scripts/e2e/bootstrap-admin-regression.ts`.

**Dependencias:** `0001` define `grant_bootstrap_admin` y dos triggers de `auth.users`. El resto consulta `user_roles` mediante `has_role`; las pantallas no dependen del correo fijo. Los E2E asignan roles a sus propios usuarios con el cliente administrativo aislado.

**Cambio:** retirar los triggers de concesión futura mediante migración nueva, conservando roles actuales. Documentar asignación explícita por UUID a una cuenta confirmada, por operador autorizado desde servidor/SQL controlado, con auditoría.

**Precondición:** comprobar migraciones aplicadas y al menos un administrador legítimo, confirmado y accesible. Si falta, no retirar el mecanismo. No crear endpoint público de bootstrap ni usar metadata de usuario para autorizar.

**Pruebas:** instalación histórica completa y actualización; confirmación del correo antes privilegiado sin concesión nueva; admin existente conserva acceso; usuario común no puede asignarse rol; asignación explícita auditable; aborto seguro sin precondiciones.

## 7. Orden de bloqueos y concurrencia

**Archivos propuestos:** `0016_operation_lock_order.sql`; `scripts/e2e/operation-concurrency-regression.ts`. Revisar definiciones efectivas de `propose_operation`, `operation_action`, `apply_stock_movement` y `guard_allocated_stock`, incluidos cambios de `0007–0009`.

**Cambio:** reproducir primero el conflicto y fijar orden uniforme para filas compartidas por propuesta, confirmación y entrega. Conservar atomicidad/permisos. Evaluar espera limitada y error recuperable; no reintentar acciones no idempotentes a ciegas.

**Pruebas:** propuesta concurrente con confirmación, dos compradores sobre la misma publicación, liberación concurrente con recepción, versión obsoleta, entregas idempotentes y ausencia de reservas negativas/sobreventa. Usar timeouts y repeticiones en base aislada.

**Límite:** el orden distinto está observado; no se reprodujo un interbloqueo remoto ni se afirman pérdidas de stock o incidentes ocurridos.

## Aceptación

Revisar primero estas decisiones. Preparar migraciones y regresiones por tema; probar instalación limpia y actualización con datos representativos aislados; verificar permisos y preservar términos confirmados. Un build o una prueba de funciones puras no valida por sí solos estas propiedades de PostgreSQL.

## Actualización: cantidades implementadas localmente como 0011

La numeración anterior era una propuesta, no archivos existentes. 0010 ya fue utilizada por la corrección de invitaciones. La implementación local de cantidades y sus límites están en QUANTITY_CONSISTENCY.md; no se aplicó a ninguna base. La numeración del resto de propuestas se debe reconfirmar antes de crear sus migraciones.
