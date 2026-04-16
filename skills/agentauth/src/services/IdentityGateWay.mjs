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

  constructor({ loginIdService, openClawService }) {
    this.#loginIdService = loginIdService;
    this.#openClawService = openClawService;
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

  async approvalWait(sessionId, approvalUrl, { notify } = {}) {
    if (approvalUrl) {
      let notificationSent = false;
      if (notify && this.#openClawService) {
        const { channel, target } = parseNotify(notify);
        if (channel === WEBCHAT) {
          open(approvalUrl.toString());
          notificationSent = true;
        } else if (channel && target) {
          const message = `An action requires your approval. Please visit this URL to review: ${approvalUrl.toString()}`;
          notificationSent = this.#openClawService.notify(
            message,
            channel,
            target
          );
        }
      }

      if (!notificationSent) {
        console.log(`Falling back to opening browser.`);
        open(approvalUrl.toString());
      }
    }

    const { status } = await this.#loginIdService.approvalWait(sessionId);

    if (status === "approved") {
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
