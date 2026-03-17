export function capitalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
