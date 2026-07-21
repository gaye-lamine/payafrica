import { cancel, intro, isCancel, multiselect, outro, select, spinner } from "@clack/prompts";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pc from "picocolors";

import { generateNodeBoilerplate, type NodeFramework } from "../generators/boilerplates/node.js";
import { generatePhpBoilerplate, type PhpFramework } from "../generators/boilerplates/php.js";
import { generatePythonBoilerplate, type PythonFramework } from "../generators/boilerplates/python.js";
import { generateEnvExample, type Provider } from "../generators/env.js";

type Language = "node" | "php" | "python";

function exitOnCancel<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel("Generation cancelled.");
    process.exit(0);
  }
  return value;
}

export async function initCommand(): Promise<void> {
  intro(pc.bgCyan(pc.black(" Welcome to PayAfrica SDK Generator 🌍 ")));

  const language = exitOnCancel(
    await select<Language>({
      message: "Langage backend cible ?",
      options: [
        { value: "node", label: "Node.js (TypeScript)" },
        { value: "php", label: "PHP" },
        { value: "python", label: "Python" },
      ],
    })
  );

  const framework = exitOnCancel(await selectFramework(language));
  const providers = exitOnCancel(
    await multiselect<Provider>({
      message: "Providers à activer ?",
      required: true,
      options: [
        { value: "orange-money", label: "Orange Money Sénégal" },
        { value: "wave", label: "Wave Sénégal" },
        { value: "mtn-momo", label: "MTN MoMo" },
      ],
    })
  );

  const task = spinner();
  task.start("Generating PayAfrica integration files");
  const cwd = process.cwd();
  const extension = language === "node" ? "ts" : language === "php" ? "php" : "py";
  const boilerplate = createBoilerplate(language, framework, providers);
  await Promise.all([
    writeFile(resolve(cwd, ".env.payafrica.example"), generateEnvExample(providers), "utf8"),
    writeFile(resolve(cwd, `payafrica-integration.${extension}`), boilerplate, "utf8"),
  ]);
  task.stop("PayAfrica files generated");
  outro("Review .env.payafrica.example, add your credentials locally, then wire the selected provider into your application.");
}

async function selectFramework(language: Language): Promise<string | symbol> {
  const options = language === "node"
    ? [{ value: "express", label: "Express" }, { value: "fastify", label: "Fastify" }, { value: "nestjs", label: "NestJS" }]
    : language === "php"
      ? [{ value: "laravel", label: "Laravel" }, { value: "symfony", label: "Symfony" }, { value: "native", label: "Native/PSR" }]
      : [{ value: "fastapi", label: "FastAPI" }, { value: "django", label: "Django REST" }];
  return select({ message: "Framework utilisé ?", options });
}

function createBoilerplate(language: Language, framework: string, providers: readonly Provider[]): string {
  if (language === "node") return generateNodeBoilerplate(framework as NodeFramework, providers);
  if (language === "php") return generatePhpBoilerplate(framework as PhpFramework, providers);
  return generatePythonBoilerplate(framework as PythonFramework, providers);
}
