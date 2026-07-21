import { TemplateProvider } from "../../src/providers/_template.js";
import { runProviderContractTests } from "../contract/provider.contract.js";

runProviderContractTests("template", () => new TemplateProvider());
