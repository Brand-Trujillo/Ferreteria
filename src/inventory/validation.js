export function validateProduct(data) {
  const name = String(data.get('name') ?? '').trim();
  const barcode = String(data.get('barcode') ?? '').trim();
  const supplier = String(data.get('supplier') ?? '').trim();
  if (!name) throw new Error('Escribe el nombre del producto.');
  const numbers = {};
  for (const [field, label, max] of [
    ['cost', 'precio de compra', 999999999999], ['price', 'precio de venta', 999999999999],
    ['stock', 'cantidad en stock', 999999999], ['minimum', 'stock mínimo', 999999999]
  ]) {
    const raw = String(data.get(field) ?? '').trim();
    const value = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value > max) {
      throw new Error(`Ingresa un ${label} válido, sin decimales.`);
    }
    numbers[field] = value;
  }
  return { name, barcode, supplier, ...numbers };
}

export function stockStatus(product) {
  if (product.stock === 0) return 'empty';
  return product.stock <= product.minimum ? 'low' : 'ok';
}

export function formatMoney(value) {
  return '$ ' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value);
}
