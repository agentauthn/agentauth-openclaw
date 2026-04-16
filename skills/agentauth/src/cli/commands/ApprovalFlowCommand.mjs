/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import { BaseCommand } from "./BaseCommand.mjs";

export class ApprovalFlowCommand extends BaseCommand {
  constructor(idgwService) {
    super();
    this.idgwService = idgwService;
  }

  async execute(args) {
    const { toolCall, displayString, notify } = args;
    return this.idgwService.approvalFlow(toolCall, displayString, { notify });
  }
}
