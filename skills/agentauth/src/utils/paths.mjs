/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import os from "os";
import path from "path";

export const AGENTAUTH_ENV_PATH = path.join(os.homedir(), '.openclaw', '.env');
