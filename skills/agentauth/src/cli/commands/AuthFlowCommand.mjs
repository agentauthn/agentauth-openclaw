/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import { BaseCommand } from "./BaseCommand.mjs";

export class AuthFlowCommand extends BaseCommand {
  constructor(idgwService) {
    super();
    this.idgwService = idgwService;
  }

  async execute(args) {
    const { notify } = args;
    return this.idgwService.authFlow({ notify });
  }
}
