import { openDatabase } from '../inventory/database.js';

export async function registerCreditPayment(saleId, amount, method) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || !['cash', 'nequi', 'daviplata', 'qr', 'card', 'breb'].includes(method)) {
    throw new Error('El monto o el medio de pago no es válido.');
  }
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['sales', 'creditPayments', 'cashSessions'], 'readwrite');
    const sales = tx.objectStore('sales');
    const payments = tx.objectStore('creditPayments');
    const saleRequest = sales.get(saleId);
    const paymentRequest = payments.index('saleId').getAll(saleId);
    const cashRequest = tx.objectStore('cashSessions').get('active');
    let problem;
    let sale;
    let previous;
    let active;
    let ready = 0;
    const process = () => {
      if (++ready !== 3) return;
      if (!active) problem = new Error('Abre la caja antes de registrar un abono.');
      else if (!sale || !Number.isSafeInteger(sale.balance) || sale.balance <= 0) problem = new Error('No se encontró una venta a crédito válida.');
      else {
        const alreadyPaid = previous.reduce((sum, payment) => sum + payment.amount, 0);
        const remaining = sale.balance - alreadyPaid;
        if (!Number.isSafeInteger(alreadyPaid) || remaining < 0) problem = new Error('El historial de abonos no es válido.');
        else if (amount > remaining) problem = new Error('El abono supera el saldo pendiente. Actualiza la lista.');
      }
      if (problem) { tx.abort(); return; }
      payments.add({ id: crypto.randomUUID(), saleId, amount, method, at: new Date().toISOString(), cashSessionId: active.sessionId });
    };
    saleRequest.onsuccess = () => { sale = saleRequest.result; process(); };
    paymentRequest.onsuccess = () => { previous = paymentRequest.result; process(); };
    cashRequest.onsuccess = () => { active = cashRequest.result; process(); };
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(problem || tx.error || new Error('No se pudo registrar el abono.'));
  });
}
