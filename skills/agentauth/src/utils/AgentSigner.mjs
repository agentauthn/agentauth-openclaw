/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import { createHash, createPrivateKey } from "crypto";
import { httpbis, createSigner } from "http-message-signatures";

export class AgentSigner {
  #key;

  constructor(privateKey, keyId) {
    if (!privateKey) {
      throw new Error("Private key is required for AgentSigner");
    }
    if (!keyId) {
      throw new Error("Key ID is required for AgentSigner");
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
