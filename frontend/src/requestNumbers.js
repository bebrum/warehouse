export const REQUEST_NUMBER_PATTERN = /^[A-ZА-ЯЁ]\d-\d{5}\/\d{2}$/i;

export function normalizeRequestNumber(value) {
  return String(value || '').trim().toUpperCase();
}

export function parseRequestNumbers(value) {
  const unique = [];
  String(value || '')
    .split(/[\s,;]+/)
    .map(normalizeRequestNumber)
    .filter(Boolean)
    .forEach((number) => {
      if (!unique.includes(number)) unique.push(number);
    });
  return unique;
}

export function invalidRequestNumbers(numbers) {
  return numbers.filter((number) => !REQUEST_NUMBER_PATTERN.test(number));
}

export function formatRequestNumbersError(numbers) {
  const invalid = invalidRequestNumbers(numbers);
  if (!invalid.length) return '';
  return `Неверный формат: ${invalid.join(', ')}. Нужно как В3-00516/26.`;
}
