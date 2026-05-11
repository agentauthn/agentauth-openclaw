/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import { redact } from '../../src/utils/redact.mjs';

describe('redact', () => {
  it('should return the original text if it does not contain any secrets', () => {
    const text = 'This is a normal text without any secrets.';
    expect(redact(text)).toBe(text);
  });

  it('should return non-string input as is', () => {
    expect(redact(null)).toBeNull();
    expect(redact(undefined)).toBeUndefined();
    expect(redact(123)).toBe(123);
    const obj = { a: 1 };
    expect(redact(obj)).toBe(obj);
  });

  it('should redact bearer tokens', () => {
    expect(redact('Authorization: Bearer my-secret-token')).toBe('Authorization: Bearer [REDACTED]');
    expect(redact('authorization: bearer my-secret-token')).toBe('authorization: bearer [REDACTED]');
  });

  it('should redact credentials in URLs', () => {
    expect(redact('https://user:password@example.com')).toBe('https://user:[REDACTED]@example.com');
    expect(redact('ftp://user:secret-token@ftpserver.com')).toBe('ftp://user:[REDACTED]@ftpserver.com');
    expect(redact('https://user@example.com')).toBe('https://user@example.com');
  });

  describe('command-line arguments', () => {
    it.each([
      ['my-tool --password my-secret-password', 'my-tool --password [REDACTED]'],
      ['my-tool --password=my-secret-password', 'my-tool --password=[REDACTED]'],
      ['my-tool -p my-secret-password', 'my-tool -p [REDACTED]'],
      ['my-tool --api-key my-key', 'my-tool --api-key [REDACTED]'],
      ['my-tool --secret my-secret', 'my-tool --secret [REDACTED]'],
      ['my-tool --token my-token', 'my-tool --token [REDACTED]'],
      ['my-tool --access-token my-token', 'my-tool --access-token [REDACTED]'],
      ['my-tool --auth-token my-token', 'my-tool --auth-token [REDACTED]'],
      ['my-tool --access-token=my-token', 'my-tool --access-token=[REDACTED]'],
      ['my-tool --auth-token=my-token', 'my-tool --auth-token=[REDACTED]'],
      ['my-tool --password --another-flag', 'my-tool --password --another-flag'],
      ['my-tool -p --another-flag', 'my-tool -p --another-flag'],
    ])('should redact "%s"', (text, expected) => {
      expect(redact(text)).toBe(expected);
    });
  });

  it.each([
    ['api_key=my-api-key', 'api_key=[REDACTED]'],
    ['api-key: my-api-key', 'api-key: [REDACTED]'],
    ['apikey="my-api-key"', 'apikey="[REDACTED]"'],
    ['secret: "my-secret"', 'secret: "[REDACTED]"'],
    ['token="my-token"', 'token="[REDACTED]"'],
    ['password: my-password', 'password: [REDACTED]'],
    ['The token is: token=foo', 'The token is: token=[REDACTED]'],
  ])('should redact generic assignment "%s"', (text, expected) => {
    expect(redact(text)).toBe(expected);
  });

  it('should redact AWS access keys', () => {
    const text = 'The AWS key is ASIA1234567890123456 in the string.';
    const expected = 'The AWS key is [REDACTED] in the string.';
    expect(redact(text)).toBe(expected);
  });

  it('should redact GitHub tokens', () => {
    const text = 'My token is ghp_abcdefghijklmnopqrstuvwxyzABCDEFGHIJ for GitHub.';
    const expected = 'My token is [REDACTED] for GitHub.';
    expect(redact(text)).toBe(expected);
  });

  it('should redact PEM private keys', () => {
    const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIICXQIBAAKBgQCqGPU5QO2E5dY4C276S47G5a15N2l8d7gY5b2aJ3p8r+1aJ5e2
...
-----END RSA PRIVATE KEY-----`;
    const text = `The private key is ${privateKey}`;
    const expected = 'The private key is [REDACTED]';
    expect(redact(text)).toBe(expected);
  });

  it('should redact different types of PEM private key', () => {
    const privateKey = `-----BEGIN EC PRIVATE KEY-----
MIICXQIBAAKBgQCqGPU5QO2E5dY4C276S47G5a15N2l8d7gY5b2aJ3p8r+1aJ5e2
...
-----END EC PRIVATE KEY-----`;
    const text = `The private key is ${privateKey}`;
    const expected = 'The private key is [REDACTED]';
    expect(redact(text)).toBe(expected);
  });

  it('should redact multiple secrets in a single string', () => {
    const text = 'auth: bearer my-token, and also api-key=my-key and an aws key ASIA1234567890123456';
    const expected = 'auth: bearer [REDACTED], and also api-key=[REDACTED] and an aws key [REDACTED]';
    expect(redact(text)).toBe(expected);
  });

  it('should redact OpenAI keys', () => {
    const text = 'My OpenAI key is sk-proj-123456789012345678901234';
    const expected = 'My OpenAI key is [REDACTED]';
    expect(redact(text)).toBe(expected);
  });

  it('should redact Anthropic keys', () => {
    const text = 'My Anthropic key is sk-ant-123456789012345678901234';
    const expected = 'My Anthropic key is [REDACTED]';
    expect(redact(text)).toBe(expected);
  });

  it('should redact Google API keys', () => {
    const text = 'My Google API key is AIzaSyChOToKiEn12345678901234567890';
    const expected = 'My Google API key is [REDACTED]';
    expect(redact(text)).toBe(expected);
  });

  it('should redact JWTs', () => {
    const text = 'My JWT is eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const expected = 'My JWT is [REDACTED]';
    expect(redact(text)).toBe(expected);
  });

  it.each([
    ['MY_APP_TOKEN=some-secret-token', 'MY_APP_TOKEN=[REDACTED]'],
    ['SECRET_KEY=supersecret', 'SECRET_KEY=[REDACTED]'],
    ['MY_PASSWORD=12345', 'MY_PASSWORD=[REDACTED]'],
    ['API_KEY_PROD=abcdef', 'API_KEY_PROD=[REDACTED]'],
  ])('should redact environment variable assignments "%s"', (text, expected) => {
    expect(redact(text)).toBe(expected);
  });

  it.each([
    ['curl -H "Authorization: Bearer my-secret-token"', 'curl -H "Authorization: [REDACTED]"'],
    ["curl -H 'X-API-Key: my-api-key'", "curl -H 'X-API-Key: [REDACTED]'"],
  ])('should redact curl headers "%s"', (text, expected) => {
    expect(redact(text)).toBe(expected);
  });

  it('should redact AWS session tokens', () => {
    const text = 'My AWS session token is FwoGZXIvYXdzEMj///////////8/w/etc...';
    const expected = 'My AWS session token is [REDACTED]...';
    expect(redact(text)).toBe(expected);
  });

  describe('high entropy strings', () => {
    it('should redact a high entropy string', () => {
      const text = 'my secret is a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6';
      const expected = 'my secret is [REDACTED]';
      expect(redact(text)).toBe(expected);
    });

    it('should not redact a low entropy string that is long', () => {
      const text = 'thisisareallylongstringoftextthatshouldnotberedacted';
      expect(redact(text)).toBe(text);
    });

    it('should not redact a long hex string with low entropy', () => {
      const text = 'The commit hash is 1111111111111111111111111111111111111111';
      expect(redact(text)).toBe(text);
    });

    it('should redact a random base64 string', () => {
      const text = 'data: abCDefGHiJklMnoPqRstUVwXyZ12345/67+89/==';
      const expected = 'data: [REDACTED]';
      expect(redact(text)).toBe(expected);
    });

    it('should not redact long words in URLs', () => {
      const text = 'https://example.com/this-is-a-very-long-path-segment-that-is-not-a-secret';
      expect(redact(text)).toBe(text);
    });
  });
});
