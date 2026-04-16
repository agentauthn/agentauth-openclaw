/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import { BaseCommand } from "./BaseCommand.mjs";

export class WaitForSessionCommand extends BaseCommand {
  constructor(idgwService) {
    super();
    this.idgwService = idgwService;
  }

  async execute(args) {
    const { sessionId, approvalUrl, notify } = args;
    return this.idgwService.approvalWait(sessionId, approvalUrl, { notify });
  }
}
