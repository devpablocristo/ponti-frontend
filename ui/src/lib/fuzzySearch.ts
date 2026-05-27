export type FuzzySearchable = {
  id?: number | string;
  name?: string;
  displayName?: string;
  code?: string | number | null;
};

export const normalizeSearchText = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const toTrigrams = (value: string): Set<string> => {
  const padded = `  ${value}  `;
  const grams = new Set<string>();
  for (let i = 0; i < Math.max(0, padded.length - 2); i += 1) {
    grams.add(padded.slice(i, i + 3));
  }
  return grams;
};

const trigramScore = (query: string, target: string): number => {
  if (!query || !target) return 0;
  const queryGrams = toTrigrams(query);
  const targetGrams = toTrigrams(target);
  if (queryGrams.size === 0 || targetGrams.size === 0) return 0;

  let matches = 0;
  queryGrams.forEach((gram) => {
    if (targetGrams.has(gram)) matches += 1;
  });
  return matches / Math.max(queryGrams.size, targetGrams.size);
};

export const scoreFuzzyOption = (query: string, option: FuzzySearchable): number => {
  const searchable = normalizeSearchText(
    [option.name, option.displayName, option.code, option.id].filter(Boolean).join(" "),
  );
  if (!query) return 1;
  if (!searchable) return 0;
  if (searchable === query) return 10;
  if (searchable.startsWith(query)) return 8;
  if (searchable.includes(query)) return 6;

  const words = query.split(" ").filter(Boolean);
  if (words.length > 1 && words.every((word) => searchable.includes(word))) {
    return 5;
  }
  if (words.some((word) => searchable.includes(word))) {
    return 3;
  }
  return trigramScore(query, searchable);
};

export function fuzzySearchOptions<T extends FuzzySearchable>(
  query: string,
  options: T[],
  limit = 80,
): T[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return options.slice(0, limit);

  return options
    .map((option, index) => ({
      option,
      index,
      score: scoreFuzzyOption(normalizedQuery, option),
    }))
    .filter((item) => item.score >= 0.18)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((item) => item.option);
}
