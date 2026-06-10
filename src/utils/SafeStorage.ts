export function readStoredNumber(key: string, fallback = 0): number {
  try {
    const value = Number(window.localStorage.getItem(key));
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredNumber(key: string, value: number): void {
  if (!Number.isFinite(value)) return;
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
}

export function readStoredNumberArray(key: string, maxItems: number): number[] {
  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) return [];
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
      .slice(0, maxItems);
  } catch {
    return [];
  }
}

export function writeStoredJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota/security failures; gameplay must continue without persistence.
  }
}
