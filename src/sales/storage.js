import { openDatabase } from '../inventory/database.js';

export async function registerSale(sale, allowNegative) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['products', 'movements', 'sales', 'cashSessions'], 'readwrite');
    const products = tx.objectStore('products');
    const savedItems = [];
    let problem;
    let remaining = sale.items.length;
    const active = tx.objectStore('cashSessions').get('active');
    active.onsuccess = () => {
      if (!active.result) {
        problem = new Error('La caja está cerrada. Abre la caja antes de registrar una venta.');
        tx.abort();
        return;
      }
      sale.cashSessionId = active.result.sessionId;
      for (const item of sale.items) {
      const request = products.get(item.id);
      request.onsuccess = () => {
        const product = request.result;
        if (!product || product.price !== item.price) {
          problem = new Error('Un producto ya no existe o cambió de precio. Actualiza la venta e inténtalo de nuevo.');
          tx.abort();
          return;
        }
        if (product.stock < item.quantity && !allowNegative) {
          problem = new Error(`Stock insuficiente para ${product.name}. Revisa la venta y confirma si deseas continuar.`);
          tx.abort();
          return;
        }
        const after = product.stock - item.quantity;
        products.put({ ...product, stock: after, version: (product.version || 0) + 1 });
        tx.objectStore('movements').add({
          id: crypto.randomUUID(), productId: product.id, at: sale.at,
          before: product.stock, after, reason: 'Venta de prueba'
        });
        savedItems.push({ ...item, name: product.name, cost: product.cost, stockBefore: product.stock });
        if (--remaining === 0) tx.objectStore('sales').add({ ...sale, items: savedItems });
      };
      }
    };
    tx.oncomplete = () => resolve({ ...sale, items: savedItems });
    tx.onabort = () => reject(problem || tx.error || new Error('No se pudo registrar la venta.'));
  });
}

export async function readAll(store) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addCashEntry(entry) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['cashEntries', 'cashSessions'], 'readwrite');
    let problem;
    const request = tx.objectStore('cashSessions').get('active');
    request.onsuccess = () => {
      if (entry.affectsCash && !request.result) {
        problem = new Error('Abre la caja antes de registrar movimientos que afecten su efectivo.');
        tx.abort();
        return;
      }
      if (entry.affectsCash) entry.cashSessionId = request.result.sessionId;
      tx.objectStore('cashEntries').add(entry);
    };
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(problem || tx.error || new Error('No se pudo registrar el movimiento.'));
  });
}
