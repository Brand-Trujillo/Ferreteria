import { openDatabase } from '../inventory/database.js';

const stores = ['products', 'movements', 'sales', 'cashEntries', 'cashSessions', 'creditPayments'];

export async function exportBackup() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, 'readonly');
    const data = {};
    for (const name of stores) {
      const request = tx.objectStore(name).getAll();
      request.onsuccess = () => { data[name] = request.result; };
    }
    tx.oncomplete = () => resolve({
      format: 'ferrelectricos-cobos-backup',
      version: 1,
      databaseVersion: db.version,
      exportedAt: new Date().toISOString(),
      data
    });
    tx.onabort = () => reject(tx.error || new Error('No se pudo leer la información para la copia.'));
  });
}

export function setupBackup() {
  const button = document.getElementById('backup-download');
  const status = document.getElementById('backup-status');
  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = 'Preparando copia…';
    try {
      const backup = await exportBackup();
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `cobos-respaldo-${backup.exportedAt.slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      status.textContent = 'Copia preparada. Comprueba que se haya descargado y guárdala en un lugar seguro.';
    } catch (error) {
      status.textContent = `No se pudo crear la copia: ${error.message}`;
    } finally {
      button.disabled = false;
    }
  });
}
