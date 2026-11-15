import { formatMoney } from '../inventory/validation.js';
import { registerSale } from './storage.js';
import { saveProduct } from '../inventory/database.js';
import { formatInteger, parseInteger, setupIntegerInput } from '../common/numbers.js';

const methods = { cash: 'Efectivo', nequi: 'Nequi', daviplata: 'Daviplata', qr: 'QR', card: 'Tarjeta', breb: 'Bre-B o llave' };
const $ = selector => document.querySelector(selector);
const make = (tag, cls, text) => {
  const element = document.createElement(tag);
  if (cls) element.className = cls;
  if (text !== undefined) element.textContent = text;
  return element;
};

export function setupSales({ getProducts, refresh, scanner, onSaved }) {
  let cart = new Map();
  let saving = false;
  let receipt = '';
  const form = $('#checkout-form');
  const search = $('#sale-search');
  const category = $('#sale-category');
  const favorites = $('#sale-favorites');

  function renderResults() {
    const target = $('#sale-results');
    target.replaceChildren();
    const query = search.value.trim().toLocaleLowerCase('es');
    const selectedCategory = category.value;
    const categories = [...new Set(getProducts().map(p => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    category.replaceChildren(new Option('Todas las categorías', ''));
    for (const name of categories) category.add(new Option(name, name));
    category.value = categories.includes(selectedCategory) ? selectedCategory : '';
    const favoritesOnly = favorites.getAttribute('aria-pressed') === 'true';
    if (!query && !category.value && !favoritesOnly) {
      target.append(make('p', 'form-intro', 'Escribe un nombre o código, usa el escáner o consulta tus favoritos.'));
      return;
    }
    const matches = getProducts().filter(p => (p.name.toLocaleLowerCase('es').includes(query) || (p.barcode || '').toLocaleLowerCase('es').includes(query)) && (!category.value || p.category === category.value) && (!favoritesOnly || p.favorite)).slice(0, 20);
    if (!matches.length) target.append(make('p', 'form-intro', 'No encontramos productos con esa búsqueda.'));
    for (const product of matches) {
      const row = make('div', 'sale-result');
      const info = make('div');
      info.append(make('strong', '', product.name), make('small', '', `${formatMoney(product.price)} · Stock: ${product.stock}${product.category ? ` · ${product.category}` : ''}`));
      const add = make('button', 'button button-outline small-button', '＋ Agregar');
      add.type = 'button';
      add.addEventListener('click', () => {
        const current = cart.get(product.id);
        cart.set(product.id, { id: product.id, name: product.name, price: product.price, quantity: (current?.quantity || 0) + 1 });
        renderCart();
      });
      const star = make('button', 'text-button favorite-button', product.favorite ? '★' : '☆');
      star.type = 'button';
      star.setAttribute('aria-label', `${product.favorite ? 'Quitar de' : 'Agregar a'} favoritos: ${product.name}`);
      star.addEventListener('click', async () => {
        star.disabled = true;
        try {
          await saveProduct({ ...product, favorite: !product.favorite }, '');
          await refresh();
          renderResults();
        } catch (error) {
          target.prepend(make('p', 'error', `No se pudo actualizar el favorito: ${error.message}`));
          star.disabled = false;
        }
      });
      row.append(info, star, add);
      target.append(row);
    }
  }

  function total() {
    return [...cart.values()].reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  function renderCart() {
    const container = $('#cart');
    container.replaceChildren();
    if (!cart.size) container.append(make('p', 'form-intro', 'Aún no has agregado productos.'));
    for (const item of cart.values()) {
      const row = make('div', 'cart-row');
      const info = make('div', 'cart-name');
      info.append(make('strong', '', item.name), make('small', '', `${formatMoney(item.price)} por unidad`));
      const quantity = make('input', 'quantity');
      quantity.type = 'text';
      quantity.inputMode = 'numeric';
      quantity.value = formatInteger(item.quantity);
      setupIntegerInput(quantity);
      quantity.setAttribute('aria-label', `Cantidad de ${item.name}`);
      quantity.addEventListener('change', () => {
        let n;
        try { n = parseInteger(quantity.value, { min: 1, max: 999999 }); }
        catch {
          quantity.setCustomValidity('Ingresa una cantidad entera entre 1 y 999.999.');
          quantity.reportValidity();
          return;
        }
        quantity.setCustomValidity('');
        item.quantity = n;
        renderCart();
      });
      quantity.addEventListener('input', () => quantity.setCustomValidity(''));
      const remove = make('button', 'text-button', 'Quitar');
      remove.type = 'button';
      remove.addEventListener('click', () => { cart.delete(item.id); renderCart(); });
      row.append(info, quantity, make('strong', '', formatMoney(item.price * item.quantity)), remove);
      container.append(row);
    }
    $('#sale-total').textContent = formatMoney(total());
    $('#checkout').disabled = !cart.size;
  }

  function values() {
    function amount(name, label) {
      try { return parseInteger(form.elements[name].value, { optional: true }); }
      catch { throw new Error(`Ingresa un valor válido en ${label}, en pesos enteros.`); }
    }
    const payments = {};
    for (const [name, label] of Object.entries(methods)) {
      if (name === 'cash') continue;
      payments[name] = amount(name, label);
    }
    const tendered = amount('tendered', 'Efectivo recibido');
    const electronic = Object.values(payments).reduce((a, b) => a + b, 0);
    if (!Number.isSafeInteger(electronic) || electronic > total()) throw new Error('Los pagos electrónicos no pueden superar el total de la venta.');
    payments.cash = Math.min(tendered, total() - electronic);
    const paid = electronic + payments.cash;
    return { payments, paid, tendered, change: tendered - payments.cash, balance: total() - paid };
  }

  function updatePaymentSummary() {
    try {
      const value = values();
      $('#payment-summary').textContent = `Efectivo aplicado: ${formatMoney(value.payments.cash)} · Pagado: ${formatMoney(value.paid)} · Saldo: ${formatMoney(value.balance)} · Vueltas: ${formatMoney(value.change)}`;
    } catch (error) {
      $('#payment-summary').textContent = error.message;
    }
  }

  function checkStock() {
    const shortages = [...cart.values()].filter(item => {
      const product = getProducts().find(p => p.id === item.id);
      return !product || product.stock < item.quantity;
    });
    $('#stock-confirm-label').hidden = !shortages.length;
    return shortages;
  }

  search.addEventListener('input', renderResults);
  category.addEventListener('change', renderResults);
  favorites.addEventListener('click', () => {
    const enabled = favorites.getAttribute('aria-pressed') !== 'true';
    favorites.setAttribute('aria-pressed', String(enabled));
    favorites.textContent = enabled ? '★ Favoritos' : '☆ Favoritos';
    renderResults();
  });
  $('#sale-scan').addEventListener('click', () => scanner.open(code => { search.value = code; renderResults(); }));
  $('#checkout').addEventListener('click', async () => {
    const invalidQuantity = $('#cart .quantity:invalid');
    if (invalidQuantity) { invalidQuantity.reportValidity(); return; }
    await refresh();
    if (!cart.size) return;
    if (!Number.isSafeInteger(total())) { alert('El total es demasiado alto. Revisa las cantidades.'); return; }
    form.reset();
    $('#checkout-error').textContent = '';
    $('#checkout-total').textContent = `Total: ${formatMoney(total())}`;
    checkStock();
    updatePaymentSummary();
    $('#checkout-dialog').showModal();
  });
  form.addEventListener('input', () => {
    $('#checkout-error').textContent = '';
    updatePaymentSummary();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving) return;
    const submit = form.querySelector('[type=submit]');
    $('#checkout-error').textContent = '';
    try {
      const payment = values();
      const customer = form.elements.customer.value.trim();
      const dueDate = form.elements.dueDate.value;
      if (payment.balance && (!customer || !dueDate)) throw new Error('Para una venta a crédito ingresa el cliente y la fecha límite.');
      if (checkStock().length && !form.elements.confirmStock.checked) throw new Error('Confirma que deseas vender con stock insuficiente.');
      saving = true;
      submit.disabled = true;
      const sale = await registerSale({
        id: crypto.randomUUID(), at: new Date().toISOString(), items: [...cart.values()],
        total: total(), ...payment, customer, dueDate
      }, form.elements.confirmStock.checked);
      cart = new Map();
      form.reset();
      $('#checkout-dialog').close();
      await refresh();
      renderCart();
      renderResults();
      await onSaved();
      receipt = [
        'FERRELECTRICOS COBOS · COMPROBANTE DE PRUEBA',
        new Date(sale.at).toLocaleString('es-CO'),
        `Referencia: ${sale.id}`,
        '',
        ...sale.items.map(item => `${item.quantity} x ${item.name}  ${formatMoney(item.price * item.quantity)}`),
        '', `TOTAL: ${formatMoney(sale.total)}`,
        ...Object.entries(sale.payments).filter(([, amount]) => amount > 0).map(([method, amount]) => `${methods[method]}: ${formatMoney(amount)}`),
        `Vueltas: ${formatMoney(sale.change)}`,
        ...(sale.balance ? [`Saldo pendiente: ${formatMoney(sale.balance)}`, `Cliente: ${sale.customer}`, `Fecha límite: ${sale.dueDate}`] : []),
        '', 'No es factura electrónica.'
      ].join('\n');
      $('#receipt-text').textContent = receipt;
      $('#receipt-error').textContent = '';
      $('#receipt-dialog').showModal();
    } catch (error) {
      $('#checkout-error').textContent = error.message || 'No se pudo registrar la venta.';
      await refresh();
      checkStock();
    } finally {
      saving = false;
      submit.disabled = false;
    }
  });
  $('#share-receipt').addEventListener('click', async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Comprobante de prueba', text: receipt });
      else {
        const popup = window.open(`https://wa.me/?text=${encodeURIComponent(receipt)}`, '_blank');
        if (popup) popup.opener = null;
        if (!popup) $('#receipt-error').textContent = 'Si no se abrió WhatsApp, permite las ventanas emergentes y vuelve a intentar.';
      }
    } catch (error) {
      if (error.name !== 'AbortError') $('#receipt-error').textContent = `No se pudo compartir: ${error.message}`;
    }
  });
  $('#print-receipt').addEventListener('click', () => {
    const popup = window.open('', '_blank');
    if (!popup) { $('#receipt-error').textContent = 'Permite las ventanas emergentes para imprimir el comprobante.'; return; }
    popup.document.title = 'Comprobante de prueba';
    const pre = popup.document.createElement('pre');
    pre.style.whiteSpace = 'pre-wrap';
    pre.textContent = receipt;
    popup.document.body.append(pre);
    popup.print();
  });
  renderCart();
  renderResults();
  return { renderResults };
}
