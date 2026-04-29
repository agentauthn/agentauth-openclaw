/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import open from "open";
import { WEBCHAT, parseNotify } from "../utils/notifications.mjs";

export class IdentityGateWay {
  #loginIdService;
  #openClawService;
  #envManager;
  #commandExecutor;
  #config;

  constructor({ loginIdService, openClawService, envManager, commandExecutor, config }) {
    this.#loginIdService = loginIdService;
    this.#openClawService = openClawService;
    this.#envManager = envManager;
    this.#commandExecutor = commandExecutor;
    this.#config = config;
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
    const { topic, link: authUrl } = await this.#loginIdService.createAuthSession();
    if (!topic) {
      throw new Error("Authentication session is not found");
    }

    return { authUrl, topic };
  }

  async approvalInit(toolCall, displayString) {
    const result = await this.#loginIdService.approvalInit(toolCall, displayString);
    const { approvalUrl, sessionId } = result;

    return { approvalUrl, sessionId };
  }

  async #handleSessionWait(topic, url, { notify, notificationMessage }) {
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

    return await this.#loginIdService.waitForSession(topic);
  }

  async approvalWait(sessionId, approvalUrl, { notify } = {}) {
    const notificationMessage = "An action requires your approval. Please visit this URL to review: {{url}}";
    const eventData = await this.#handleSessionWait(sessionId, approvalUrl, { notify, notificationMessage });

    if (eventData?.status?.toLowerCase() === "approved") {
      return JSON.stringify({ status: "approved" });
    } else {
      this.#notify(notify, "The action was denied.");
      return JSON.stringify({ status: "deny" });
    }
  }

  async authFlow({ notify } = {}) {
    if (this.#config.hasCredentials) {
      throw new Error("Onboarding has already been completed. You cannot create another onboarding session.");
    }
    const { authUrl, topic } = await this.createAuthSession();
    const notificationMessage = "Please visit this URL to complete onboarding: {{url}}";
    const eventData = await this.#handleSessionWait(topic, authUrl, { notify, notificationMessage });
    if (eventData?.status?.toLowerCase() === "api_key_created") {
      const { meta } = eventData;
      const { api_key, key_id } = meta;

      await this.#envManager.saveCredentials(key_id, api_key);
      await this.#envManager.updateAgentMarkdown();

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
        if (this.#commandExecutor) {
          const { error, stdout, stderr } = await this.#commandExecutor.execute(toolCall);
          if (error) {
            this.#notify(notify, `Execution failed for command: \`${toolCall}\`. Error: ${stderr || error.message}`);
            return {
              status: "approved_but_execution_failed",
              error: stderr || error.message,
              stdout,
            };
          } else {
            this.#notify(notify, `Successfully executed command: \`${toolCall}\``);
            return {
              status: "approved_and_executed",
              stdout,
              stderr,
            };
          }
        }
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
