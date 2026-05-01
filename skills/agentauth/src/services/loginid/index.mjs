/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import { randomUUID } from "crypto";
import { APPROVAL_INIT_QUERY, ONBOARDING_INIT_QUERY } from "./queries.mjs";

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
      operationName: "onboardingInit",
      query: ONBOARDING_INIT_QUERY,
    };

    const { data } = await this.#httpClient.post(this.#gqlUrl, requestPayload);
    const result = data?.onboardingInit;

    if (!result) {
      throw new Error("Missing response data at `onboardingInit`");
    }

    return result;
  }

  async approvalInit(toolCall, displayString) {
    const requestPayload = {
      operationName: "approvalInit",
      query: APPROVAL_INIT_QUERY,
      variables: {
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
