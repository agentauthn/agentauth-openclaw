/*
 * Copyright 2026 LoginID Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { config as loadDotenv } from "dotenv";

loadDotenv({ quiet: true });

class Config {
  constructor(env = process.env) {
    this._env = env;
  }

  get idgwBaseUrl() {
    return this._env.IDGW_BASE_URL || "http://localhost:8090";
  }

  get notify() {
    return this._env.AGENTAUTH_NOTIFY;
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
