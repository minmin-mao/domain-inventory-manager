const COUNTRY_LANGUAGE_MAP: Record<string, string> = {
  AT: "DE",
  AUT: "DE",
  CH: "DE",
  CHE: "DE",
  DE: "DE",
  DEU: "DE",
  ES: "ES",
  ESP: "ES",
  FR: "FR",
  FRA: "FR",
  IT: "IT",
  ITA: "IT",
  SG: "EN",
  SGP: "EN",
  US: "EN",
  USA: "EN",
};

const EMPTY_VALUES = new Set(["", "-", "—"]);
const DEFAULT_LANGUAGE = "EN";

export const DEFAULT_LANGUAGE_OPTIONS = [
  "EN",
  "DE",
  "FR",
  "ES",
  "IT",
  "ZH",
  "YUE",
  "JA",
  "KO",
  "TH",
  "VI",
  "MS",
  "ID",
];

const LANGUAGE_FLAG_MAP: Record<string, string> = {
  DE: "🇩🇪",
  EN: "🇬🇧",
  ES: "🇪🇸",
  FR: "🇫🇷",
  ID: "🇮🇩",
  IT: "🇮🇹",
  JA: "🇯🇵",
  KO: "🇰🇷",
  MS: "🇲🇾",
  TH: "🇹🇭",
  VI: "🇻🇳",
  YUE: "🇭🇰",
  ZH: "🇨🇳",
};

export function getLanguageOptionLabel(language: string) {
  const normalizedLanguage = normalizeLanguageCode(language);
  const flag = LANGUAGE_FLAG_MAP[normalizedLanguage];
  return flag ? `${flag} ${normalizedLanguage}` : normalizedLanguage;
}

export function normalizeCountryCode(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export function normalizeLanguageCode(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export function isEmptyCountryValue(value: string | null | undefined) {
  return EMPTY_VALUES.has((value ?? "").trim());
}

export function deriveLanguageFromCountry(country: string | null | undefined) {
  const normalizedCountry = normalizeCountryCode(country);

  if (!normalizedCountry || isEmptyCountryValue(normalizedCountry)) {
    return DEFAULT_LANGUAGE;
  }

  return COUNTRY_LANGUAGE_MAP[normalizedCountry] ?? DEFAULT_LANGUAGE;
}

export function getMappedLanguageFromCountry(country: string | null | undefined) {
  const normalizedCountry = normalizeCountryCode(country);

  if (!normalizedCountry || isEmptyCountryValue(normalizedCountry)) {
    return null;
  }

  return COUNTRY_LANGUAGE_MAP[normalizedCountry] ?? null;
}

export function getEffectiveLanguage(
  language: string | null | undefined,
  country: string | null | undefined
) {
  const normalizedLanguage = normalizeLanguageCode(language);
  return normalizedLanguage || deriveLanguageFromCountry(country);
}

export function getSuggestionCountryLabel(country: string | null | undefined) {
  const normalizedCountry = normalizeCountryCode(country);
  return !normalizedCountry || isEmptyCountryValue(normalizedCountry)
    ? "GLOBAL"
    : normalizedCountry;
}

export function getSuggestionLanguageLabel(
  language: string | null | undefined,
  country: string | null | undefined
) {
  return getEffectiveLanguage(language, country);
}
