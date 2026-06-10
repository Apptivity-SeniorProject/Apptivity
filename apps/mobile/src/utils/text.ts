const MOJIBAKE_MARKER_REGEX = /[ÃÅÄ]/;

export function normalizePossiblyMojibakeText(value: string): string {
  let current = value;

  for (let index = 0; index < 2; index += 1) {
    if (!MOJIBAKE_MARKER_REGEX.test(current)) {
      break;
    }

    try {
      const decoded = decodeURIComponent(escape(current));
      if (!decoded || decoded === current) {
        break;
      }

      current = decoded;
    } catch {
      break;
    }
  }

  return current;
}
