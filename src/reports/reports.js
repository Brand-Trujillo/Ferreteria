import { formatMoney } from '../inventory/validation.js';
import { addCashEntry, readAll } from '../sales/storage.js';
import { parseInteger } from '../common/numbers.js';

const $ = selector => document.querySelector(selector);
const make = (tag, cls, text) => {
  const element = document.createElement(tag);
  if (cls) element.className = cls;
  element.textContent = text;
  return element;
};

function periodStart(period) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  if (period === 'week') date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  if (period === 'month') date.setDate(1);
  if (period === 'year') { date.setMonth(0); date.setDate(1); }
  return date;
}

export function setupReports() {
  const form = $('#entry-form');
  let saving = false;
  async function render() {
    try {
      const [allSales, allEntries, allPayments] = await Promise.all([readAll('sales'), readAll('cashEntries'), readAll('creditPayments')]);
      const start = periodStart($('#report-period').value);
      const now = new Date();
      const inPeriod = item => new Date(item.at) >= start && new Date(item.at) <= now;
      const sales = allSales.filter(inPeriod);
      const entries = allEntries.filter(inPeriod);
      const payments = allPayments.filter(inPeriod);
      const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
      const received = sales.reduce((sum, sale) => sum + sale.paid, 0);
      const debt = sales.reduce((sum, sale) => sum + sale.balance, 0);
      const collectedCredits = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const cost = sales.reduce((sum, sale) => sum + sale.items.reduce((subtotal, item) => subtotal + item.cost * item.quantity, 0), 0);
      const income = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
      const expense = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
      const summary = $('#report-summary');
      summary.replaceChildren();
      for (const [label, value] of [
        ['Ventas registradas', revenue], ['Cobrado en ventas', received], ['Crédito generado', debt],
        ['Abonos recibidos', collectedCredits],
        ['Ingresos adicionales', income], ['Gastos adicionales', expense],
        ['Resultado estimado de ventas', revenue - cost]
      ]) {
        const card = make('div', 'report-stat', '');
        card.append(make('span', '', label), make('strong', '', formatMoney(value)));
        summary.append(card);
      }
      const list = $('#report-list');
      list.replaceChildren();
      const movements = [
        ...sales.map(sale => ({ at: sale.at, title: 'Venta de prueba', detail: `${sale.items.length} producto(s) · Cobrado al vender ${formatMoney(sale.paid)}${sale.balance ? ` · Crédito inicial ${formatMoney(sale.balance)} · ${sale.customer} · vence ${sale.dueDate}` : ''}${sale.items.some(item => item.stockBefore < item.quantity) ? ' · Stock insuficiente' : ''}`, amount: sale.total })),
        ...payments.map(payment => ({ at: payment.at, title: 'Abono de crédito', detail: `${allSales.find(sale => sale.id === payment.saleId)?.customer || 'Venta no encontrada'} · ${payment.method}`, amount: payment.amount })),
        ...entries.map(entry => ({ at: entry.at, title: entry.type === 'income' ? 'Ingreso adicional' : 'Gasto adicional', detail: entry.description, amount: entry.amount }))
      ].sort((a, b) => b.at.localeCompare(a.at));
      if (!movements.length) list.append(make('p', 'form-intro', 'No hay movimientos en este periodo.'));
      for (const movement of movements) {
        const row = make('div', 'history-item', '');
        row.append(make('strong', '', `${movement.title} · ${formatMoney(movement.amount)}`), make('span', '', movement.detail), make('small', '', new Date(movement.at).toLocaleString('es-CO')));
        list.append(row);
      }
    } catch (error) {
      $('#report-list').replaceChildren(make('p', 'error', `No se pudieron cargar los reportes: ${error.message}`));
    }
  }
  $('#report-period').addEventListener('change', render);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving) return;
    const error = $('#entry-error');
    error.textContent = '';
    try {
      const description = form.elements.description.value.trim();
      if (!description) throw new Error('Ingresa un concepto.');
      let amount;
      try { amount = parseInteger(form.elements.amount.value, { min: 1 }); }
      catch { throw new Error('Ingresa un valor entero válido mayor que cero.'); }
      saving = true;
      form.querySelector('button').disabled = true;
      await addCashEntry({ id: crypto.randomUUID(), at: new Date().toISOString(), type: form.elements.type.value, description, amount, affectsCash: form.elements.affectsCash.checked });
      form.reset();
      await render();
    } catch (problem) {
      error.textContent = problem.message || 'No se pudo registrar el movimiento.';
    } finally {
      saving = false;
      form.querySelector('button').disabled = false;
    }
  });
  return render;
}
