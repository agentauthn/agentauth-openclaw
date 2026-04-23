/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import open from "open";
import { base64UrlEncode } from "../utils/crypto.mjs";
import { WEBCHAT, parseNotify } from "../utils/notifications.mjs";

export class IdentityGateWay {
  #loginIdService;
  #openClawService;
  #envManager;

  constructor({ loginIdService, openClawService, envManager }) {
    this.#loginIdService = loginIdService;
    this.#openClawService = openClawService;
    this.#envManager = envManager;
  }

  #notify(notify, message) {
    if (notify && this.#openClawService) {
      const { channel, target } = parseNotify(notify);
      if (channel && target) {
        this.#openClawService.notify(message, channel, target);
      }
    }
  }

  async createAuthSession() {
    const authUrl = await this.#loginIdService.createAuthSession();

    const url = new URL(authUrl);
    const sessionId = url.searchParams.get('s');
    if (!sessionId) {
      throw new Error("Authentication session is not found");
    }

    const cleanUrl = new URL(url.origin + url.pathname);
    const encoded = base64UrlEncode(JSON.stringify({ sessionId }));

    cleanUrl.searchParams.set("d", encoded);

    return { authUrl: cleanUrl.toString(), sessionId };
  }

  async approvalInit(toolCall, displayString) {
    const result = await this.#loginIdService.approvalInit(toolCall, displayString);

    const { approvalUrl, ...rest } = result;
    const { sessionId } = rest;

    const url = new URL(approvalUrl);
    const filtered = Object.fromEntries(
      Object.entries(rest).filter(([_, v]) => v != null && v !== "")
    );
    const encoded = base64UrlEncode(JSON.stringify(filtered));

    url.searchParams.set("d", encoded);

    return { approvalUrl: url.toString(), sessionId };
  }

  async #handleSessionWait(sessionId, url, { notify, notificationMessage }) {
    if (url) {
      let notificationSent = false;
      if (notify && this.#openClawService) {
        const { channel, target } = parseNotify(notify);
        if (channel === WEBCHAT) {
          open(url.toString());
          notificationSent = true;
        } else if (channel && target) {
          const message = notificationMessage.replace("{{url}}", url.toString());
          notificationSent = this.#openClawService.notify(
            message,
            channel,
            target
          );
        }
      }

      if (!notificationSent) {
        console.log(`Falling back to opening browser.`);
        open(url.toString());
      }
    }

    return await this.#loginIdService.waitForSession(sessionId);
  }

  async approvalWait(sessionId, approvalUrl, { notify } = {}) {
    const notificationMessage = "An action requires your approval. Please visit this URL to review: {{url}}";
    const eventData = await this.#handleSessionWait(sessionId, approvalUrl, { notify, notificationMessage });

    if (eventData?.status?.toLowerCase() === "approved") {
      this.#notify(notify, "The action was approved.");
      return JSON.stringify({ status: "approved" });
    } else {
      this.#notify(notify, "The action was denied.");
      return JSON.stringify({ status: "deny" });
    }
  }

  async authFlow({ notify } = {}) {
    const { authUrl, sessionId } = await this.createAuthSession();
    const notificationMessage = "Please visit this URL to complete onboarding: {{url}}";
    const eventData = await this.#handleSessionWait(sessionId, authUrl, { notify, notificationMessage });
    if (eventData?.status?.toLowerCase() === "api_key_created") {
      const { meta } = eventData;
      const { api_key, key_id } = meta;

      await this.#envManager.saveCredentials(key_id, api_key);
      await this.#envManager.updateAgentMarkdown();

      console.log("Credentials saved to ~/.openclaw/.env");

      this.#notify(notify, "Onboarding successful. Credentials have been saved.");
      return { success: true, message: "Credentials are captured" };
    } else {
      this.#notify(notify, "Onboarding failed. Could not create credentials.");
      return { success: false, message: "Could not create credentials" };
    }
  }

  async approvalFlow(toolCall, displayString, { notify } = {}) {
    const { approvalUrl, sessionId } = await this.approvalInit(toolCall, displayString);

    try {
      const resultStr = await this.approvalWait(sessionId, approvalUrl, { notify });
      const result = JSON.parse(resultStr);
      if (result.status === "approved") {
        return {
          status: "approved",
        };
      } else {
        return {
          status: "deny",
        };
      }
    } catch (error) {
      return {
        status: "deny",
      };
    }
  }
}
