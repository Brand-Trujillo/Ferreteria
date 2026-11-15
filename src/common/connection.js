export function setupConnectionStatus() {
  const button = document.getElementById('connection-button');
  const label = document.getElementById('connection-label');
  const detail = document.getElementById('connection-detail');
  const dialog = document.getElementById('connection-dialog');

  function update() {
    const online = navigator.onLine;
    label.textContent = online ? 'Sin sincronizar' : 'Sin conexión';
    button.classList.toggle('connection-offline', !online);
    button.setAttribute('aria-label', online
      ? 'El navegador informa conexión; sincronización no disponible. Ver detalles.'
      : 'Sin conexión según el navegador; sincronización no disponible. Ver detalles.');
    detail.textContent = online
      ? 'El navegador indica que hay conexión, pero no se ha verificado el acceso a internet.'
      : 'El navegador indica que no hay conexión.';
  }

  button.addEventListener('click', () => dialog.showModal());
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}
