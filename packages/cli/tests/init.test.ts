import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("@clack/prompts", () => {
  const unexpectedClackCall = (): never => {
    throw new Error("Clack must not be called for non-interactive init.");
  };
  return {
    cancel: unexpectedClackCall,
    intro: unexpectedClackCall,
    isCancel: unexpectedClackCall,
    multiselect: unexpectedClackCall,
    outro: unexpectedClackCall,
    select: unexpectedClackCall,
    spinner: unexpectedClackCall,
  };
});

import { initCommand } from "../src/commands/init.js";

const originalCwd = process.cwd();
let temporaryDirectory: string | undefined;

afterEach(async () => {
  process.chdir(originalCwd);
  if (temporaryDirectory !== undefined) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

async function useTemporaryDirectory(): Promise<string> {
  temporaryDirectory = await mkdtemp(join(tmpdir(), "payafrica-cli-init-"));
  process.chdir(temporaryDirectory);
  return temporaryDirectory;
}

describe("initCommand non-interactive flags", () => {
  it.each([
    ["node", "express", "wave,mtn-momo", "ts", "// Generated for express. Selected providers: wave, mtn-momo"],
    ["php", "laravel", "orange-money", "php", "// Generated for laravel. Selected providers: orange-money"],
    ["python", "fastapi", "wave", "py", "# Generated for fastapi. Selected providers: wave"],
  ] as const)("generates %s files without calling Clack", async (language, framework, providers, extension, expectedBoilerplate) => {
    const directory = await useTemporaryDirectory();

    await initCommand({ language, framework, providers });

    const env = await readFile(join(directory, ".env.payafrica.example"), "utf8");
    const integration = await readFile(join(directory, `payafrica-integration.${extension}`), "utf8");

    expect(env).toContain("# PayAfrica SDK configuration");
    expect(integration).toContain(expectedBoilerplate);
  });

  it("rejects a partial non-interactive configuration instead of prompting", async () => {
    await expect(initCommand({ language: "node" }))
      .rejects.toThrow("Non-interactive init requires --language, --framework, and --providers together.");
  });

  it("rejects an invalid language before invoking Clack", async () => {
    await expect(initCommand({ language: "rust", framework: "axum", providers: "wave" }))
      .rejects.toThrow("Invalid --language. Expected one of: node, php, python.");
  });

  it("rejects an invalid provider and identifies the faulty value", async () => {
    await expect(initCommand({ language: "node", framework: "express", providers: "wave,fake-provider" }))
      .rejects.toThrow("Invalid --providers value: fake-provider. Expected one of: orange-money, wave, mtn-momo.");
  });

  it("rejects a framework incompatible with the selected language", async () => {
    await expect(initCommand({ language: "php", framework: "express", providers: "wave" }))
      .rejects.toThrow("Invalid --framework for php. Expected one of: laravel, symfony, native.");
  });

  it("generates mock credentials and local base URLs with --mock", async () => {
    const directory = await useTemporaryDirectory();
    await initCommand({ language: "node", framework: "express", providers: "orange-money,wave,mtn-momo", mock: true });
    const env = await readFile(join(directory, ".env.payafrica.example"), "utf8");
    expect(env).toContain("Mode test sans clés (--mock)");
    expect(env).toContain("ORANGE_MONEY_BASE_URL=http://localhost:4004/mock/orange");
    expect(env).toContain("WAVE_BASE_URL=http://localhost:4004/mock/wave");
    expect(env).toContain("MTN_MOMO_BASE_URL=http://localhost:4004/mock/mtn");
    expect(env).not.toContain("https://api.wave.com");
  });
});
