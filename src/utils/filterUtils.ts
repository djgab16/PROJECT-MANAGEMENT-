export function levenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[len1][len2];
}

export function fuzzyMatch(text: string | undefined | null, query: string, maxDistance = 2): boolean {
  if (!text) return false;
  const normalizedText = text.toLowerCase().trim();
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) return true;
  if (normalizedText.includes(normalizedQuery)) return true;

  // Split query words and search fuzzy matches word-by-word
  const queryWords = normalizedQuery.split(/\s+/);
  const textWords = normalizedText.split(/\s+/);

  return queryWords.every(qw => {
    if (qw.length < 3) {
      // Direct substring match for short words (to avoid incorrect typo corrections on short names/ids)
      return normalizedText.includes(qw);
    }
    return textWords.some(tw => {
      if (tw.includes(qw) || qw.includes(tw)) return true;
      const dist = levenshteinDistance(tw, qw);
      return dist <= maxDistance;
    });
  });
}

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export function getDateRangeBounds(type: string, customStart?: string, customEnd?: string): DateRange {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (type.toLowerCase()) {
    case 'today':
      return { start: startOfToday, end: endOfToday };

    case 'yesterday': {
      const yesterdayStart = new Date(startOfToday);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const yesterdayEnd = new Date(endOfToday);
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
      return { start: yesterdayStart, end: yesterdayEnd };
    }

    case 'last 7 days': {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 6);
      return { start, end: endOfToday };
    }

    case 'last 30 days': {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 29);
      return { start, end: endOfToday };
    }

    case 'this month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: endOfToday };
    }

    case 'last month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); // last day of prev month
      return { start, end };
    }

    case 'quarterly': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), currentQuarter * 3, 1);
      return { start, end: endOfToday };
    }

    case 'yearly': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end: endOfToday };
    }

    case 'custom': {
      if (!customStart) return { start: null, end: null };
      const start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      const end = customEnd ? new Date(customEnd) : new Date(start);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    default:
      return { start: null, end: null };
  }
}

export function isDateInBounds(dateStr: string | undefined | null, range: DateRange): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;

  if (range.start && date < range.start) return false;
  if (range.end && date > range.end) return false;
  return true;
}

export function validateDateRange(type: string, start?: string, end?: string): { valid: boolean; message?: string } {
  if (type.toLowerCase() === 'custom') {
    if (!start) return { valid: false, message: 'Start date is required' };
    const startDate = new Date(start);
    const today = new Date();
    
    if (startDate.getFullYear() > today.getFullYear()) {
      return { valid: false, message: 'Future years are not allowed' };
    }
    
    if (end) {
      const endDate = new Date(end);
      if (endDate.getFullYear() > today.getFullYear()) {
        return { valid: false, message: 'Future years are not allowed' };
      }
      if (startDate > endDate) {
        return { valid: false, message: 'Start date cannot exceed end date' };
      }
    }
  }
  return { valid: true };
}
