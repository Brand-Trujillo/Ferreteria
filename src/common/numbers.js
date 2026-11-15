export function parseInteger(value, { min = 0, max = 999999999999, optional = false } = {}) {
  const raw = String(value).trim();
  if (optional && !raw) return 0;
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(raw)) throw new Error('Ingresa un número entero válido.');
  const number = Number(raw.replaceAll('.', ''));
  if (!Number.isSafeInteger(number) || number < min || number > max) throw new Error('Ingresa un número dentro del límite permitido.');
  return number;
}

export function formatInteger(value) {
  const raw = String(value);
  if (!/^\d+$/.test(raw)) return raw;
  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function setupIntegerInput(input) {
  input.addEventListener('input', event => {
    const raw = input.value;
    const valid = raw === '' || /^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(raw);
    if ((!valid && (event.inputType === 'insertFromPaste' || event.inputType === 'insertReplacementText' || (event.data && /\D/.test(event.data)))) || (input.dataset.invalidInteger === 'true' && !valid)) {
      input.dataset.invalidInteger = 'true';
      return;
    }
    if (!/^[\d.]*$/.test(raw)) {
      input.dataset.invalidInteger = 'true';
      return;
    }
    delete input.dataset.invalidInteger;
    const digits = raw.replaceAll('.', '');
    const before = raw.slice(0, input.selectionStart).replaceAll('.', '').length;
    const formatted = formatInteger(digits);
    input.value = formatted;
    let position = 0;
    let count = 0;
    while (position < formatted.length && count < before) {
      if (/\d/.test(formatted[position])) count++;
      position++;
    }
    input.setSelectionRange(position, position);
  });
}
