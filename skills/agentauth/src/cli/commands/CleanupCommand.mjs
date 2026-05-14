/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import { BaseCommand } from "./BaseCommand.mjs";

export class CleanupCommand extends BaseCommand {
  constructor(idgwService) {
    super();
    this.idgwService = idgwService;
  }

  async execute() {
    await this.idgwService.uninstall();
  }
}
