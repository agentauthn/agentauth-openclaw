/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import { BaseCommand } from "./BaseCommand.mjs";

export class CreateSessionCommand extends BaseCommand {
  constructor(idgwService) {
    super();
    this.idgwService = idgwService;
  }

  async execute(args) {
    return this.idgwService.approvalInit(args.toolCall, args.displayString);
  }
}
