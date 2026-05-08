/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

// A basic list of regex patterns to find common secret formats.
const SECRET_PATTERNS = [
  // Bearer tokens
  /(bearer\s+)[a-zA-Z0-9\-_.~+]+/gi,
  // key=value pairs
  /((?:api[-_]?key|secret|token|password)\s*[:=]\s*['"]?)[a-zA-Z0-9\-_.~+]+(['"]?)/gi,
];

export function redact(text) {
  if (typeof text !== 'string') {
    return text;
  }

  let redactedText = text;
  for (const pattern of SECRET_PATTERNS) {
    redactedText = redactedText.replace(pattern, '$1[REDACTED]$2');
  }
  return redactedText;
}
