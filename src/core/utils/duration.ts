const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parses JWT-style duration strings (e.g. "15m", "7d", "30d") to milliseconds. */
export function parseDurationToMs(duration: string, fallbackMs = 7 * 86_400_000): number {
  const match = duration.trim().match(/^(\d+)([smhd])$/i);
  if (!match) return fallbackMs;

  const value = Number.parseInt(match[1]!, 10);
  const unit = match[2]!.toLowerCase();
  const multiplier = UNIT_MS[unit];

  if (!multiplier || Number.isNaN(value)) return fallbackMs;
  return value * multiplier;
}

/** Converts a duration string to a future Date. */
export function durationToExpiryDate(duration: string): Date {
  return new Date(Date.now() + parseDurationToMs(duration));
}
