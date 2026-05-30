/**
 * Возвращает правильное склонение русского существительного
 * для числительного n на основе трёх форм:
 * one — 1 таксон, few — 2 таксона, many — 5 таксонов
 */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const rem = abs % 10;
  if (abs >= 11 && abs <= 19) return many;
  if (rem === 1) return one;
  if (rem >= 2 && rem <= 4) return few;
  return many;
}

export const pluralTaxon = (n: number) => pluralRu(n, 'таксон', 'таксона', 'таксонов');
