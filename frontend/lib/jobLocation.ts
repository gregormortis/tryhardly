// PostQuestForm prepends "Location: <neighborhood>, <city> · Pay: $<reward> hourly|flat"
// to the description. Starter/remote quests may use "Location: Online / Remote · Pay: ..."
// so the city half can legitimately be empty.
//
// Shared by the public board and the logged-in dashboard: both need to show
// where a job is, and neither should re-type this regex.

export type JobPayType = 'flat' | 'hourly';

export interface ParsedJobLocation {
  neighborhood: string;
  city: string;
  payType: JobPayType;
  // The description with the machine-formatted first line removed.
  bodyText: string;
}

export function parseLocationLine(description?: string): ParsedJobLocation {
  const fallback = { neighborhood: '', city: '', payType: 'flat' as JobPayType, bodyText: description ?? '' };
  if (!description) return fallback;
  const firstLine = description.split('\n', 1)[0] ?? '';
  const match = firstLine.match(/^Location:\s*(.+?)\s*·\s*Pay:\s*(?:\$[^\s]+\s*)?(?:listed reward\s*)?(\/?\s*hour|hourly|flat)?/i);
  if (!match) return fallback;
  const location = match[1].trim();
  const [neighborhoodPart, ...cityParts] = location.split(',');
  const neighborhood = neighborhoodPart.trim();
  const city = cityParts.join(',').trim();
  const payType: JobPayType = /hour/i.test(match[2] ?? '') ? 'hourly' : 'flat';
  const body = description.replace(firstLine, '').replace(/^\n+/, '');
  return { neighborhood, city, payType, bodyText: body };
}

// One-line location for a job card. Returns null when the description carries no
// location line, so callers can omit the row instead of printing a placeholder.
export function jobLocationLabel(description?: string | null): string | null {
  const { neighborhood, city } = parseLocationLine(description ?? undefined);
  if (neighborhood && city) return `${neighborhood} · ${city}`;
  return neighborhood || city || null;
}
