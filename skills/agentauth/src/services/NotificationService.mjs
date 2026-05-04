/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import { execFileSync } from "child_process";

export class NotificationService {
  notify(message, channel, target) {
    throw new Error("notify() must be implemented");
  }
}

export class OpenClawNotificationService extends NotificationService {
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

export class ConsoleNotificationService extends NotificationService {
  notify(message, channel, target) {
    console.log("[NOTIFICATION]");
    console.log(`Channel: ${channel}`);
    if (target) {
      console.log(`Target: ${target}`);
    }
    console.log(`Message: ${message}`);
    return true;
  }
}
