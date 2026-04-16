/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

export class BaseCommand {
  async execute(args) {
    throw new Error("execute() must be implemented by subclasses");
  }
}
