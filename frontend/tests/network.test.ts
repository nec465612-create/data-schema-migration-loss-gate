import { describe, expect, it } from "vitest";

import { chainMatches } from "../src/network";

describe("configured network guard", () => {
  it("accepts only the connected configured chain", () => {
    expect(chainMatches("0x1234", "0x1234")).toBe(true);
    expect(chainMatches("0x1234", "0X1234")).toBe(true);
    expect(chainMatches("0x1234", "0x1235")).toBe(false);
    expect(chainMatches("0x1234", undefined)).toBe(false);
  });
});
