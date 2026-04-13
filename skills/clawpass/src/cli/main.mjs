/*
 * Copyright 2026 LoginID Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Command } from "commander";
import { getCommand } from "./router.mjs";
import { config } from "../utils/env.mjs";

const program = new Command();

program
  .name("lig")
  .description("A CLI tool for LoginID's Identity Gateway with OpenClaw")
  .version("0.0.1");

program
  .command("create-session")
  .description("Create a new identity session and return its URL")
  .argument("<toolCall>", "the exact dangerous command or tool call that would be executed")
  .argument("<displayString>", "a concise human-readable summary of the dangerous action for the approval UI")
  .action(async (toolCall, displayString) => {
    try {
      const command = getCommand("create-session");
      const result = await command.execute({ toolCall, displayString });
      if (result) {
        console.log(result);
      }
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

program
  .command("wait-for-session")
  .description("Waits for a session to complete")
  .argument("<sessionId>", "The session ID to wait for")
  .argument("[approvalUrl]", "The approval URL to open")
  .option(
    "--notify <provider:destination>",
    "Send notification (e.g. telegram:@mychat, slack:channel:C123, whatsapp:+123...)"
  )
  .action(async (sessionId, approvalUrl, options) => {
    try {
      const command = getCommand("wait-for-session");
      const { notify } = options;
      const result = await command.execute({ sessionId, approvalUrl, notify: notify || config.notify });
      if (result) {
        console.log(result);
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

program.parse();
