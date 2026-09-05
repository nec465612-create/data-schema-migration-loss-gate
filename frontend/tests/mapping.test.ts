import { describe, expect, it } from "vitest";

import {
  initialMappingRows,
  isTargetAvailable,
  nextUnmappedOldId,
} from "../src/mapping";

describe("mapping editor rows", () => {
  it("creates one editable row for every old field", () => {
    const rows = initialMappingRows(["name", "email"], ["name", "email"]);
    expect(rows).toEqual([
      { old_id: "name", new_id: "name", transform: "IDENTITY" },
      { old_id: "email", new_id: "email", transform: "IDENTITY" },
    ]);
    expect(nextUnmappedOldId(["name", "email"], rows)).toBeUndefined();
  });

  it("disables a target already used by another non-drop row", () => {
    const rows = initialMappingRows(["name", "email"], ["name", "email"]);
    expect(isTargetAvailable(rows, 1, "name")).toBe(false);
    expect(isTargetAvailable(rows, 1, "email")).toBe(true);
  });
});
