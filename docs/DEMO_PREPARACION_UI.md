# AgroLocal — interfaz y procedimiento de ensayo del 3 de noviembre

Fecha de referencia: 2 de noviembre de 2026. Esta revisión prepara la interfaz y el procedimiento; **no certifica una transacción comercial real**. 0011 no se aplicó. No se crearon cuentas, empresas, publicaciones, sesiones ni invitaciones remotas. No hubo commit, push, cambios de RLS ni asignaciones de permisos administrativos.

## Correcciones locales

- `src/components/site-header.tsx`: el logo ahora usa `/favicon.png`, imagen de AgroLocal ya existente (64 × 64). Se conserva el tamaño de 44 × 44 y las clases del encabezado. Se conserva el descriptor original de Lovable sin editarlo.
- `src/routes/mercado.oferta.$id.tsx` y `mercado.demanda.$id.tsx`: contenedor del código y etiqueta Demo cambiado de párrafo a div, con las mismas clases. Badge renderiza un div; anidarlo en p producía advertencias React. No se modifica ningún dato, permiso o acción comercial.

Logo verificado por HTTP 200, MIME image/png y naturalWidth > 0 en Chrome. No se generaron imágenes ni se agregaron dependencias.

## Comprobación de navegador

Chrome headless real, perfil nuevo descartable, sin importar sesiones/cookies/contraseñas del usuario. Intercepción de red instalada antes de navegar: solo GET/HEAD/OPTIONS al servidor local, endpoints públicos de tablas de Supabase y fuentes; se bloquea todo RPC y solicitud de escritura. No se enviaron formularios de acceso o registro.

- Inicio y logo visibles.
- Acceso: email, contraseña y validación HTML de formulario vacío.
- Cambio de acceso a registro por el botón; se muestran sus cuatro campos.
- Mercado carga las dos ofertas demo reales desde lecturas públicas.
- Filtro Ocultar demo: esconde las dos ofertas y permite recuperarlas.
- Detalles públicos de oferta y demanda cargan.
- Cotización demo: se muestra el bloqueo previsto; no se intenta cotizar.
- Mercado y acceso a 390 px sin desbordamiento horizontal.
- Rutas de publicación de ambos productos, oportunidades y operación redirigen al acceso sin sesión.
- Cero intentos RPC; localStorage vacío. Las lecturas remotas fueron públicas; no se ejecutó accept_pending_invitations.
- Tras corregir el HTML se verifica ausencia de errores de consola/JavaScript y recursos fallidos en el recorrido observado.

El primer clic automatizado se adelantó a la hidratación y no cambió de modo. Se repitió esperando la hidratación y funcionó; no se cambió la lógica de acceso. Para la demo, esperar la carga inicial antes de interactuar.

Evidencia local: `.audit.local/demo-browser-results.json` y PNG en el directorio señalado por ese archivo. Son capturas de páginas anónimas, no evidencia de compra/reserva.

### Límites de la revisión

Publicación autenticada, cotización sobre lote no-demo y acuerdos **no se abrieron con sesión ni se enviaron**. No se simularon usuarios para saltar la protección de rutas. Por ello no se declaran probadas esas pantallas privadas ni sus permisos; quedan para el ensayo autorizado.

## Procedimiento exacto para preparar dos usuarios y empresas

Es un procedimiento pendiente de autorización. No ejecutar ahora.

1. **Acordar el destino y los datos**: backend de ensayo autorizado, correos controlados de vendedor/comprador, contraseñas elegidas fuera de este documento, dos CUIT de ensayo válidos/libres y número de contacto controlado. No usar las empresas demo de semilla ni sus CUIT. Mantener un solo vínculo de empresa por usuario.
2. **Antes de cualquier alta, confirmación o login**: un operador técnico autorizado comprueba en lectura que no hay invitaciones pendientes para los dos correos planeados. Usar el bloque correspondiente de `scripts/sql/demo_commercial_preflight.sql`. Cualquier resultado desconocido o invitación pendiente detiene la preparación. No borrar/aceptar invitaciones como atajo.
3. **Autorizar el alcance de acceso**: la carga del panel invoca accept_pending_invitations automáticamente. El futuro ensayo debe autorizar expresamente sesión y carga de panel, incluso si se comprobó ausencia de invitaciones. La confirmación de correo puede redirigir directamente a /panel. No cambiar ese comportamiento en esta preparación.
4. **Registrar al vendedor**, desde /auth?mode=signup, en un perfil independiente: nombre ficticio, teléfono controlado, correo de ensayo y contraseña de 8–72 caracteres. Confirmar el correo mediante su bandeja. Verificar manualmente el retorno correcto. Registrar al comprador en otro perfil, del mismo modo. No desactivar confirmación ni crear cuentas auto-confirmadas mediante service_role.
5. **Registrar cada empresa desde su propio panel**, que muestra el formulario cuando no hay membresía:
   - vendedor: ENSAYO 3NOV — Productor; actividad Productor; intención Vender; Mercedes, Corrientes;
   - comprador: ENSAYO 3NOV — Molino; actividad Molino arrocero; intención Comprar; Goya, Corrientes.
     Ingresar CUIT aprobado, teléfono y email de ensayo controlados. Pulsar Enviar a revisión una sola vez y guardar IDs. `register_company` crea automáticamente la membresía **admin de esa empresa**, suficiente para operar; no crea administración de plataforma. Un usuario que ya administra una empresa no puede registrar otra por esta RPC.
6. **Verificar empresas**: un administrador de plataforma YA existente y autorizado entra a /admin, elige cada empresa pendiente, estado Verificada y observación “Ensayo funcional 3NOV — empresa ficticia autorizada”. Usar el botón existente, que llama set_company_verification. Es una escritura de estado comercial, pendiente de autorización; no es permiso para asignar roles administrativos.
7. **Comprobar membresías y sesiones**: cada cuenta pertenece solamente a su empresa; rol admin de empresa; email confirmado; empresa verified; empresas distintas y no demo. Los actores de prueba no necesitan rol admin de plataforma. Si falta el administrador existente, detenerse: no editar user_roles, bootstrap ni RLS.
8. **Reutilización**: si existen dos cuentas/empresas de ensayo que cumplen todo lo anterior, utilizar esas y omitir altas. No mezclar datos reales de terceros.

No se usan invitaciones para preparar los dos actores; así se evita depender de una aceptación de invitaciones como mecanismo de alta. No se ejecutan los E2E generales sobre el backend de presentación: crean/eliminan datos y algunos asignan roles temporales.

## Dependencias del recorrido comercial

| Migración histórica | Dependencia observada y posible bloqueo                                                                                                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0000                | Auth/profiles, empresas/membresías, vista pública, publicaciones, stock, triggers, permisos y secuencias. Sin empresas verified o rol comercial no se publica.                                                                          |
| 0001                | Bootstrap de administrador por correo fijo. No se utiliza para preparar actores ni se modifica; hace falta un administrador legítimo ya existente.                                                                                      |
| 0002                | Registro con CUIT válido, oportunidades, request_quote, opportunity_parties y eventos. Rechaza lotes demo, empresas no verificadas y cantidades fuera del stock.                                                                        |
| 0003                | Tablas de operaciones/versiones/eventos/notificaciones y configuración. La pantalla de operación consulta también documentos y entregas aunque estén vacíos.                                                                            |
| 0004                | propose_operation, validación de términos e instantáneas. Faltan precio, calidad, entrega o fecha: propuesta rechazada.                                                                                                                 |
| 0005                | operation_action, confirmación de versión y reserva. Comprador correcto, versión vigente, sin disputa y stock suficiente son necesarios.                                                                                                |
| **0007**            | **Crítica para aceptar como comprador**: agrega contexto de operación y autorización limitada al comprador dentro del movimiento de stock. Sin su efecto real puede fallar la aceptación con “No tenés permiso sobre esta publicación”. |
| 0006/0008/0009      | Documentos/notificaciones y correcciones de cierre/liberación. No se demuestran esas acciones, pero forman parte del historial a contrastar. No pulsar Marcar leído en una revisión de lectura.                                         |
| 0010                | Invitaciones con correo confirmado. La invocación automática desde el panel sigue pudiendo escribir.                                                                                                                                    |
| **0011**            | **No es requisito de esta demo y no se aplica.** Sus archivos locales no demuestran despliegue remoto.                                                                                                                                  |

No se confirmó qué migraciones están aplicadas en el remoto. Las lecturas públicas no lo prueban y OpenAPI anónimo respondió 401. Preparé `scripts/sql/demo_commercial_preflight.sql`: SELECT de objetos, presencia/EXECUTE de RPC, definiciones efectivas del parche 0007, invitaciones y actores, sin ejecutar RPC comerciales. **No se ejecutó**. Revisar definiciones reales, no solo el número del historial: 0007 usa sustituciones de texto.

Si falta una función o permiso, informar el bloqueo y pedir autorización independiente. No ejecutar migraciones, dar permisos ni configurar el backend en vivo para “salvar” la demo. Para llegar a reserva no hacen falta documentos, buckets probados, WhatsApp API, ARCA, pagos ni cambios de comisión.

## Lista de comprobación de la operación de 35 toneladas

### Antes (pendiente de ensayo autorizado)

- [ ] Destino, cuentas e IDs aprobados y registrados.
- [ ] Cero invitaciones pendientes comprobadas para los correos previstos.
- [ ] Perfiles independientes VENDEDOR y COMPRADOR, sin mezcla de sesión.
- [ ] Emails confirmados; una empresa verified por actor; rol admin/operator.
- [ ] Dependencias históricas comprobadas sin aplicar 0011.
- [ ] Lote ficticio NUEVO: 100 t, granel, venta parcial sí, mínimo 10 t, sin archivos; descripción visible “PRUEBA CONTROLADA 3NOV — sin oferta comercial real”.
- [ ] Lote activo y no demo, en un destino expresamente autorizado; conservar registros de semilla is_demo=true.
- [ ] Código OF anotado, total 100.000 kg, reservado 0, vendido 0, disponible 100.000.
- [ ] Precio ficticio ARS 200.000/t; teléfono controlado del vendedor presente.

### Durante

- [ ] El comprador encuentra el lote por código.
- [ ] Solicita **35 en el campo toneladas**, una sola vez; anotar código OP.
- [ ] Sigue habiendo 0 reservado y 100.000 disponible: cotizar no mueve stock.
- [ ] El vendedor usa **Registrar acuerdo comercial**, no confundir con Declarar acuerdo de la oportunidad.
- [ ] Propone **35.000 en el campo kg**, ARS 200.000/t, modalidad directa, calidad declarada, retiro en planta y fecha 10/11/2026.
- [ ] Verificar versión y comprador pendiente. Todavía no hay reserva.
- [ ] El comprador revisa la misma operación/versión y pulsa **Aceptar términos y reservar** una vez.

### Después

- [ ] Operación confirmada, comprador aceptado, status reserved.
- [ ] Reserva de operación = 35.000 kg.
- [ ] Publicación: total 100.000, reservado 35.000, vendido 0, disponible 65.000 kg.
- [ ] Ambos perfiles conservan esos resultados después de recargar.
- [ ] Guardar códigos y capturas sin credenciales como evidencia REAL del ensayo.
- [ ] Detenerse: no registrar entregas/pagos/cierre ni limpiar registros sin autorización adicional.

Si hay timeout, refrescar antes de reintentar. No usar movimiento manual de reserva para aparentar aceptación del comprador. Si el ensayo falla, usar el plan alternativo del diagnóstico aprobado, indicando qué paso quedó pendiente.

## Acciones de lectura frente a escritura

| Acción                                                              | Clasificación y efecto                                                                  |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| GET de logo, páginas públicas, ofertas, demandas y companies_public | Lectura; realizada en navegador sin sesión                                              |
| Navegar filtros públicos o cambiar entre acceso/registro sin enviar | Estado local/lectura; realizado                                                         |
| Abrir ruta privada sin sesión en perfil limpio                      | Se comprobó redirección a /auth; no se montó el panel                                   |
| SELECT del preflight técnico                                        | Lectura; preparado, no ejecutado                                                        |
| Iniciar/cerrar sesión, confirmar correo                             | Cambia sesiones/actividad Auth; no realizado                                            |
| Abrir panel CON sesión                                              | Puede aceptar invitaciones y escribir membresías/auditoría; no realizado                |
| Registrar usuarios/empresas                                         | Escritura en Auth, profiles, companies, company_members y eventos; no realizado         |
| Verificar empresa                                                   | Escritura por set_company_verification; no realizado                                    |
| Publicar lote                                                       | Escritura de publicación, generación de código y timestamps; no realizado               |
| Solicitar cotización                                                | Escritura de oportunidad/eventos/auditoría; no realizado                                |
| Proponer acuerdo                                                    | Escritura de operación/versiones/eventos/notificaciones; no realizado                   |
| Aceptar términos                                                    | Escritura de aceptación, reserva y movimiento de stock en transacción; no realizado     |
| Marcar notificación como leída                                      | Escritura read_at y eventos/auditoría; no realizado                                     |
| Consultar documentos desde la UI                                    | Puede registrar document_access antes de firmar URL; fuera del recorrido y no realizado |
| Abrir wa.me                                                         | Navegación externa; no envía un mensaje por sí sola. No usado en la prueba de navegador |
| Aplicar migraciones, editar RLS o user_roles                        | Fuera de autorización; no realizado                                                     |

La restricción de métodos de la prueba de navegador es una protección adicional, no una nueva política del producto: no se incorporó al código de AgroLocal.

## Resultados finales de esta revisión

- Chrome: recorrido anónimo completo aprobado, escritorio 1365 × 900 y móvil 390 × 844; 11 lecturas GET públicas del backend, cero intentos RPC, cero errores de consola/JavaScript y cero recursos fallidos. No hubo solicitudes bloqueadas en el recorrido final: no se intentaron escrituras.
- Unitarias: 65/65 aprobadas, cinco archivos.
- TypeScript: aprobado para aplicación y scripts.
- Build de producción: aprobado; el logo PNG se copia idéntico a .output/public/favicon.png. No se desplegó.
- Todos los archivos de migraciones existentes, incluida 0011 preparada, y el lockfile permanecen sin cambios respecto del comienzo de esta revisión. No se editaron RLS, user_roles, use-session ni credenciales.
- Solo se cambiaron tres archivos de interfaz: encabezado y contenedores de etiquetas Demo en detalle de oferta/demanda. Además se actualizan este procedimiento, el enlace desde el diagnóstico y roadmap.md; se agrega el preflight SQL exclusivamente de lectura.

Capturas finales locales (anónimas): .audit.local/demo-browser-1793594245286/home-desktop.png; signin-desktop.png; signup-desktop.png; market-desktop.png; listing-demo.png; demand-demo.png; market-mobile.png; signin-mobile.png. Estos archivos están ignorados por Git.

Pendientes antes del ensayo: confirmar destino/cuentas/datos, comprobar invitaciones y administrador existente, autorizar la preparación remota y después verificar resultados reales de publicación, propuesta y reserva. Ningún resultado de esta revisión reemplaza ese ensayo.
