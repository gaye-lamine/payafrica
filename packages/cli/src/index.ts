import { Command } from "commander";

import { devCommand, parsePort } from "./commands/dev.js";
import { doctorCommand } from "./commands/doctor.js";
import { initCommand } from "./commands/init.js";
import { triggerCommand } from "./commands/trigger.js";

const program = new Command();

program
  .name("payafrica")
  .description("Generate a PayAfrica payment integration starter")
  .version("1.0.3");

program
  .command("init")
  .description("Interactively generate PayAfrica configuration and integration code")
  .action(initCommand);

program
  .command("dev")
  .description("Start the local PayAfrica checkout and webhook simulator")
  .option("-p, --port <number>", "Port for the local simulator", parsePort, 4004)
  .option("-t, --target <url>", "Webhook receiver URL", "http://localhost:8000/api/webhooks/payafrica")
  .action(devCommand);

program
  .command("doctor")
  .description("Check local PayAfrica environment configuration")
  .action(doctorCommand);

program
  .command("trigger <event>")
  .description("Send a signed, normalized test webhook event")
  .option("-t, --target <url>", "Webhook receiver URL", "http://localhost:8000/api/webhooks/payafrica")
  .option("-s, --secret <secret>", "Webhook HMAC secret", "whsec_dev_12345")
  .action(triggerCommand);

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
