import { listProducts } from './database.js';
import { stockStatus } from './validation.js';

export function setupStockCheck() {
  const button = document.getElementById('stock-check');
  const results = document.getElementById('stock-check-results');
  button.addEventListener('click', async () => {
    button.disabled = true;
    results.textContent = 'Consultando inventario…';
    try {
      const products = await listProducts();
      const low = products.filter(product => stockStatus(product) !== 'ok')
        .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name, 'es'));
      results.replaceChildren();
      if (!products.length || !low.length) {
        const message = document.createElement('p');
        message.className = 'form-intro';
        message.textContent = products.length ? 'No hay productos con stock bajo o agotado.' : 'No hay productos registrados todavía.';
        results.append(message);
      }
      for (const product of low) {
        const row = document.createElement('div');
        row.className = 'history-item';
        const title = document.createElement('strong');
        title.textContent = product.name;
        const details = document.createElement('span');
        details.textContent = `${product.stock <= 0 ? 'Agotado' : 'Stock bajo'} · Existencias: ${product.stock} · Mínimo: ${product.minimum}`;
        row.append(title, details);
        results.append(row);
      }
    } catch (error) {
      results.textContent = `No se pudo consultar el inventario: ${error.message}`;
    } finally {
      button.disabled = false;
    }
  });
}
