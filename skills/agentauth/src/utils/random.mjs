/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

export const randomDelay = async (ms) => {
  const delay = Math.floor(Math.random() * ms) + 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));
}
