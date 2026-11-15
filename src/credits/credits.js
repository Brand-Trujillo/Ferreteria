import { readAll } from '../sales/storage.js';
import { formatMoney } from '../inventory/validation.js';
import { parseInteger } from '../common/numbers.js';
import { registerCreditPayment } from './storage.js';

const $ = selector => document.querySelector(selector);
const paymentNames = { cash: 'Efectivo', nequi: 'Nequi', daviplata: 'Daviplata', qr: 'QR', card: 'Tarjeta', breb: 'Bre-B o llave' };
function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function setupCredits() {
  const form = $('#credit-form');
  let credits = [];
  let selected;
  let saving = false;
  function draw() {
    const list = $('#credit-list');
    list.replaceChildren();
    const query = $('#credit-search').value.trim().toLocaleLowerCase('es');
    const visible = credits.filter(credit => credit.sale.customer.toLocaleLowerCase('es').includes(query));
    if (!visible.length) list.append(node('p', 'form-intro', 'No hay fiados para mostrar.'));
    for (const credit of visible) {
      const { sale, paid, remaining } = credit;
      const card = node('article', 'credit-card', '');
      card.append(
        node('strong', '', sale.customer),
        node('span', '', `Venta: ${new Date(sale.at).toLocaleString('es-CO')} · Referencia: ${sale.id.slice(0, 8)}`),
        node('span', '', `Crédito inicial: ${formatMoney(sale.balance)} · Abonos: ${formatMoney(paid)} · Pendiente: ${formatMoney(remaining)}`),
        node('span', remaining > 0 && sale.dueDate < localDate() ? 'credit-overdue' : '', remaining === 0 ? 'Pagado' : `Vence: ${sale.dueDate}${sale.dueDate < localDate() ? ' · Vencido' : ''}`)
      );
      if (credit.payments.length) {
        const history = node('details', 'credit-history', '');
        history.append(node('summary', '', `Ver ${credit.payments.length} abono(s)`));
        for (const payment of credit.payments) {
          history.append(node('p', '', `${new Date(payment.at).toLocaleString('es-CO')} · ${paymentNames[payment.method] || payment.method} · ${formatMoney(payment.amount)}`));
        }
        card.append(history);
      }
      if (remaining > 0) {
        const button = node('button', 'button button-outline small-button', 'Registrar abono');
        button.type = 'button';
        button.addEventListener('click', () => {
          selected = sale.id;
          form.reset();
          $('#credit-form-error').textContent = '';
          $('#credit-description').textContent = `${sale.customer} · Saldo pendiente: ${formatMoney(remaining)}`;
          $('#credit-dialog').showModal();
        });
        card.append(button);
      }
      list.append(card);
    }
  }
  async function render() {
    try {
      const [sales, payments] = await Promise.all([readAll('sales'), readAll('creditPayments')]);
      credits = sales.filter(sale => sale.balance > 0 && sale.customer).map(sale => {
        const history = payments.filter(payment => payment.saleId === sale.id).sort((a, b) => b.at.localeCompare(a.at));
        const paid = history.reduce((sum, payment) => sum + payment.amount, 0);
        return { sale, paid, remaining: sale.balance - paid, payments: history };
      }).sort((a, b) => b.sale.at.localeCompare(a.sale.at));
      $('#credit-error').textContent = '';
      draw();
    } catch (error) {
      $('#credit-error').textContent = `No se pudieron cargar los fiados: ${error.message}`;
    }
  }
  $('#credit-search').addEventListener('input', draw);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving) return;
    const button = form.querySelector('[type=submit]');
    $('#credit-form-error').textContent = '';
    try {
      let amount;
      try { amount = parseInteger(form.elements.amount.value, { min: 1 }); }
      catch { throw new Error('Ingresa un abono válido mayor que cero.'); }
      saving = true;
      button.disabled = true;
      await registerCreditPayment(selected, amount, form.elements.method.value);
      $('#credit-dialog').close();
      await render();
    } catch (error) {
      $('#credit-form-error').textContent = error.message || 'No se pudo guardar el abono.';
    } finally {
      saving = false;
      button.disabled = false;
    }
  });
  return render;
}
