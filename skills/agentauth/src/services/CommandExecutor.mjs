/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import { exec } from "child_process";

export class CommandExecutor {
  async execute(command) {
    return new Promise((resolve) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          resolve({ error, stdout, stderr });
        } else {
          resolve({ error: null, stdout, stderr });
        }
      });
    });
  }
}
