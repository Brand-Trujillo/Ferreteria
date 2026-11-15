# Mi ferretería

Primera etapa de una aplicación web para una ferretería. La interfaz y las funciones están organizadas por carpetas, sin dependencias de instalación.

## Ejecutar localmente

Desde esta carpeta, en PowerShell:

```powershell
python -m http.server 8800 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:8800/`. Para detener el servidor, presionar Ctrl+C. La cámara requiere un contexto seguro (HTTPS o localhost) y permiso del usuario; el escaneo con cámara también requiere que Chrome admita `BarcodeDetector`. Cuando no esté disponible, se puede escribir el código o usar un lector físico compatible con teclado.

## Funcionalidad inicial

- Registro y edición de productos por unidad, con o sin código, búsqueda, precios en pesos enteros y alerta de stock.
- Código de barras único cuando se proporciona, escaneo opcional y búsqueda manual.
- Historial local de cambios de cantidad, que exige un motivo para cada ajuste.
- Venta de prueba con búsqueda o escáner, pagos combinados, cálculo de vueltas y registro de saldo a crédito con nombre y fecha.
- Actualización atómica del inventario y de los movimientos de stock al vender. Se solicita confirmación antes de vender con stock insuficiente.
- Comprobante de prueba para imprimir o compartir, y reportes locales de ventas, ingresos y gastos por día, semana, mes o año. El resultado estimado de ventas no descuenta gastos.

## Limitaciones importantes

Los datos están en IndexedDB **solamente en el navegador de cada dispositivo**; borrar los datos del navegador puede eliminarlos. Todavía no hay sincronización entre dispositivos, servidor compartido, usuarios y permisos, caja compartida, apertura o cierre de caja, abonos y gestión de créditos, devoluciones, descuentos, edición de ingresos o gastos, respaldo, suscripción, asistente, modo sin conexión verificable ni instalación PWA completa. Las ventas con stock insuficiente solo quedan registradas localmente: no hay resolución de conflictos entre dispositivos. No se debe usar esta etapa como registro único ni como sistema de producción. El manifiesto es una base para la instalación futura.

Tampoco se ha configurado hosting ni facturación electrónica. Los recibos de venta futuros no deben confundirse con facturas electrónicas válidas ante la DIAN.

## Estructura

- `index.html`: interfaz y formularios.
- `styles/`: presentación adaptable.
- `src/inventory/`: persistencia y reglas de inventario.
- `src/scanner/`: cámara y lectura de códigos.
- `src/sales/`: ventas, cobro y persistencia de movimientos.
- `src/reports/`: reportes y registro de ingresos y gastos adicionales.
- `src/app.js`: coordinación de la interfaz.
- `assets/`: recursos gráficos.
