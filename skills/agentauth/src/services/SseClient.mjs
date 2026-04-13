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
