/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import { BaseCommand } from "./BaseCommand.mjs";
import { parseNotify } from "../../utils/notifications.mjs";

export class TestNotifyCommand extends BaseCommand {
  constructor(openClawService) {
    super();
    this.openClawService = openClawService;
  }

  async execute(args) {
    const { message, notify } = args;
    const { channel, target } = parseNotify(notify);

    const success = this.openClawService.notify(message, channel, target);
    if (success) {
      console.log("Notification sent successfully.");
    }
  }
}
