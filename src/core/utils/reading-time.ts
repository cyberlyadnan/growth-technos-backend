const WORDS_PER_MINUTE = 200;

export function calculateReadingTimeMinutes(text: string | undefined): number {
  if (!text?.trim()) return 1;

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
