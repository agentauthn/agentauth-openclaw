/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import { execFileSync } from "child_process";

export class OpenClawService {
  notify(message, channel, target) {
    try {
      const args = ["message", "send", "--channel", channel, "--message", message];
      if (target) {
        args.push("--target", target);
      }
      execFileSync("openclaw", args, { stdio: "ignore" });
      return true;
    } catch (error) {
      console.error(`Failed to send message via OpenClaw: ${error.message}..`);
      return false;
    }
  }
}
