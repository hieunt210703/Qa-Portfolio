import { defaultPortfolioContent, type Language, type LocalizedText } from "./content";

export type { Language } from "./content";

export function translate(
  value: string,
  language: Language,
  copy: Record<string, LocalizedText> = defaultPortfolioContent.copy,
): string {
  const translated = copy[value]?.[language];
  return translated?.trim() ? translated : value;
}
