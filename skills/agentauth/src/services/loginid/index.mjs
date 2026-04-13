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

import { randomUUID } from "crypto";
import { APPROVAL_INIT_QUERY } from "./queries.mjs";

export class LoginIDService {
  #httpClient;
  #sseClient;
  #gqlUrl = ""
  #eventsUrl = ""
  #apiKey;
  #keyId;

  constructor({ baseUrl, httpClient, sseClient, credentials }) {
    this.#httpClient = httpClient;
    this.#sseClient = sseClient;
    this.#gqlUrl = baseUrl + "/graphql";
    this.#eventsUrl = baseUrl + "/events";
    this.#apiKey = credentials?.apiKey;
    this.#keyId = credentials?.keyId;
  }

  async approvalInit(toolCall, displayString) {
    const requestPayload = {
      operationName: "approvalInit",
      query: APPROVAL_INIT_QUERY,
      variables: {
        //NOTE: remove after
        callbackUri: "https://localhost:3000",
        permissions: [{
          id: randomUUID(),
          title: toolCall,
          description: displayString,
        }]
      }
    };

    const headers = {};
    if (this.#apiKey) {
      headers["X-Api-Key"] = this.#apiKey;
    }
    if (this.#keyId) {
      headers["X-Api-Key-Id"] = this.#keyId;
    }

    const { data } = await this.#httpClient.post(this.#gqlUrl, requestPayload, { headers });
    const result = data?.approvalInit;

    if (!result) {
      throw new Error("Missing response data at `approvalInit");
    }

    return result;
  }

  async approvalWait(sessionId) {
    const url = `${this.#eventsUrl}?sessionId=${sessionId}`;
    const eventData = await this.#sseClient.waitForEvent(
      url,
      { eventName: "session", timeout: 60_000 * 5 }
    );

    if (eventData?.status?.toLowerCase() === "approved") {
      return { status: "approved" };
    } else {
      return { status: "deny" };
    }
  }
}
