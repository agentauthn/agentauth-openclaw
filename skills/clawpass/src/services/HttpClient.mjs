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

export class HttpClient {
  constructor({ signer } = {}) {
    this.signer = signer;
  }

  async post(url, body, options = {}) {
    return await this.#request(url, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    });
  }

  async #request(url, options = {}) {
    let {
      method = "GET",
      headers = {},
      body,
      ...rest
    } = options;

    let finalHeaders = {
      "content-type": "application/json",
      ...headers,
    };

    const request = new Request(url, {
      method,
      headers: finalHeaders,
      body,
      ...rest,
    });

    if (this.signer) {
      const signed = await this.signer.sign(request);
      if (signed instanceof Request) {
        finalHeaders = Object.fromEntries(signed.headers.entries());
      } else {
        finalHeaders = {
          ...finalHeaders,
          ...signed,
        };
      }
    }

    const res = await fetch(url, {
      method,
      headers: finalHeaders,
      body,
      ...rest,
    });

    if (!res.ok) {
      let errorBody;
      try {
        errorBody = await res.json();
        errorBody = JSON.stringify(errorBody);
      } catch {
        errorBody = { message: res.statusText };
      }

      const message =
        errorBody?.errors ||
        errorBody?.message ||
        `API Error: ${res.status}`;

      throw new Error(message);
    }

    if (res.status === 204) {
      return undefined;
    }

    return res.json();
  }
}
