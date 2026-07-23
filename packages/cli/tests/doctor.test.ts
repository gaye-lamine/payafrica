import { describe, expect, it } from "vitest";

import { getNodeMajorVersion, parseEnv, unquote } from "../src/commands/doctor.js";

describe("parseEnv", () => {
  it("returns an empty object for an empty file", () => {
    expect(parseEnv("")).toStrictEqual({});
  });

  it("ignores comments and blank lines", () => {
    expect(parseEnv("# configuration\n\n  # another comment\n")).toStrictEqual({});
  });

  it("parses quoted, unquoted, spaced, exported, and equals-containing values", () => {
    const content = [
      "PLAIN=value",
      "SINGLE='single quoted'",
      'DOUBLE="double quoted"',
      " SPACED_KEY =  spaced value  ",
      "WITH_EQUALS=left=right=value",
      "export EXPORTED=enabled",
    ].join("\n");

    expect(parseEnv(content)).toStrictEqual({
      PLAIN: "value",
      SINGLE: "single quoted",
      DOUBLE: "double quoted",
      SPACED_KEY: "spaced value",
      WITH_EQUALS: "left=right=value",
      EXPORTED: "enabled",
    });
  });

  it("keeps the last value for a duplicated key", () => {
    expect(parseEnv("WAVE_API_KEY=first\nWAVE_API_KEY=last")).toStrictEqual({ WAVE_API_KEY: "last" });
  });
});

describe("unquote", () => {
  it.each([
    ["plain", "plain"],
    ["'single quoted'", "single quoted"],
    ['"double quoted"', "double quoted"],
    ["'unmatched", "'unmatched"],
    ['"unmatched', '"unmatched'],
    ["", ""],
  ])("returns %j as %j", (value, expected) => {
    expect(unquote(value)).toBe(expected);
  });
});

describe("getNodeMajorVersion", () => {
  it.each([
    ["v20.19.2", 20],
    ["V20.0.0", 20],
    ["20.19.2", 20],
    ["v8.1.0", 8],
    ["malformed", Number.NaN],
  ])("parses the major version from %s", (version, expected) => {
    const result = getNodeMajorVersion(version);
    if (Number.isNaN(expected)) {
      expect(Number.isNaN(result)).toBe(true);
    } else {
      expect(result).toBe(expected);
    }
  });
});
