import {
  type FuzzySearchable,
  fuzzySearchOptions,
  normalizeSearchText,
  scoreFuzzyOption,
} from "./fuzzySearch";

export type EntityNameOption = FuzzySearchable & {
  id?: number | string;
  name?: string;
};

export type EntityNameMatchResult<T extends EntityNameOption> = {
  normalizedInput: string;
  exactMatch: T | null;
  similarMatches: T[];
  canCreate: boolean;
  requiresConfirmation: boolean;
};

const DEFAULT_SIMILAR_THRESHOLD = 0.35;

export function normalizeEntityName(value: unknown): string {
  return normalizeSearchText(value)
    .replace(/\bs\s*r\s*l\b/g, "srl")
    .replace(/\bs\s*a\s*s\b/g, "sas")
    .replace(/\bs\s*a\b/g, "sa")
    .trim();
}

export function normalizeEntityRootName(value: unknown): string {
  return normalizeEntityName(value)
    .replace(
      /\b(sociedad anonima|sociedad de responsabilidad limitada|srl|sa|sas|saci|saca)\b$/g,
      ""
    )
    .trim();
}

function optionId(option: EntityNameOption): string {
  return String(option.id ?? option.name ?? "");
}

export function findEntityMatches<T extends EntityNameOption>(
  input: string,
  options: T[],
  similarThreshold = DEFAULT_SIMILAR_THRESHOLD
): EntityNameMatchResult<T> {
  const normalizedInput = normalizeEntityName(input);
  const rootInput = normalizeEntityRootName(input);

  if (!normalizedInput) {
    return {
      normalizedInput,
      exactMatch: null,
      similarMatches: [],
      canCreate: false,
      requiresConfirmation: false,
    };
  }

  const exactMatch =
    options.find((option) => normalizeEntityName(option.name) === normalizedInput) ?? null;

  if (exactMatch) {
    return {
      normalizedInput,
      exactMatch,
      similarMatches: [],
      canCreate: false,
      requiresConfirmation: false,
    };
  }

  const fuzzyCandidates = fuzzySearchOptions(input, options, 12);
  const candidates = new Map<string, T>();

  fuzzyCandidates.forEach((option) => {
    candidates.set(optionId(option), option);
  });

  options.forEach((option) => {
    const optionRoot = normalizeEntityRootName(option.name);
    if (rootInput && optionRoot === rootInput) {
      candidates.set(optionId(option), option);
    }
  });

  const similarMatches = Array.from(candidates.values())
    .map((option, index) => {
      const optionRoot = normalizeEntityRootName(option.name);
      const rootEquivalent = Boolean(rootInput && optionRoot && optionRoot === rootInput);
      const score = Math.max(
        scoreFuzzyOption(normalizeSearchText(input), option),
        rootEquivalent ? 1 : 0
      );

      return { option, index, score, rootEquivalent };
    })
    .filter((item) => item.rootEquivalent || item.score >= similarThreshold)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 5)
    .map((item) => item.option);

  return {
    normalizedInput,
    exactMatch: null,
    similarMatches,
    canCreate: true,
    requiresConfirmation: similarMatches.length > 0,
  };
}
