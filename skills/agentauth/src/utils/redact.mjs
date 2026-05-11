/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

/**
 * Calculates the Shannon entropy of a string.
 * @param {string} str The input string.
 * @returns {number} The Shannon entropy in bits per character.
 */
function shannonEntropy(str) {
  if (!str) {
    return 0;
  }
  const len = str.length;
  const frequencies = {};
  for (let i = 0; i < len; i++) {
    const char = str[i];
    frequencies[char] = (frequencies[char] || 0) + 1;
  }

  let entropy = 0;
  for (const char in frequencies) {
    const frequency = frequencies[char] / len;
    entropy -= frequency * Math.log2(frequency);
  }

  return entropy;
}

// A basic list of regex patterns to find common secret formats.
const SECRET_PATTERNS = [
  // Bearer
  [/(bearer\s+)([a-zA-Z0-9\-._~+/]+=*)/gi, '$1[REDACTED]'],

  // URI with credentials
  [/(:\/\/)([^:]+):([^@]+@)/gi, '$1$2:[REDACTED]@'],

  // Command-line flags with space-separated secrets, e.g. --password my-secret
  [/((?:--|-)(?:api[-_]?key|access[-_]?token|auth[-_]?token|secret|token|password|passwd|pwd)|-p)\s+([^-\s][\S]*)/gi, '$1 [REDACTED]'],

  // Command-line flags with equals-separated secrets, e.g. --password=my-secret
  [/((?:--|-)(?:api[-_]?key|access[-_]?token|auth[-_]?token|secret|token|password|passwd|pwd))=([^\s]+)/gi, '$1=[REDACTED]'],

  // Generic assignments
  [/((?:api[-_]?key|secret|token|password|passwd|pwd)\s*[:=]\s*['"]?)([^'"\s]+)/gi, '$1[REDACTED]'],

  // Environment variable assignments
  [/\b([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|PWD|API_KEY|ACCESS_KEY)[A-Z0-9_]*)=([^\s]+)/g, '$1=[REDACTED]'],

  // curl headers
  [/(-H\s+["']?(?:Authorization|X-API-Key):\s*)([^"']+)/gi, '$1[REDACTED]'],

  // Generic JWTs
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\b/g, '[REDACTED]'],

  // OpenAI API keys
  [/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g, '[REDACTED]'],

  // Anthropic API keys
  [/\bsk-ant-[A-Za-z0-9\-_]{20,}\b/g, '[REDACTED]'],

  // Google / Gemini API keys
  [/\bAIza[0-9A-Za-z\-_]{35}\b/g, '[REDACTED]'],

  // AWS access keys
  [/\bA(?:AG|CC|GP|ID|IP|KI|NP|NV|PK|RO|SC|SI)A[A-Z0-9]{16}\b/g, '[REDACTED]'],

  // AWS session tokens
  [/\bFwoGZXIvYXdzE[A-Za-z0-9\/+=]{20,}\b/g, '[REDACTED]'],

  // GitHub tokens
  [/\bgh[pous]_[A-Za-z0-9]{36}\b/g, '[REDACTED]'],

  // Slack webhooks
  [/https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]{9}\/[A-Z0-9]{9}\/[A-Za-z0-9]+/gi, '[REDACTED]'],

  // PEM private keys
  [/-----BEGIN[\s\S]+?PRIVATE KEY-----[\s\S]+?-----END[\s\S]+?PRIVATE KEY-----/g, '[REDACTED]'],
];

export function redact(text) {
  if (typeof text !== 'string') {
    return text;
  }

  let redactedText = text;
  for (const [pattern, replacement] of SECRET_PATTERNS) {
    redactedText = redactedText.replace(pattern, replacement);
  }

  const MIN_ENTROPY = 4.3;
  const MIN_LENGTH = 20;
  // This regex finds long strings of characters that are common in secrets.
  const HIGH_ENTROPY_PATTERN = new RegExp(`[A-Za-z0-9\\-_+/=]{${MIN_LENGTH},}`, 'g');

  redactedText = redactedText.replace(HIGH_ENTROPY_PATTERN, (match) => {
    if (shannonEntropy(match) > MIN_ENTROPY) {
      return '[REDACTED]';
    }
    return match;
  });

  return redactedText;
}
