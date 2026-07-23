import { cancel, intro, isCancel, multiselect, outro, select, spinner } from "@clack/prompts";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pc from "picocolors";

import { generateNodeBoilerplate, type NodeFramework } from "../generators/boilerplates/node.js";
import { generatePhpBoilerplate, type PhpFramework } from "../generators/boilerplates/php.js";
import { generatePythonBoilerplate, type PythonFramework } from "../generators/boilerplates/python.js";
import { generateEnvExample, type Provider } from "../generators/env.js";

type Language = "node" | "php" | "python";

const LANGUAGES: readonly Language[] = ["node", "php", "python"];
const FRAMEWORKS: Readonly<Record<Language, readonly string[]>> = {
  node: ["express", "fastify", "nestjs"],
  php: ["laravel", "symfony", "native"],
  python: ["fastapi", "django"],
};
const PROVIDERS: readonly Provider[] = ["orange-money", "wave", "mtn-momo"];

export interface InitCommandOptions {
  language?: string;
  framework?: string;
  providers?: string;
}

interface InitConfiguration {
  language: Language;
  framework: string;
  providers: readonly Provider[];
}

function exitOnCancel<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel("Generation cancelled.");
    process.exit(0);
  }
  return value;
}

export async function initCommand(options: InitCommandOptions = {}): Promise<void> {
  const nonInteractiveConfiguration = parseNonInteractiveOptions(options);
  if (nonInteractiveConfiguration !== undefined) {
    await generateFiles(nonInteractiveConfiguration);
    return;
  }

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
  await generateFiles({ language, framework, providers });
  task.stop("PayAfrica files generated");
  outro("Review .env.payafrica.example, add your credentials locally, then wire the selected provider into your application.");
}

function parseNonInteractiveOptions(options: InitCommandOptions): InitConfiguration | undefined {
  const values = [options.language, options.framework, options.providers];
  if (values.every((value) => value === undefined)) return undefined;
  if (values.some((value) => value === undefined)) {
    throw new Error("Non-interactive init requires --language, --framework, and --providers together.");
  }

  const language = parseLanguage(options.language);
  const framework = parseFramework(language, options.framework);
  const providers = parseProviders(options.providers);
  return { language, framework, providers };
}

function parseLanguage(value: string | undefined): Language {
  if (value !== undefined && LANGUAGES.includes(value as Language)) return value as Language;
  throw new Error("Invalid --language. Expected one of: node, php, python.");
}

function parseFramework(language: Language, value: string | undefined): string {
  if (value !== undefined && FRAMEWORKS[language].includes(value)) return value;
  throw new Error(`Invalid --framework for ${language}. Expected one of: ${FRAMEWORKS[language].join(", ")}.`);
}

function parseProviders(value: string | undefined): readonly Provider[] {
  const selected = value?.split(",").map((provider) => provider.trim()).filter((provider) => provider.length > 0) ?? [];
  const invalidProvider = selected.find((provider) => !PROVIDERS.includes(provider as Provider));
  if (selected.length === 0) {
    throw new Error("Invalid --providers. Use a comma-separated list of: orange-money, wave, mtn-momo.");
  }
  if (invalidProvider !== undefined) {
    throw new Error(`Invalid --providers value: ${invalidProvider}. Expected one of: orange-money, wave, mtn-momo.`);
  }
  return selected as Provider[];
}

async function generateFiles(configuration: InitConfiguration): Promise<void> {
  const cwd = process.cwd();
  const extension = configuration.language === "node" ? "ts" : configuration.language === "php" ? "php" : "py";
  const boilerplate = createBoilerplate(configuration.language, configuration.framework, configuration.providers);
  await Promise.all([
    writeFile(resolve(cwd, ".env.payafrica.example"), generateEnvExample(configuration.providers), "utf8"),
    writeFile(resolve(cwd, `payafrica-integration.${extension}`), boilerplate, "utf8"),
  ]);
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
