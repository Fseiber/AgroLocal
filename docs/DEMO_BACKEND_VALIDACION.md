# Validación de backend para la demo — pendiente de proyecto aislado

Fecha de referencia: 2 de noviembre de 2026. Alcance solicitado: solo el Supabase aislado de desarrollo/pruebas. **No se realizaron consultas a proyectos Supabase en esta revisión**, porque el único configurado coincide con la referencia local de Lovable y no se identificó un destino aislado autorizado.

## Identidad comprobada localmente

| Fuente                                                                   | URL / identificador no secreto           |
| ------------------------------------------------------------------------ | ---------------------------------------- |
| .env: VITE_SUPABASE_URL                                                  | https://wtuwglijhxqjnxwjrajp.supabase.co |
| .env: SUPABASE_URL                                                       | https://wtuwglijhxqjnxwjrajp.supabase.co |
| .env: ambos PROJECT_ID                                                   | wtuwglijhxqjnxwjrajp                     |
| supabase/config.toml, referencia del backend vinculado en el repositorio | wtuwglijhxqjnxwjrajp                     |

Por tanto no se puede confirmar separación: la configuración de cliente y servidor identifica el mismo proyecto que el backend de Lovable registrado localmente. No se consultó la configuración privada actual del editor Lovable ni se declara que ese proyecto sea producción por su nombre o contenido. No se lo utilizará como destino de pruebas aislado sin evidencia de separación.

La configuración no contiene un destino E2E separado ni una conexión PostgreSQL. No hay variables de conexión relevantes en el proceso. No se encontró otro archivo .env local con un proyecto distinto. Las claves existentes no se imprimieron ni copiaron al informe.

Se encontró la integración Supabase disponible en el directorio, pero no instalada/conectada en esta sesión. Se ofreció su instalación/conexión; eso no concede acceso ni significa que ya esté conectada.

## Requisitos

| Requisito                                                | Estado     | Evidencia / falta                                                                                         |
| -------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| Identificar URL y referencia configuradas                | VERIFICADO | Coinciden entre .env cliente/servidor y supabase/config.toml                                              |
| Confirmar que pruebas y Lovable son proyectos diferentes | BLOQUEADO  | No hay referencia de pruebas distinta; el destino actual coincide con Lovable según los archivos locales  |
| Acceso SQL autorizado al aislado                         | BLOQUEADO  | Falta identificar destino y disponer de conexión autorizada para SELECT                                   |
| Ejecutar demo_commercial_preflight.sql                   | BLOQUEADO  | No se ejecutó: sería incorrecto usar el único destino disponible, vinculado a Lovable                     |
| Tablas, vistas, RPC y permisos efectivos remotos         | PENDIENTE  | Solo se revisó su definición local, no el catálogo del aislado                                            |
| Migración 0007 aplicada y efectiva                       | PENDIENTE  | Falta historial remoto y definición efectiva de operation_action/apply_stock_movement                     |
| Migración 0010 aplicada y efectiva                       | PENDIENTE  | Falta historial remoto, definición de accept_pending_invitations y privilegios efectivos                  |
| Buckets existentes y configuración remota                | PENDIENTE  | No se consultó Storage de un proyecto aislado                                                             |
| Administrador de plataforma existente y autorizado       | PENDIENTE  | No se leyó user_roles/auth.users del aislado; el bootstrap local no prueba una cuenta legítima disponible |
| Preparado para comenzar el ensayo comercial              | BLOQUEADO  | Resolver identidad/acceso y validar los requisitos anteriores antes de crear datos                        |

PENDIENTE significa no comprobado, no ausente o defectuoso. BLOQUEADO identifica una precondición de acceso/alcance que impide avanzar. Las lecturas públicas del backend de Lovable de fases anteriores no prueban nada sobre un proyecto aislado diferente.

## Qué se verificará cuando exista acceso autorizado

1. Verificar referencia/URL devuelta por la conexión y contrastarla con wtuwglijhxqjnxwjrajp. No basta llamar “test” al mismo proyecto.
2. Ejecutar scripts/sql/demo_commercial_preflight.sql únicamente mediante conexión autorizada al aislado y con visibilidad suficiente. Las secciones de correos/IDs quedan pendientes hasta tener datos de ensayo aprobados; sus NULL son desconocidos, no resultados negativos.
3. Leer el historial real de migraciones. El _journal.json local, que incluye 0011 preparada, no demuestra ninguna aplicación remota.
4. Contrastar funciones efectivas:
   - 0007: operation_action establece agrolocal.operation_id y apply_stock_movement reconoce al comprador de esa operación con alcance limitado.
   - 0010: correo canónico desde auth.users, email_confirmed_at obligatorio, bloqueo de invitaciones, auditoría, ejecución denegada a anon y permitida a authenticated.
   - Revisar cuerpos y privilegios, no solo existencia de nombres o marcas de migración.
5. Comprobar lectura de tablas, RLS habilitada donde corresponde y permisos necesarios. No se cambian políticas ni grants ante una discrepancia.
6. Leer Storage y administradores mediante SELECT o herramientas de lectura; no probar permisos creando archivos, usuarios o empresas.

### Storage esperado, todavía no observado

| Bucket         | Expectativa del código                                                                | Límite del cliente                       |
| -------------- | ------------------------------------------------------------------------------------- | ---------------------------------------- |
| listing-photos | Privado, fotos del mercado accesibles conforme a políticas existentes y URLs firmadas | 10 MiB por archivo; selector de imágenes |
| company-docs   | Privado, documentación por empresa                                                    | 10 MiB; PDF/JPEG/PNG/WEBP                |
| operation-docs | Privado, documentos por participantes y administración                                | 20 MiB; PDF/JPEG/PNG/WEBP                |

Se deben comprobar existencia, public=false, file_size_limit, allowed_mime_types y políticas efectivas de storage.objects. Los límites del cliente no certifican los del bucket. La ausencia de archivos no demuestra que un bucket exista. El recorrido hasta reserva puede realizarse sin adjuntos; ese recorte no valida Storage.

Consulta adicional prevista, NO ejecutada:

```sql
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('listing-photos','company-docs','operation-docs')
ORDER BY id;

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='storage' AND tablename='objects'
ORDER BY policyname;
```

### Administrador de plataforma, todavía no observado

Se necesita un usuario existente con public.user_roles.role='admin', cuenta confirmada y reconocimiento del responsable como administrador autorizado. No basta ser admin de empresa. Una fila de rol o un trigger de bootstrap tampoco prueban por sí solos que el titular pueda acceder o esté autorizado actualmente. No se intentará login para comprobarlo en esta fase de lectura.

Consulta mínima prevista, sin devolver correo, contraseña ni sesión:

```sql
SELECT r.user_id, u.id IS NOT NULL AS account_exists,
       u.email_confirmed_at IS NOT NULL AS email_confirmed
FROM public.user_roles r
LEFT JOIN auth.users u ON u.id=r.user_id
WHERE r.role='admin';
```

Los posibles resultados requerirían confirmar su titular con el responsable, sin crear roles nuevos.

## Qué falta exactamente

- URL o identificador del Supabase aislado que se utilizará para pruebas, diferente de la referencia de Lovable.
- Acceso autorizado mediante la integración Supabase o una conexión PostgreSQL configurada de forma segura fuera del chat, con capacidad de lectura del catálogo, historial, Storage y roles. No hace falta enviar claves en mensajes.
- Confirmar que esa conexión apunta al proyecto autorizado y ejecutar las comprobaciones anteriores.
- Identificar un administrador ya autorizado para la futura verificación de las empresas.
- Antes del ensayo, alinear la configuración local de la app con el mismo aislado: actualmente apunta a Lovable. No se cambió .env en esta revisión.
- Obtener autorización independiente para las escrituras del ensayo comercial. La autorización de esta revisión es solo de lectura.

No se requiere aplicar 0011 para la demo. Si falta una dependencia histórica, se reportará y se solicitará decisión independiente; no se aplicará automáticamente. No se crearon datos, cambiaron permisos/roles/configuración remota, ejecutaron migraciones, hicieron commits ni push.
