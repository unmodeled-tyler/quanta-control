export interface LineMatch {
  file: string;
  line: number;
  content: string;
}

export function parseBoundedLimit(value: unknown, fallback = 50, max = 200) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), 1), max);
}

export function parseGitLineMatches(stdout: string): LineMatch[] {
  const matches: LineMatch[] = [];

  for (const raw of stdout.split("\n")) {
    if (!raw) continue;

    const colonIdx = raw.indexOf(":");
    const secondColonIdx = raw.indexOf(":", colonIdx + 1);

    if (colonIdx <= 0 || secondColonIdx <= colonIdx) continue;

    const file = raw.slice(0, colonIdx);
    const line = Number(raw.slice(colonIdx + 1, secondColonIdx));
    const content = raw.slice(secondColonIdx + 1);

    if (Number.isFinite(line)) {
      matches.push({ file, line, content });
    }
  }

  return matches;
}
