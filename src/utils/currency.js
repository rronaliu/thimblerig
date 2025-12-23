import { getCurrencyName } from "../config/currencies";

export function normalizeCurrencyCode(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return getCurrencyName(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      if (/^\d+$/.test(trimmed)) {
        const numeric = Number.parseInt(trimmed, 10);
        if (Number.isFinite(numeric)) {
          return getCurrencyName(numeric);
        }
      }
      return trimmed;
    }
  }

  return null;
}
