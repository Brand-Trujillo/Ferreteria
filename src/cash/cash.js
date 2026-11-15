import { formatMoney } from '../inventory/validation.js';
import { cashState, openCash, closeCash } from './storage.js';
import { parseInteger } from '../common/numbers.js';

const $ = selector => document.querySelector(selector);
function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function readAmount(input) {
  try { return parseInteger(input.value); }
  catch { throw new Error('Ingresa un valor válido en pesos enteros.'); }
}

export function setupCash() {
  let saving = false;
  async function render() {
    const error = $('#cash-error');
    try {
      const state = await cashState();
      error.textContent = '';
      $('#cash-state').textContent = state.active
        ? `Caja abierta desde ${new Date(state.active.openedAt).toLocaleString('es-CO')}`
        : 'Caja cerrada. Abre la caja para registrar ventas.';
      $('#open-cash-form').hidden = Boolean(state.active);
      $('#cash-current').hidden = !state.active;
      const summary = $('#cash-summary');
      summary.replaceChildren();
      if (state.active) {
        for (const [label, value] of [
          ['Efectivo inicial', state.active.opening], ['Ventas en efectivo', state.summary.cashSales],
          ['Abonos en efectivo', state.summary.cashCredit],
          ['Ingresos en efectivo', state.summary.income], ['Gastos en efectivo', state.summary.expense],
          ['Efectivo esperado', state.summary.expected]
        ]) {
          const card = node('div', 'report-stat', '');
          card.append(node('span', '', label), node('strong', '', formatMoney(value)));
          summary.append(card);
        }
      }
      const history = $('#cash-history');
      history.replaceChildren();
      if (!state.history.length) history.append(node('p', 'form-intro', 'Aún no hay cierres registrados.'));
      for (const session of state.history) {
        const row = node('div', 'history-item', '');
        row.append(
          node('strong', '', `Cierre · ${new Date(session.closedAt).toLocaleString('es-CO')}`),
          node('span', '', `Esperado: ${formatMoney(session.expected)} · Contado: ${formatMoney(session.counted)} · Diferencia: ${formatMoney(session.difference)}`),
          node('small', '', `${session.saleCount} venta(s) · Apertura: ${new Date(session.openedAt).toLocaleString('es-CO')}`)
        );
        history.append(row);
      }
    } catch (problem) {
      error.textContent = `No se pudo cargar la caja: ${problem.message}`;
    }
  }
  for (const [selector, input, action] of [
    ['#open-cash-form', 'opening', openCash],
    ['#close-cash-form', 'counted', closeCash]
  ]) {
    const form = $(selector);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (saving) return;
      const error = $('#cash-error');
      error.textContent = '';
      try {
        const amount = readAmount(form.elements[input]);
        saving = true;
        form.querySelector('button').disabled = true;
        await action(amount);
        form.reset();
        await render();
      } catch (problem) {
        error.textContent = problem.message || 'No se pudo actualizar la caja.';
      } finally {
        saving = false;
        form.querySelector('button').disabled = false;
      }
    });
  }
  return render;
}
