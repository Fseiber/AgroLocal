# AgroLocal MVP 1.0 — Plan de la Fase 1 (base funcional)

## Estado actual
El proyecto está vacío: no hay pantallas, base de datos, inicio de sesión ni funciones de WhatsApp, blockchain o comercio exterior que conservar. No hay nada que migrar ni respaldar. Se construye AgroLocal desde cero siguiendo el documento que enviaste. La imagen adjunta es el diagrama de arquitectura, no el logo.

**Logo:** todavía no lo recibí. Hasta que lo adjuntes, la marca aparece solo como texto "AgroLocal", con verde lima y verde oscuro. No voy a dibujar un logo. Cuando lo envíes, reemplazo el texto por el archivo original.

## Qué incluye esta fase
1. **Identidad visual:** fondo blanco, verde lima para las acciones y verde oscuro para textos y contraste. Botones grandes, pensado primero para el celular y con todo el texto en español rioplatense.
2. **Página de inicio:** encabezado con su menú, el mensaje "El agro tiene oportunidades. AgroLocal las conecta.", botones "Quiero vender" y "Quiero comprar", beneficios y una sección de WhatsApp marcada "Próximamente".
3. **Registro e inicio de sesión con email y contraseña.** El registro pide:
   - nombre y teléfono;
   - razón social, CUIT (con validación de su dígito verificador), provincia y localidad;
   - tipo de actividad y si la empresa quiere vender, comprar o ambas.
4. **Empresas con varios usuarios:** cada empresa puede tener un administrador, operadores comerciales y usuarios de consulta. El administrador invita usuarios por email y les asigna su rol.
5. **Verificación manual de empresas:** estados registro iniciado, pendiente, información solicitada, verificada, rechazada y suspendida. Solo un administrador de AgroLocal puede cambiar el estado, y debe dejar una observación.
6. **Panel de administración de AgroLocal:** cola de empresas para revisar, con sus datos, documentos y decisión. Ningún usuario puede darse permisos de administrador ni verificarse a sí mismo.
7. **Explorar mercado (público):** pestañas "Ofertas de venta | Demandas de compra" con filtros por producto, tipo, variedad, provincia, cantidad, precio, disponibilidad, presentación y empresa verificada. Los datos de contacto solo se muestran a empresas verificadas que iniciaron sesión.
8. **Formularios de publicación:**
   - arroz con cáscara (humedad, materias extrañas, rendimientos);
   - arroz elaborado (subgrupo y presentación a granel, bolsas o big bags, con el total calculado según el peso por bolsa);
   - demandas de compra.
9. **Calidad:** cada dato se marca como declarado, respaldado con documento o no informado. Nunca aparece como "certificado" en forma automática.
10. **Documentos y fotos:** archivos PDF o imágenes de hasta 10 MB. Las fotos son públicas; los análisis y fichas técnicas son privados de la empresa.
11. **Stock:** registra la cantidad original, disponible, reservada, vendida y liberada, en kilos internamente. Si alguien carga bolsas sin indicar su peso, el sistema no las acepta. Las reservas no pueden superar el stock, aunque dos compradores reserven al mismo tiempo.
12. **Paneles iniciales:** el del vendedor (publicar, mis publicaciones, disponible) y el del comprador (buscar, mis demandas). Se completan en la Fase 2.
13. **Datos de demostración:** se guardan aparte, con la etiqueta "Demo", y se pueden ocultar.

## Fuera de esta fase
- Coincidencias entre ofertas y demandas, consultas y enlace a WhatsApp (Fase 2).
- Operaciones, confirmación de ambas partes, historial y comisión (Fase 3).
- Asistente de WhatsApp con texto y audio (Fase 4, cuando haya credenciales).
- Blockchain, pagos y comercio exterior quedan excluidos del MVP.

## Detalles técnicos
- **Backend:** se activa Lovable Cloud para la base de datos, la autenticación y el almacenamiento de archivos.
- **Tablas:** `companies`, `company_members` (rol por empresa, en una tabla separada), `user_roles` (con el rol de administrador de la plataforma) más la función `has_role` y la función `is_company_member(company, min_role)`. También `profiles`, `verification_events`, `listings` (ofertas, con su tipo de producto y los campos de cáscara o elaborado en una columna JSON de calidad), `demands`, `stock_movements`, `listing_documents`, `units_config` y `audit_log`.
- **Permisos:** reglas de seguridad por fila en todas las tablas. Los listados públicos solo exponen columnas seguras mediante una vista, sin teléfono ni email. Los cambios de verificación pasan por una función del servidor que exige el rol de administrador.
- **Stock:** una función de base de datos `reserve_stock` usa `SELECT ... FOR UPDATE` y verifica que la cantidad disponible alcance para evitar ventas por encima del stock. Las cantidades se guardan en kilos y la unidad original también queda registrada.
- **Archivos:** un bucket público para las fotos y otro privado para los documentos, con reglas según la empresa. Los documentos privados se abren con enlaces firmados.
- **Páginas:** `/`, `/mercado`, `/mercado/oferta/$id`, `/mercado/demanda/$id`, `/como-funciona` y `/auth`. Las páginas protegidas son `/panel`, `/panel/publicar/cascara`, `/panel/publicar/elaborado`, `/panel/demandas/nueva`, `/panel/empresa`, `/panel/usuarios` y `/admin`.
- **Pruebas automatizadas:** validación del CUIT, conversión de unidades (las bolsas sin peso se rechazan) y cálculo del stock disponible. Además, una prueba manual completa: registro, aprobación por el administrador, publicación y visualización en el mercado.
- Al terminar, se documentan en `AGENTS.md` la arquitectura, las variables de entorno necesarias y la lista de pendientes.
