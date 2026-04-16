/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

export const WEBUI = "webui";

export function parseNotify(notify) {
  if (!notify) {
    return { channel: null, target: null };
  }
  const [channel, ...targetParts] = notify.split(":");
  const target = targetParts.join(":");
  return { channel, target };
}
