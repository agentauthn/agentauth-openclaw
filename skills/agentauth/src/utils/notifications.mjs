/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

export const WEBCHAT = "webchat";

export function parseNotify(notify) {
  if (!notify) {
    return { channel: null, target: null };
  }
  if (!notify.includes(":")) {
    return { channel: notify, target: null };
  }
  const [channel, ...targetParts] = notify.split(":");
  const target = targetParts.join(":");
  return { channel, target };
}
