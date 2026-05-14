/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import { Command } from "commander";
import { getCommand } from "./router.mjs";
import { config } from "../utils/env.mjs";

const program = new Command();

program
  .name("agentauth")
  .description("A CLI tool for AgentAuths's Identity Gateway with OpenClaw")
  .version("0.0.1");

program
  .command("auth-flow")
  .description("Starts an authentication flow for onboarding and waits for it to complete")
  .option(
    "--notify <provider:destination>",
    "Send notification (e.g. telegram:@mychat, slack:channel:C123, whatsapp:+123...)"
  )
  .action(async (options) => {
    try {
      const command = getCommand("auth-flow");
      const { notify } = options;
      const result = await command.execute({ notify: notify || config.notify });
      if (result) {
        console.log(JSON.stringify(result));
      }
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

program
  .command("approval-flow")
  .description("Starts an approval flow and waits for it to complete")
  .argument("<toolCall>", "the exact dangerous command or tool call that would be executed")
  .argument("<displayString>", "a concise human-readable summary of the dangerous action for the approval UI")
  .option(
    "--notify <provider:destination>",
    "Send notification (e.g. telegram:@mychat, slack:channel:C123, whatsapp:+123...)"
  )
  .action(async (toolCall, displayString, options) => {
    try {
      const command = getCommand("approval-flow");
      const { notify } = options;
      const result = await command.execute({ toolCall, displayString, notify: notify || config.notify });
      if (result) {
        console.log(JSON.stringify(result));
      }
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

program
  .command("test-notify")
  .description("Sends a test notification via OpenClaw to verify the message API is working.")
  .argument("<message>", "The message to send")
  .option(
    "--notify <provider:destination>",
    "Send notification (e.g. telegram:@mychat, slack:channel:C123, whatsapp:+123...)"
  )
  .action(async (message, options) => {
    try {
      const { notify } = options;
      const notifyValue = notify || config.notify;
      if (!notifyValue) {
        throw new Error(
          "missing required option '--notify <provider:destination>' or AGENTAUTH_NOTIFY environment variable."
        );
      }
      const command = getCommand("test-notify");
      await command.execute({ message, notify: notifyValue });
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

program
  .command("cleanup")
  .description("Restores original configuration and removes AgentAuth integrations. Run before uninstalling the AgentAuth skill.")
  .option(
    "--notify <provider:destination>",
    "Send notification (e.g. telegram:@mychat, slack:channel:C123, whatsapp:+123...)"
  )
  .action(async (options) => {
    try {
      const command = getCommand("cleanup");
      const { notify } = options;
      await command.execute({ notify: notify || config.notify });
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

program.parse();
