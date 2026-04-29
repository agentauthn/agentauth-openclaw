/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import { randomUUID } from "crypto";
import { APPROVAL_INIT_QUERY, CREATE_SESSION_QUERY } from "./queries.mjs";

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

  async createAuthSession() {
    const requestPayload = {
      query: CREATE_SESSION_QUERY,
    };

    const { data } = await this.#httpClient.post(this.#gqlUrl, requestPayload);
    const result = data?.createSession;

    if (!result) {
      throw new Error("Missing response data at `createSession`");
    }

    return result;
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

  async waitForSession(topic) {
    const url = `${this.#eventsUrl}?topic=${topic}`;
    return await this.#sseClient.waitForEvent(
      url,
      { eventName: "session", timeout: 60_000 * 5 }
    );
  }
}
