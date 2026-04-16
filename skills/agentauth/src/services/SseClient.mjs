/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import { EventSource } from "eventsource";

export class SseClient {
  constructor({ signer } = {}) {
    this.signer = signer;
  }

  async waitForEvent(url, { eventName, timeout = 60000 }) {
    return new Promise(async (resolve, reject) => {
      let eventSource;

      const timeoutId = setTimeout(() => {
        if (eventSource) {
          eventSource.close();
        }
        reject(new Error(`Timeout: Did not receive '${eventName}' event within ${timeout / 1000}s`));
      }, timeout);

      try {
        let headers = {};
        if (this.signer) {
          const mockRequest = new Request(url, { method: "GET" });
          const signedHeaders = await this.signer.sign(mockRequest);
          headers = { ...signedHeaders };
        }
        
        eventSource = new EventSource(url, { headers });

        eventSource.addEventListener(eventName, (event) => {
          clearTimeout(timeoutId);
          eventSource.close();
          try {
            const data = JSON.parse(event.data);
            resolve(data);
          } catch (e) {
            reject(new Error("Failed to parse event data"));
          }
        });

        eventSource.onerror = (err) => {
          clearTimeout(timeoutId);
          eventSource.close();
          reject(err || new Error("SSE connection error"));
        };
      } catch (err) {
        clearTimeout(timeoutId);
        reject(err);
      }
    });
  }
}
