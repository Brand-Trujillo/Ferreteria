import { openDatabase } from '../inventory/database.js';

function calculate(session, sales, entries, creditPayments) {
  const cashSales = sales.reduce((sum, sale) => sum + sale.payments.cash, 0);
  const income = entries.filter(entry => entry.type === 'income').reduce((sum, entry) => sum + entry.amount, 0);
  const expense = entries.filter(entry => entry.type === 'expense').reduce((sum, entry) => sum + entry.amount, 0);
  const cashCredit = creditPayments.filter(payment => payment.method === 'cash').reduce((sum, payment) => sum + payment.amount, 0);
  const expected = session.opening + cashSales + cashCredit + income - expense;
  if (![cashSales, cashCredit, income, expense, expected].every(Number.isSafeInteger)) throw new Error('Los valores de caja superan el límite seguro.');
  return { cashSales, cashCredit, income, expense, expected, saleCount: sales.length };
}

export async function openCash(opening) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cashSessions', 'readwrite');
    const store = tx.objectStore('cashSessions');
    let problem;
    const request = store.get('active');
    request.onsuccess = () => {
      if (request.result) {
        problem = new Error('Ya hay una caja abierta en este dispositivo.');
        tx.abort();
        return;
      }
      store.add({ id: 'active', sessionId: crypto.randomUUID(), openedAt: new Date().toISOString(), opening });
    };
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(problem || tx.error || new Error('No se pudo abrir la caja.'));
  });
}

function gather(tx, session, callback) {
  const sales = tx.objectStore('sales').index('cashSessionId').getAll(session.sessionId);
  const entries = tx.objectStore('cashEntries').index('cashSessionId').getAll(session.sessionId);
  const payments = tx.objectStore('creditPayments').index('cashSessionId').getAll(session.sessionId);
  let salesValue;
  let entriesValue;
  let paymentsValue;
  const done = () => {
    if (salesValue && entriesValue && paymentsValue) callback(salesValue, entriesValue, paymentsValue);
  };
  sales.onsuccess = () => { salesValue = sales.result; done(); };
  entries.onsuccess = () => { entriesValue = entries.result; done(); };
  payments.onsuccess = () => { paymentsValue = payments.result; done(); };
}

export async function cashState() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['cashSessions', 'sales', 'cashEntries', 'creditPayments'], 'readonly');
    const store = tx.objectStore('cashSessions');
    const active = store.get('active');
    const all = store.getAll();
    let summary;
    let problem;
    active.onsuccess = () => {
      if (active.result) gather(tx, active.result, (sales, entries, payments) => {
        try { summary = calculate(active.result, sales, entries, payments); }
        catch (error) { problem = error; tx.abort(); }
      });
    };
    tx.oncomplete = () => resolve({
      active: active.result, summary,
      history: all.result.filter(item => item.id !== 'active').sort((a, b) => b.closedAt.localeCompare(a.closedAt))
    });
    tx.onabort = () => reject(problem || tx.error || new Error('No se pudo consultar la caja.'));
  });
}

export async function closeCash(counted) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['cashSessions', 'sales', 'cashEntries', 'creditPayments'], 'readwrite');
    const store = tx.objectStore('cashSessions');
    let problem;
    const request = store.get('active');
    request.onsuccess = () => {
      const session = request.result;
      if (!session) {
        problem = new Error('La caja ya está cerrada.');
        tx.abort();
        return;
      }
      gather(tx, session, (sales, entries, payments) => {
        try {
          const summary = calculate(session, sales, entries, payments);
          const difference = counted - summary.expected;
          if (!Number.isSafeInteger(difference)) throw new Error('La diferencia supera el límite seguro.');
          store.add({ ...session, ...summary, id: session.sessionId, closedAt: new Date().toISOString(), counted, difference });
          store.delete('active');
        } catch (error) {
          problem = error;
          tx.abort();
        }
      });
    };
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(problem || tx.error || new Error('No se pudo cerrar la caja.'));
  });
}
