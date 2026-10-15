/** The first letters of the first and last names, such as "JD" for "Jennifer A. Doudna". */
export function initials(name: string): string {
  const words = name
    .split(/[\s.]+/)
    .map((w) => Array.from(w).find((ch) => /\p{L}/u.test(ch)))
    .filter((ch): ch is string => ch !== undefined);
  if (words.length === 0) return '?';
  const letters = words.length === 1 ? [words[0]!] : [words[0]!, words[words.length - 1]!];
  return letters.join('').toLocaleUpperCase('en-GB');
}
