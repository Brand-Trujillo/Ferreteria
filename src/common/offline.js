export function setupOffline() {
  const status = document.getElementById('offline-status');
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    status.textContent = 'El modo sin conexión requiere un navegador compatible y una conexión segura (HTTPS o localhost).';
    return;
  }
  navigator.serviceWorker.register('./sw.js').then(registration => {
    const show = () => {
      status.textContent = navigator.serviceWorker.controller
        ? 'El modo sin conexión está activado en este navegador. La disponibilidad puede variar si se borran sus datos; no hay sincronización.'
        : 'Preparando los archivos para uso sin conexión. Es posible que debas recargar con internet.';
    };
    if (registration.waiting) status.textContent = 'Hay una actualización preparada; cierra las demás pestañas y vuelve a abrir la app para aplicarla.';
    else show();
    navigator.serviceWorker.addEventListener('controllerchange', show);
  }).catch(error => {
    status.textContent = `No se pudo preparar el acceso sin conexión: ${error.message}`;
  });
}
