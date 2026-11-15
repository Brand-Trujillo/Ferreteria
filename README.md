# Ferrelectricos Cobos

Primera etapa de una aplicación web para una ferretería. La interfaz y las funciones están organizadas por carpetas, sin dependencias de instalación.

## Ejecutar localmente

Desde esta carpeta, en PowerShell:

```powershell
python -m http.server 8800 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:8800/`. Para detener el servidor, presionar Ctrl+C. La cámara requiere un contexto seguro (HTTPS o localhost) y permiso del usuario; el escaneo con cámara también requiere que Chrome admita `BarcodeDetector`. Cuando no esté disponible, se puede escribir el código o usar un lector físico compatible con teclado.

## Funcionalidad inicial

- La app abre en la pantalla de ventas; el inventario, la caja y los reportes siguen disponibles desde el menú.
- Registro y edición de productos por unidad, con o sin código, búsqueda, precios en pesos enteros y alerta de stock.
- Categoría opcional por producto y favoritos para filtrar rápidamente en la pantalla de ventas.
- Código de barras único cuando se proporciona, escaneo opcional y búsqueda manual.
- Historial local de cambios de cantidad, que exige un motivo para cada ajuste.
- Venta de prueba con búsqueda o escáner, pagos combinados, cálculo de vueltas y registro de saldo a crédito con nombre y fecha.
- Los campos numéricos muestran separadores de miles al escribir. El efectivo aplicado se calcula a partir del efectivo recibido y el saldo restante después de los demás medios; el exceso se muestra como vueltas.
- Indicador de conexión según el navegador; no verifica acceso real a internet ni implica sincronización. El botón explica que los datos siguen en este dispositivo.
- Actualización atómica del inventario y de los movimientos de stock al vender. Se solicita confirmación antes de vender con stock insuficiente.
- Comprobante de prueba para imprimir o compartir, y reportes locales de ventas, ingresos y gastos por día, semana, mes o año. El resultado estimado de ventas no descuenta gastos.
- Caja local de prueba: apertura con efectivo inicial, ventas asociadas a la caja abierta, movimientos opcionales de efectivo y cierre con conteo y diferencia. Las ventas anteriores a esta función no se asignan retroactivamente a una caja.
- Fiados locales por venta: consulta por nombre, fecha de vencimiento, saldo y registro de abonos. La caja debe estar abierta y los abonos en efectivo afectan el cierre; los abonos se muestran por separado en los reportes.
- Descarga de una copia JSON local y consulta directa de productos con stock bajo o agotado.
- Archivos de la app preparados para acceso sin conexión después de la primera carga mediante HTTPS o localhost. Las actualizaciones requieren cerrar las pestañas de la versión anterior; al modificar archivos incluidos en `sw.js`, incrementar el nombre de la caché para que se instale la nueva versión.

## Limitaciones importantes

Los datos están en IndexedDB **solamente en el navegador de cada dispositivo**; borrar los datos del navegador puede eliminarlos. La copia descargada contiene datos sensibles sin cifrar y todavía no puede restaurarse desde la app: es una exportación de prueba, no una recuperación completa. Todavía no hay sincronización entre dispositivos, servidor compartido, usuarios y permisos, caja compartida, fichas de clientes, devoluciones, descuentos, edición de ingresos o gastos, suscripción ni asistente de IA y voz. Los vencimientos se señalan en pantalla, sin notificaciones. La instalación y el uso sin conexión deben verificarse en Android con Chrome y dependen del navegador. Las ventas con stock insuficiente solo quedan registradas localmente: no hay resolución de conflictos entre dispositivos. No se debe usar esta etapa como registro único ni como sistema de producción.

Tampoco se ha configurado hosting ni facturación electrónica. Los recibos de venta futuros no deben confundirse con facturas electrónicas válidas ante la DIAN.

## Estructura

- `index.html`: interfaz y formularios.
- `styles/`: presentación adaptable.
- `src/inventory/`: persistencia y reglas de inventario.
- `src/scanner/`: cámara y lectura de códigos.
- `src/sales/`: ventas, cobro y persistencia de movimientos.
- `src/reports/`: reportes y registro de ingresos y gastos adicionales.
- `src/cash/`: apertura, cálculo y cierre de caja de prueba.
- `src/common/`: formato y validación de números compartidos.
- `src/backup/`: exportación de datos locales.
- `src/credits/`: consulta de fiados y registro de abonos.
- `sw.js`: caché de archivos para acceso sin conexión.
- `src/app.js`: coordinación de la interfaz.
- `assets/`: recursos gráficos.
