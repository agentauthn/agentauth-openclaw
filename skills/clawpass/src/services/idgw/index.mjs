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

import open from "open";
import { randomUUID } from "crypto";
import { APPROVAL_INIT_QUERY } from "./queries.mjs";
import { base64UrlEncode } from "../../utils/crypto.mjs";
import { parseNotify } from "../../utils/notifications.mjs";

export class IdentityGateWay {
  #httpClient;
  #sseClient;
  #openClawService;
  #gqlUrl = ""
  #eventsUrl = ""
  #apiKey;
  #keyId;

  constructor({ baseUrl, httpClient, sseClient, openClawService, credentials }) {
    this.#httpClient = httpClient;
    this.#sseClient = sseClient;
    this.#openClawService = openClawService;
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

    const { approvalUrl, ...rest } = result;
    const { sessionId } = rest;

    const url = new URL(approvalUrl);
    const filtered = Object.fromEntries(
      Object.entries(rest).filter(([_, v]) => v != null && v !== "")
    );
    const encoded = base64UrlEncode(JSON.stringify(filtered));

    url.searchParams.set("d", encoded);

    return { approvalUrl: url, sessionId };
  }

  async approvalWait(sessionId, approvalUrl, { notify } = {}) {
    if (approvalUrl) {
      let notificationSent = false;
      if (notify && this.#openClawService) {
        const { channel, target } = parseNotify(notify);
        const message = `An action requires your approval. Please visit this URL to review: ${approvalUrl.toString()}`;
        notificationSent = this.#openClawService.notify(
          message,
          channel,
          target
        );
      }

      if (!notificationSent) {
        console.log(`Falling back to opening browser.`);
        open(approvalUrl.toString());
      }
    }

    const url = `${this.#eventsUrl}?sessionId=${sessionId}`;
    const eventData = await this.#sseClient.waitForEvent(
      url,
      { eventName: "session", timeout: 60_000 * 5 }
    );

    if (eventData?.status?.toLowerCase() === "approved") {
      return JSON.stringify({ status: "approved" });
    } else {
      return JSON.stringify({ status: "deny" });
    }
  }

  async approvalFlow(toolCall, displayString, { notify } = {}) {
    const { approvalUrl, sessionId } = await this.approvalInit(toolCall, displayString);

    try {
      await this.approvalWait(sessionId, approvalUrl, { notify });
      return {
        status: "approved",
      };
    } catch (error) {
      return {
        status: "deny",
      };
    }
  }
}
