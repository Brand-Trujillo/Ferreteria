import { parseInteger } from '../common/numbers.js';

export function validateProduct(data) {
  const name = String(data.get('name') ?? '').trim();
  const barcode = String(data.get('barcode') ?? '').trim();
  const supplier = String(data.get('supplier') ?? '').trim();
  const category = String(data.get('category') ?? '').trim();
  if (!name) throw new Error('Escribe el nombre del producto.');
  const numbers = {};
  for (const [field, label, max] of [
    ['cost', 'precio de compra', 999999999999], ['price', 'precio de venta', 999999999999],
    ['stock', 'cantidad en stock', 999999999], ['minimum', 'stock mínimo', 999999999]
  ]) {
    const raw = String(data.get(field) ?? '').trim();
    try {
      numbers[field] = parseInteger(raw, { max });
    } catch {
      throw new Error(`Ingresa un ${label} válido, sin decimales.`);
    }
  }
  return { name, barcode, supplier, category, ...numbers };
}

export function stockStatus(product) {
  if (product.stock <= 0) return 'empty';
  return product.stock <= product.minimum ? 'low' : 'ok';
}

export function formatMoney(value) {
  return '$ ' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value);
}
