export function normalizePlatform(platform: string): string {
  const p = platform.trim();
  if (!p) return "Link";
  return p[0].toUpperCase() + p.slice(1);
}

export function platformSortKey(platform: string): number {
  const p = platform.toLowerCase();
  if (p.includes("youtube")) return 0;
  if (p.includes("spotify")) return 1;
  if (p.includes("apple")) return 2;
  return 10;
}

