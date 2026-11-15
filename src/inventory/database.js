const DB_NAME = 'ferreteria-inventario';
let databasePromise;

export function openDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('products')) {
          const products = db.createObjectStore('products', { keyPath: 'id' });
          products.createIndex('barcode', 'barcode', { unique: true });
          const movements = db.createObjectStore('movements', { keyPath: 'id' });
          movements.createIndex('productId', 'productId');
        }
        if (!db.objectStoreNames.contains('sales')) db.createObjectStore('sales', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('cashEntries')) db.createObjectStore('cashEntries', { keyPath: 'id' });
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); databasePromise = undefined; };
        resolve(db);
      };
      request.onerror = () => { databasePromise = undefined; reject(request.error); };
      request.onblocked = () => { databasePromise = undefined; reject(new Error('Cierra otras pestañas de la app e inténtalo de nuevo.')); };
    });
  }
  return databasePromise;
}

export async function listProducts() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction('products').objectStore('products').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listMovements(productId) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction('movements').objectStore('movements').index('productId').getAll(productId);
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.at.localeCompare(a.at)));
    request.onerror = () => reject(request.error);
  });
}

export async function saveProduct(product, reason) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['products', 'movements'], 'readwrite');
    const products = tx.objectStore('products');
    const get = products.get(product.id);
    let problem;
    get.onsuccess = () => {
      const previous = get.result;
      if ((previous && previous.version !== product.version) || (!previous && product.version)) {
        problem = new Error('El producto cambió en otra pestaña. Cierra el formulario y vuelve a abrirlo.');
        tx.abort();
        return;
      }
      if (previous && previous.stock !== product.stock && !reason) {
        problem = new Error('Indica el motivo del cambio de stock.');
        tx.abort();
        return;
      }
      const saved = { ...product, version: (previous?.version || 0) + 1 };
      if (!saved.barcode) delete saved.barcode;
      products.put(saved);
      if (!previous || previous.stock !== saved.stock) {
        tx.objectStore('movements').add({
          id: crypto.randomUUID(), productId: saved.id, at: new Date().toISOString(),
          before: previous ? previous.stock : 0, after: saved.stock,
          reason: previous ? reason : 'Registro inicial'
        });
      }
    };
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(problem || (tx.error?.name === 'ConstraintError' ? new Error('Este código de barras ya pertenece a otro producto.') : tx.error || new Error('No se pudo guardar el producto.')));
    tx.onerror = () => {};
  });
}
