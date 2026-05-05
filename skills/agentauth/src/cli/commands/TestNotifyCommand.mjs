/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import { BaseCommand } from "./BaseCommand.mjs";
import { parseNotify } from "../../utils/notifications.mjs";

export class TestNotifyCommand extends BaseCommand {
  constructor(notificationService) {
    super();
    this.notificationService = notificationService;
  }

  async execute(args) {
    const { message, notify } = args;
    const { channel, target } = parseNotify(notify);

    const success = this.notificationService.notify(message, channel, target);
    if (success) {
      console.log("Notification sent successfully.");
    }
  }
}
