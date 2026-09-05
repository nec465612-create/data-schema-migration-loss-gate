export function chainMatches(expected: string | undefined, actual: string | undefined): boolean {
  if (typeof expected !== "string" || typeof actual !== "string") return false;
  return expected.toLowerCase() === actual.toLowerCase();
}
