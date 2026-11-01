# AgroLocal — Fase 3

## Entrega
Acuerdos comerciales versionados, aceptación del comprador, reservas atómicas, registro de entrega del vendedor y recepción del comprador, liberación bilateral, disputas, documentos privados, pagos declarados/confirmados por receptor, comisiones, historial y notificaciones internas.

Pantallas: operaciones desde Mis oportunidades, Mi historial, notificaciones del panel y revisión de operaciones/configuración en Administración.

## Estructura y seguridad
Migraciones 0003–0009: commercial_operations, operation_versions, operation_events, operation_deliveries, operation_documents, operation_notifications, commercial_settings y operation_document_rules. RLS de lectura para participantes y administradores; sin escritura directa para usuarios comunes. Cambios solo mediante propose_operation, operation_action, operation_document_action y configure_commercial. El historial conserva actor, fecha, términos y versión aceptada. Los cambios administrativos tienen auditoría.

El stock sigue pasando por apply_stock_movement con bloqueo de fila; una protección adicional impide consumir reservas asignadas a acuerdos desde el control general de stock. El comprador obtiene autorización limitada dentro de la operación, no permiso genérico sobre publicaciones del vendedor.

## Flujo
1. El vendedor vincula una publicación propia y declara cantidad en kg, precio neto, moneda, unidad, calidad, entrega y fecha.
2. El comprador acepta la versión vigente; se reserva dentro de la misma transacción.
3. Modificar términos antes de registrar entregas crea una versión nueva, libera la reserva anterior y exige nueva aceptación del comprador. Después de registrar entregas no se admite reescribir los términos: requiere revisión comercial antes de aplicar ajustes.
4. El vendedor registra entregas con identificador único; el comprador acepta recepción. Solo la recepción aceptada pasa de reservado a vendido.
5. Las partes solicitan y aprueban liberaciones/cancelaciones. Una disputa bloquea cierre y liberación; administración la resuelve con motivo.
6. El cierre requiere aceptación bilateral, cantidades aceptadas, ninguna reserva o entrega pendiente, documentación requerida o ausencia aprobada y ninguna disputa.

## Documentos y comisión
Almacenamiento operation-docs privado, máximo 20 MB por archivo. Categorías: LPG, comprobante comercial, traslado, entrega, pago y otros. Reglas por producto y modalidad para nuevos acuerdos; inicialmente sin documentos obligatorios hasta que administración configure los aplicables. Enlaces de cinco minutos; las consultas realizadas desde la pantalla quedan registradas. Los enlaces temporales no deben compartirse: quien los recibe puede usarlos mientras sean válidos. Las descargas realizadas directamente por clientes autorizados fuera de la pantalla no generan el evento de consulta de la aplicación.

Comisión inicial 0,5 %, vendedor, sobre importe neto de mercadería aceptada; excluye IVA y conceptos adicionales porque el precio acordado se captura como neto de mercadería. Configuración para nuevos acuerdos y desactivación del piloto. Estimada → calculada → revisión → aprobada → facturada → cobrada, con evidencia administrativa obligatoria. No se emiten facturas, procesan cobros ni verifican transferencias o ARCA. Adjuntar un comprobante no cambia el estado de pago.

## Verificación
Pruebas permanentes: scripts/e2e/phase3.ts y src/test/operations.test.ts. Se probaron reserva de 35 t sobre 100 t, aceptación de 30 t y 5 t pendientes, reconfirmación de precio, rechazo de confirmación ajena, bloqueo de edición directa, idempotencia de entregas, concurrencia de dos reservas de 60 t, cancelación/liberación, documentos privados y distintas unidades de precio. También se comprobaron disputa, vencimiento en ejecución, ausencia documental aprobada y transiciones de comisión.

Interfaz: vendedor declara acuerdo real de prueba; comprador confirma; vendedor registra 30 t; comprador acepta. La pantalla muestra 5 t reservadas, 30 t vendidas y cierre deshabilitado. Historial y documentos visibles a participantes. Pantallas de escritorio y teléfono comprobadas sin desbordamiento horizontal. Usuarios, empresas y archivos de prueba eliminados.

Pruebas unitarias/regresión de interfaz: 17 aprobadas. Regresión anterior de backend: 41/42; la prueba de alta usa example.com y el servicio ahora rechaza ese dominio, por lo que no verifica el alta ni la confirmación por correo. No se cambió la política de confirmación.

Errores corregidos: autorización limitada del comprador al mover stock dentro del acuerdo; alias ambiguo en cierre documental; protección de versiones en solicitudes de liberación; errores de tipos de la pantalla.

## Riesgos y pendientes antes de datos reales
- Validar con responsables comerciales y contables qué documentos se exigen por producto/modalidad, contrato de comisión y evidencia administrativa suficiente.
- Correo real y confirmación por bandeja no verificados; no afirmar que la prueba con cuentas temporales valida ese circuito.
- No existe integración ARCA, bancaria, fiscal, pasarela ni API oficial de WhatsApp; notificaciones son internas.
- Vencimientos se solicitan y aprueban dentro de la aplicación, nunca liberan automáticamente operaciones en ejecución.
- Ajustes esenciales luego de una entrega no están habilitados; no reescribir importes ya comercializados sin un futuro flujo de enmiendas bilateral.
- Revisión legal, pruebas de carga y auditoría de seguridad independientes recomendadas antes del uso comercial real.