export function parseSupabaseTimestamp(value?: string | null): Date {
  if (!value) return new Date(NaN);
  const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(value);
  const normalized = hasTimezone ? value : `${value}Z`;
  return new Date(normalized);
}

export function formatIssueDateTime(value?: string | null): string {
  const date = parseSupabaseTimestamp(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

