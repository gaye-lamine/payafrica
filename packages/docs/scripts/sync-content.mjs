import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const packageRoot = resolve(import.meta.dirname, "..");
const source = resolve(packageRoot, "..", "..", "COMPATIBILITY.md");
const destination = resolve(packageRoot, "docs", "compatibility.md");

await mkdir(dirname(destination), { recursive: true });
const content = await readFile(source, "utf8");
const publicContent = content.replace(
  "](spec/provider-interface.md)",
  "](https://github.com/gaye-lamine/payafrica/blob/main/spec/provider-interface.md)",
);
await writeFile(destination, publicContent);
