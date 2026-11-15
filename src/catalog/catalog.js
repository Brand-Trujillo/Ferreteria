import { listProducts } from '../inventory/database.js';
import { formatMoney } from '../inventory/validation.js';

const BUSINESS = 'Ferrelectricos Cobos';
const FOOTER = 'Precios sujetos a cambios. Consulta disponibilidad.';

export function setupCatalog() {
  const $ = id => document.getElementById(id);
  const dialog = $('catalog-dialog');
  const category = $('catalog-category');
  const search = $('catalog-search');
  const message = $('catalog-message');
  const preview = $('catalog-preview');
  const status = $('catalog-status');
  let products = [];
  let selected = new Set();
  let categories = [];
  let loadId = 0;

  function selectedProducts() {
    return products.filter(product => selected.has(product.id));
  }

  function visibleProducts() {
    const query = search.value.trim().toLocaleLowerCase('es');
    const selectedCategory = category.value;
    return products.filter(product => {
      const matchesCategory = !selectedCategory ||
        (selectedCategory === 'none' ? !product.category : product.category === categories[Number(selectedCategory) - 1]);
      return matchesCategory && (product.name.toLocaleLowerCase('es').includes(query) ||
        (product.barcode || '').toLocaleLowerCase('es').includes(query));
    });
  }

  function updatePreview() {
    const items = selectedProducts();
    $('catalog-count').textContent = `${items.length} seleccionados`;
    preview.value = [
      BUSINESS.toUpperCase(), 'CATÁLOGO DE PRODUCTOS', '',
      ...(message.value.trim() ? [message.value.trim(), ''] : []),
      ...items.map(product => `• ${product.name} — ${formatMoney(product.price)}`),
      '', FOOTER
    ].join('\n');
  }

  function renderProducts() {
    const list = $('catalog-products');
    const visible = visibleProducts();
    list.replaceChildren();
    if (!visible.length) {
      const empty = document.createElement('p');
      empty.className = 'form-intro list-message';
      empty.textContent = products.length ? 'No hay productos para este filtro.' : 'No hay productos registrados.';
      list.append(empty);
    }
    for (const product of visible) {
      const row = document.createElement('label');
      row.className = 'catalog-product';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = selected.has(product.id);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selected.add(product.id);
        else selected.delete(product.id);
        updatePreview();
      });
      const name = document.createElement('span');
      name.textContent = product.name;
      const detail = document.createElement('small');
      detail.textContent = product.category || 'Sin categoría';
      name.append(detail);
      const price = document.createElement('strong');
      price.textContent = formatMoney(product.price);
      row.append(checkbox, name, price);
      list.append(row);
    }
    updatePreview();
  }

  function requireSelection() {
    status.textContent = '';
    if (selected.size) return true;
    status.textContent = 'Selecciona al menos un producto para compartir el catálogo.';
    return false;
  }

  $('open-catalog').addEventListener('click', async () => {
    const currentLoad = ++loadId;
    products = [];
    selected = new Set();
    categories = [];
    search.value = '';
    category.replaceChildren(new Option('Todas las categorías', ''));
    status.textContent = '';
    $('catalog-products').textContent = 'Cargando inventario…';
    updatePreview();
    dialog.showModal();
    try {
      const loaded = await listProducts();
      if (currentLoad !== loadId || !dialog.open) return;
      products = loaded;
      products.sort((a, b) => a.name.localeCompare(b.name, 'es'));
      selected = new Set(products.map(product => product.id));
      categories = [...new Set(products.map(product => product.category).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'es'));
      categories.forEach((name, index) => category.add(new Option(name, String(index + 1))));
      if (products.some(product => !product.category)) category.add(new Option('Sin categoría', 'none'));
      renderProducts();
    } catch (error) {
      if (currentLoad !== loadId || !dialog.open) return;
      $('catalog-products').textContent = '';
      status.textContent = `No se pudo cargar el inventario: ${error.message}`;
    }
  });

  search.addEventListener('input', renderProducts);
  category.addEventListener('change', renderProducts);
  message.addEventListener('input', updatePreview);
  $('catalog-select-visible').addEventListener('click', () => {
    visibleProducts().forEach(product => selected.add(product.id));
    renderProducts();
  });
  $('catalog-clear-visible').addEventListener('click', () => {
    visibleProducts().forEach(product => selected.delete(product.id));
    renderProducts();
  });
  $('catalog-copy').addEventListener('click', async () => {
    if (!requireSelection()) return;
    try {
      await navigator.clipboard.writeText(preview.value);
      status.textContent = 'Texto copiado. Ya puedes pegarlo en tu conversación.';
    } catch (error) {
      preview.focus();
      preview.select();
      status.textContent = 'No se pudo copiar automáticamente. Selecciona y copia el texto de la vista previa.';
    }
  });
  $('catalog-share').addEventListener('click', async () => {
    if (!requireSelection()) return;
    if (!navigator.share) {
      preview.focus();
      preview.select();
      status.textContent = 'Este navegador no permite compartir directamente. Usa «Copiar texto» o copia la vista previa.';
      return;
    }
    try {
      await navigator.share({ title: `Catálogo de ${BUSINESS}`, text: preview.value });
      status.textContent = 'Catálogo enviado a la opción para compartir.';
    } catch (error) {
      if (error.name !== 'AbortError') status.textContent = `No se pudo compartir: ${error.message}`;
    }
  });
  $('catalog-pdf').addEventListener('click', () => {
    if (!requireSelection()) return;
    const popup = window.open('', '_blank');
    if (!popup) {
      status.textContent = 'Permite las ventanas emergentes para preparar el PDF.';
      return;
    }
    popup.opener = null;
    const doc = popup.document;
    doc.documentElement.lang = 'es';
    doc.title = `Catálogo - ${BUSINESS}`;
    const style = doc.createElement('style');
    style.textContent = 'body{font-family:Arial,sans-serif;color:#1b2b40;margin:32px;line-height:1.5}h1{color:#14243a;margin-bottom:0}h2{font-size:18px;color:#d76a20;margin-top:4px}p{white-space:pre-wrap;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{text-align:left;padding:10px 6px;border-bottom:1px solid #ddd;overflow-wrap:anywhere}th:last-child,td:last-child{text-align:right;white-space:nowrap}tr{break-inside:avoid}.hint{background:#fff8ec;padding:12px}@media print{.hint{display:none}body{margin:0}}';
    doc.head.append(style);
    const heading = doc.createElement('h1');
    heading.textContent = BUSINESS;
    const title = doc.createElement('h2');
    title.textContent = 'Catálogo de productos';
    const intro = doc.createElement('p');
    intro.textContent = message.value.trim();
    const hint = doc.createElement('p');
    hint.className = 'hint';
    hint.textContent = 'En la ventana de impresión, selecciona «Guardar como PDF». Después podrás compartir el archivo.';
    const table = doc.createElement('table');
    const header = table.createTHead().insertRow();
    for (const text of ['Producto', 'Precio de venta']) {
      const th = doc.createElement('th');
      th.scope = 'col';
      th.textContent = text;
      header.append(th);
    }
    const body = table.createTBody();
    for (const product of selectedProducts()) {
      const row = body.insertRow();
      row.insertCell().textContent = product.name;
      row.insertCell().textContent = formatMoney(product.price);
    }
    const footer = doc.createElement('p');
    footer.textContent = FOOTER;
    doc.body.append(hint, heading, title, intro, table, footer);
    popup.print();
    status.textContent = 'Elige «Guardar como PDF» en la ventana de impresión y comparte el archivo guardado.';
  });
}
