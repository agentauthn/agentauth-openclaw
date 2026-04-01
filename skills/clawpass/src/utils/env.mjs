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

import { config } from "dotenv";

config({ quiet: true });

const getAgentPrivateKey = () => {
  const pem = process.env.AGENT_PRIVATE_KEY;
  if (!pem) {
    throw new Error(
      "Missing required environment variable: AGENT_PRIVATE_KEY. " +
      "Set it in your environment or .env file to enable request signing."
    );
  }
  return pem.replace("\\n", "\n");
};

const getAgentKeyId = () => {
  const keyId = process.env.AGENT_KEY_ID;
  if (!keyId) {
    throw new Error(
      "Missing required environment variable: AGENT_KEY_ID. " +
      "Set it in your environment or .env file to enable request signing."
    );
  }
  return keyId;
}

export const IDGW_BASE_URL = process.env.IDGW_BASE_URL || "http://localhost:8090";
export const AGENT_PRIVATE_KEY = getAgentPrivateKey();
export const AGENT_KEY_ID = getAgentKeyId();
export const LIG_NOTIFY = process.env.LIG_NOTIFY;
