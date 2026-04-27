/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import os from "os";
import path from "path";
import { config as loadDotenv } from "dotenv";
import { AGENTAUTH_ENV_PATH } from "./paths.mjs";

loadDotenv({ quiet: true });
loadDotenv({ path: AGENTAUTH_ENV_PATH, quiet: true, override: true });

class Config {
  constructor(env = process.env) {
    this._env = env;
  }

  get openClawDir() {
    return this._env.OPENCLAW_HOME || path.join(os.homedir(), ".openclaw");
  }

  get idgwBaseUrl() {
    return this._env.IDGW_BASE_URL || "https://agentauth.id/api";
  }

  get notify() {
    return this._env.AGENTAUTH_NOTIFY;
  }

  get hasCredentials() {
    return !!this._env.AGENTAUTH_API_KEY && !!this._env.AGENTAUTH_AGENT_KEY_ID;
  }

  get apiKey() {
    const apiKey = this._env.AGENTAUTH_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing required environment variable: AGENTAUTH_API_KEY. " +
          "Set it in your environment or .env file."
      );
    }
    return apiKey;
  }

  getAgentPrivateKey() {
    const pem = this._env.AGENTAUTH_AGENT_PRIVATE_KEY;
    if (!pem) {
      return;
    }
    return pem.replace(/\\n/g, "\n");
  }

  getAgentKeyId() {
    const keyId = this._env.AGENTAUTH_AGENT_KEY_ID;
    if (!keyId) {
      throw new Error(
        "Missing required environment variable: AGENTAUTH_AGENT_KEY_ID. " +
          "Set it in your environment or .env file to enable request signing."
      );
    }
    return keyId;
  }
}

export const config = new Config();
