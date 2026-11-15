export class Scanner {
  constructor(dialog, video, message) {
    this.dialog = dialog;
    this.video = video;
    this.message = message;
    this.stream = null;
    this.frame = null;
    this.session = 0;
    dialog.addEventListener('close', () => this.stop());
  }

  async open(onCode) {
    this.dialog.showModal();
    this.message.textContent = 'Solicitando acceso a la cámara…';
    const session = ++this.session;
    try {
      if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('El escáner no está disponible en este navegador o conexión. Puedes escribir el código manualmente o usar un lector físico.');
      }
      const supported = await BarcodeDetector.getSupportedFormats();
      const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'].filter(item => supported.includes(item));
      if (!formats.length) throw new Error('Este navegador no admite los formatos de códigos de barras necesarios. Escribe el código manualmente.');
      const detector = new BarcodeDetector({ formats });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (session !== this.session || !this.dialog.open) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      this.video.srcObject = stream;
      await this.video.play();
      if (session !== this.session) return;
      this.message.textContent = 'Buscando código…';
      const detect = async () => {
        if (session !== this.session || !this.dialog.open) return;
        try {
          const codes = await detector.detect(this.video);
          if (session !== this.session || !this.dialog.open) return;
          if (codes[0]?.rawValue) {
            const value = codes[0].rawValue;
            this.dialog.close();
            onCode(value);
            return;
          }
          this.frame = requestAnimationFrame(detect);
        } catch {
          this.message.textContent = 'No se pudo leer el código. Cierra la cámara y escríbelo manualmente.';
          this.stop();
        }
      };
      this.frame = requestAnimationFrame(detect);
    } catch (error) {
      if (session === this.session) {
        this.message.textContent = error.message || 'No se pudo abrir la cámara. Revisa los permisos o ingresa el código manualmente.';
        this.stop();
      }
    }
  }

  stop() {
    this.session++;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    this.video.srcObject = null;
  }
}
