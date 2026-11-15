import { listProducts, listMovements, saveProduct } from './inventory/database.js';
import { formatMoney, stockStatus, validateProduct } from './inventory/validation.js';
import { Scanner } from './scanner/scanner.js';
import { setupSales } from './sales/sales.js';
import { setupReports } from './reports/reports.js';
import { setupCash } from './cash/cash.js';
import { formatInteger, setupIntegerInput } from './common/numbers.js';
import { setupConnectionStatus } from './common/connection.js';
import { setupOffline } from './common/offline.js';
import { setupBackup } from './backup/backup.js';
import { setupStockCheck } from './inventory/stock-check.js';
import { setupCredits } from './credits/credits.js';
import { setupCatalog } from './catalog/catalog.js';

document.querySelectorAll('[data-integer]').forEach(setupIntegerInput);
setupConnectionStatus();
setupOffline();
setupBackup();
setupStockCheck();
setupCatalog();

const $ = selector => document.querySelector(selector);
const form = $('#product-form');
const dialog = $('#product-dialog');
const search = $('#search');
const filter = $('#filter');
const scanner = new Scanner($('#scanner-dialog'), $('#scanner-video'), $('#scanner-message'));
const renderReports = setupReports();
const renderCash = setupCash();
const renderCredits = setupCredits();
let products = [];
let editing = null;
let saving = false;

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function displayError(message) {
  const list = $('#product-list');
  list.replaceChildren(node('p', 'error list-message', message));
}

async function refresh() {
  try {
    products = await listProducts();
    products.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    render();
  } catch (error) {
    displayError(`No se pudo cargar el inventario: ${error.message}.`);
  }
}

function render() {
  $('#total-products').textContent = products.length;
  $('#low-products').textContent = products.filter(p => stockStatus(p) === 'low').length;
  $('#empty-products').textContent = products.filter(p => stockStatus(p) === 'empty').length;
  const query = search.value.trim().toLocaleLowerCase('es');
  const visible = products.filter(p => {
    const matches = p.name.toLocaleLowerCase('es').includes(query) || (p.barcode || '').toLocaleLowerCase('es').includes(query);
    return matches && (filter.value === 'all' || stockStatus(p) === filter.value);
  });
  const list = $('#product-list');
  list.replaceChildren();
  if (!visible.length) {
    const empty = node('div', 'empty-state');
    empty.append(node('span', 'empty-icon', '▦'), node('h3', '', products.length ? 'No encontramos productos' : 'Tu inventario comienza aquí'), node('p', '', products.length ? 'Prueba con otro nombre, código o filtro.' : 'Agrega tu primer producto para empezar a organizar tu negocio.'));
    list.append(empty);
    return;
  }
  for (const product of visible) {
    const card = node('article', 'product-card');
    const identity = node('div', 'product-identity');
    const icon = node('span', 'product-icon', '▦');
    const description = node('div', 'product-description');
    description.append(node('h3', '', product.name), node('p', '', `${product.barcode ? `Código: ${product.barcode}` : 'Sin código de barras'}${product.category ? ` · ${product.category}` : ''}`));
    identity.append(icon, description);
    const details = node('div', 'product-details');
    const status = stockStatus(product);
    const stock = node('div', 'detail');
    stock.append(node('span', '', 'Existencias'), node('strong', '', `${product.stock} unidades`));
    const price = node('div', 'detail');
    price.append(node('span', '', 'Precio de venta'), node('strong', '', formatMoney(product.price)));
    const badge = node('span', `status ${status}`, status === 'empty' ? 'Agotado' : status === 'low' ? 'Stock bajo' : 'Disponible');
    details.append(stock, price, badge);
    const actions = node('div', 'product-actions');
    const history = node('button', 'text-button', 'Historial');
    history.type = 'button';
    history.addEventListener('click', () => showHistory(product));
    const edit = node('button', 'button button-outline small-button', 'Editar');
    edit.type = 'button';
    edit.addEventListener('click', () => openForm(product));
    actions.append(history, edit);
    card.append(identity, details, actions);
    list.append(card);
  }
}

function openForm(product = null) {
  editing = product;
  form.reset();
  $('#form-error').textContent = '';
  $('#form-title').textContent = product ? 'Editar producto' : 'Agregar producto';
  $('#reason-field').hidden = !product;
  if (product) {
    for (const key of ['name', 'barcode', 'cost', 'price', 'stock', 'minimum', 'supplier', 'category']) {
      form.elements[key].value = ['cost', 'price', 'stock', 'minimum'].includes(key) ? formatInteger(product[key]) : (product[key] ?? '');
    }
  }
  dialog.showModal();
  form.elements.name.focus();
}

async function showHistory(product) {
  const list = $('#history-list');
  list.replaceChildren(node('p', 'form-intro', `Movimientos de ${product.name}`));
  $('#history-dialog').showModal();
  try {
    const movements = await listMovements(product.id);
    if (!movements.length) list.append(node('p', 'list-message', 'No hay movimientos registrados.'));
    for (const movement of movements) {
      const item = node('div', 'history-item');
      item.append(node('strong', '', `${movement.before} → ${movement.after} unidades`), node('span', '', movement.reason), node('small', '', new Date(movement.at).toLocaleString('es-CO')));
      list.append(item);
    }
  } catch (error) {
    list.append(node('p', 'error', `No se pudo cargar el historial: ${error.message}.`));
  }
}

$('#new-product').addEventListener('click', () => openForm());
$('#new-product-secondary').addEventListener('click', () => openForm());
search.addEventListener('input', render);
filter.addEventListener('change', render);
$('#scan-search').addEventListener('click', () => scanner.open(code => { search.value = code; render(); }));
$('#scan-product').addEventListener('click', () => scanner.open(code => { form.elements.barcode.value = code; }));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (saving) return;
  $('#form-error').textContent = '';
  const submit = form.querySelector('[type=submit]');
  try {
    const validated = validateProduct(new FormData(form));
    saving = true;
    submit.disabled = true;
    await saveProduct({ ...validated, favorite: editing?.favorite || false, id: editing?.id || crypto.randomUUID(), version: editing?.version }, form.elements.reason.value.trim());
    dialog.close();
    await refresh();
  } catch (error) {
    $('#form-error').textContent = error.message || 'No se pudo guardar el producto.';
  } finally {
    saving = false;
    submit.disabled = false;
  }
});

window.addEventListener('focus', refresh);
const sales = setupSales({ getProducts: () => products, refresh, scanner, onSaved: renderReports });

function navigate() {
  const labels = { inventario: 'Inventario', ventas: 'Ventas', caja: 'Caja', creditos: 'Fiados', reportes: 'Reportes', herramientas: 'Herramientas' };
  const section = Object.hasOwn(labels, location.hash.slice(1)) ? location.hash.slice(1) : 'ventas';
  for (const name of Object.keys(labels)) {
    document.getElementById(name).hidden = name !== section;
  }
  document.querySelector('.topbar h1').textContent = labels[section];
  document.title = `Ferrelectricos Cobos · ${labels[section]}`;
  document.querySelectorAll('.sidebar a:not(.brand), .mobile-nav a').forEach(link => {
    if (link.closest('.sidebar')) link.classList.add('nav-link');
    link.classList.toggle('nav-active', link.getAttribute('href') === `#${section}`);
    if (link.getAttribute('href') === `#${section}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (section === 'ventas') { refresh().then(sales.renderResults); }
  if (section === 'reportes') renderReports();
  if (section === 'caja') renderCash();
  if (section === 'creditos') renderCredits();
}
window.addEventListener('hashchange', navigate);
navigate();
refresh();
