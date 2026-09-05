export type MappingTransform = "IDENTITY" | "RENAME" | "CAST" | "DROP";

export type MappingRow = {
  old_id: string;
  new_id: string;
  transform: MappingTransform;
};

export const MAX_MAPPING_ROWS = 8;

export function defaultMappingRow(oldId: string, newIds: readonly string[]): MappingRow {
  const sameTarget = newIds.includes(oldId);
  return {
    old_id: oldId,
    new_id: sameTarget ? oldId : "",
    transform: sameTarget ? "IDENTITY" : "DROP",
  };
}

export function initialMappingRows(
  oldIds: readonly string[],
  newIds: readonly string[],
  existing: readonly MappingRow[] = [],
): MappingRow[] {
  const rows = existing.slice(0, MAX_MAPPING_ROWS);
  const present = new Set(rows.map((row) => row.old_id));
  for (const oldId of oldIds) {
    if (rows.length >= MAX_MAPPING_ROWS || present.has(oldId)) continue;
    rows.push(defaultMappingRow(oldId, newIds));
    present.add(oldId);
  }
  return rows;
}

export function nextUnmappedOldId(oldIds: readonly string[], rows: readonly MappingRow[]): string | undefined {
  const present = new Set(rows.map((row) => row.old_id));
  return oldIds.find((oldId) => !present.has(oldId));
}

export function isTargetAvailable(rows: readonly MappingRow[], currentIndex: number, targetId: string): boolean {
  return !rows.some(
    (row, index) => index !== currentIndex && row.transform !== "DROP" && row.new_id === targetId,
  );
}
