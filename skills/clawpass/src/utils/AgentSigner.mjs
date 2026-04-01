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

import { createHash, createPrivateKey } from "crypto";
import { httpbis, createSigner } from "http-message-signatures";

export class AgentSigner {
  #key;

  constructor(privateKey, keyId) {
    if (!privateKey) {
      throw new Error("Private key is required for WebBotSigner");
    }
    if (!keyId) {
      throw new Error("Key ID is required for WebBotSigner");
    }
    const pKey = createPrivateKey(privateKey);
    this.#key = createSigner(pKey, "rsa-pss-sha512", keyId);
  }

  async sign(request) {
    const requestOptions = {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
    };

    const fieldsToSign = ["@method", "@target-uri", "content-type"];

    const body = await request.clone().text();

    if (body) {
      requestOptions.body = body;
      const digest = createHash("sha512").update(body).digest("base64");
      requestOptions.headers["content-digest"] = `sha-512=:${digest}:`;
      fieldsToSign.push("content-digest");
    }

    const signedRequest = await httpbis.signMessage(
      {
        key: this.#key,
        fields: fieldsToSign,
        name: "sig1",
        paramValues: {
          created: new Date(),
          expires: new Date(Date.now() + 150_000),
        },
      },
      requestOptions
    );

    return signedRequest.headers;
  }
}
