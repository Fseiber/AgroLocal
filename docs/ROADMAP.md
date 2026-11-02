# Roadmap de saneamiento

Fecha: 1 de noviembre de 2026. El archivo histórico `roadmap.md` se conserva; sus marcas de completado no sustituyen verificación actual.

## Etapa 1 — Autorizada

- Excluir configuración local, secretos y generados; mantener `.env.example`.
- Documentar instalación con Bun/lockfile, configuración y límites.
- Proteger ambos E2E antes de crear clientes con variables separadas y confirmación explícita; probar el preflight sin red.
- Incorporar `bun run typecheck` para aplicación, scripts y configuración Drizzle.
- Ejecutar unitarias, ESLint, TypeScript y build sin tocar bases remotas.
- Conservar migraciones `0000–0009`, Lovable y diseño.
- Informar deuda previa sin desactivar reglas ni reformatear masivamente el producto.

Los resultados están en `TECHNICAL_AUDIT.md`. La etapa 1 no resuelve hallazgos comerciales de la etapa 2.

## Etapa 2 — Pendiente de autorización

Prioridad alta:

1. Validar unidades, cantidades y valores finitos en PostgreSQL, incluyendo llamadas directas.
2. Vincular respaldo documental a archivos reales autorizados y recalcularlo cuando deja de existir.
3. Retirar la concesión automática futura de administrador con una migración nueva y conservar roles existentes hasta una revisión explícita.

Prioridad media:

4. Revisar grants RPC para revocar `PUBLIC` donde corresponde, preservando funciones públicas y dependencias RLS.
5. Normalizar precios y exigir moneda comparable en matching, sin cambio de moneda ni porcentajes.
6. Guardar correctamente el estado previo en el historial de oportunidades.
7. Alinear bloqueos de propuesta/confirmación/entregas y probar concurrencia.

Cada propuesta identifica archivos, comportamiento y pruebas en `PHASE2_PROPOSALS.md`. No se prepararon migraciones ejecutables en el directorio activo ni se aplicaron cambios comerciales.

## Antes de datos comerciales reales

- Confirmar una base E2E aislada y descartable con un responsable y ejecutar regresiones positivas/negativas por rol y empresa.
- Verificar registro y confirmación por correo real, retorno, login, logout y renovación. Diseñar recuperación de contraseña como trabajo separado.
- Contrastar migraciones con historial remoto y comprobar buckets privados, permisos, tipos y tamaños.
- Verificar administración existente antes de retirar el bootstrap.
- Revisar exigencias documentales y comisión del negocio sin cambiar acuerdos confirmados silenciosamente.
- Mejorar limpieza E2E: comprobar resultados, retirar archivos de `company-docs` y gestionar fixtures/sesiones temporales. Un borrado de tablas no elimina objetos Storage.
- Automatizar verificaciones en CI sin secretos de producción ni E2E remoto automático.

## Segunda fase de mantenimiento y escala

- Corregir deuda ESLint por lotes y separar formato de cambios funcionales.
- Reducir `any`, validar JSON de términos y separar cálculos puros de red sin cambiar fórmulas.
- Paginar consultas y llevar filtros al servidor; medir antes de agregar índices.
- Revisar el esquema Drizzle con un plan compatible con Lovable; no reconstruir por inferencia ni ejecutar `push`.
- Agregar observabilidad, revisión de dependencias/vulnerabilidades, carga y revisión independiente de permisos.
- Revisar dependencias beta y empaquetado con Lovable antes de actualizar versiones.

## Fuera de autorización

No hay autorización para E2E remoto, migraciones remotas, commits, publicación, configuración remota de Lovable, reescritura, cambios de landing, blockchain ni comercio exterior.

## Actualización del 2 de noviembre de 2026

Consistencia de cantidades: implementación local 0011 preparada, unitarias/TypeScript/build aprobados. Pendientes: diagnóstico de datos reales, comparación PostgreSQL y pruebas de migración sobre una base aislada confirmada. No aplicada en producción ni autorizada para despliegue. Ver QUANTITY_CONSISTENCY.md. Las propuestas que numeraban cantidades como 0010 eran orientativas: 0010 ya corresponde a invitaciones; cantidades utiliza 0011.
