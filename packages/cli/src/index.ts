import { Command } from "commander";

import { initCommand } from "./commands/init.js";

const program = new Command();

program
  .name("payafrica")
  .description("Generate a PayAfrica payment integration starter")
  .version("0.1.0");

program
  .command("init")
  .description("Interactively generate PayAfrica configuration and integration code")
  .action(initCommand);

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
