# ClawPass

An OpenClaw skill for accessing LoginID's Identity Gateway (IDGW).

Also includes a command-line tool for interacting with IDGW, with support for OpenClaw-based notifications.

This CLI enables secure approval flows for sensitive actions, allowing users to review and approve operations via a browser or configured notification channel.

---

## Features

- Create and manage approval sessions
- Wait for user approval via server-sent events (SSE)
- End-to-end approval flow command
- Notifications via OpenClaw (Telegram, Slack, WhatsApp, etc.)
- Test notification delivery
- Signed API requests using agent credentials

---

## Installation

```bash
npm link
lig --help
````

Or run locally:

```bash
npm install
node ./src/index.mjs --help
```

## Uninstall

If installed by linking:

```bash
npm unlink -g openclaw-cli
```

---

## Environment Variables

This skill requires the following values to be provided via `OpenClaw config` (`~/.openclaw/openclaw.json`).

| Variable            | Required | Description                                                                                 |
| ------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `IDGW_BASE_URL`     | No       | Base URL of the Identity Gateway (default: `http://localhost:8090`) |
| `LIG_AGENT_PRIVATE_KEY` | Yes      | PEM-encoded **RSA private key (RSA-PSS SHA-512)** used to sign requests to Identity Gateway |
| `LIG_AGENT_KEY_ID`      | Yes      | Public HTTPS URL where your **corresponding public key is hosted** (used for verification)  |
| `LIG_NOTIFY`        | No       | Default notification target in format `provider:destination` (used if `--notify` not set)   |

### Example

```json
{
  "skills": {
    "entries": {
      "loginid-identity-gateway": {
        "enabled": true,
        "env": {
          "LIG_AGENT_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
          "LIG_AGENT_KEY_ID": "https://your-domain/.well-known/agent-key",
          "LIG_NOTIFY": "slack:user:UXXXXXXX"
        }
      }
    }
  }
}
```

---

## Authentication (HTTP Message Signatures)

This CLI authenticates with Identity Gateway using [HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421.pdf).

To use it, you must generate an **RSA-PSS SHA-512 key pair** (only supported) and configure both your private key and a public key endpoint.

1. **Generate a key pair (PEM)**

Example using OpenSSL:

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private.pem
openssl rsa -pubout -in private.pem -out public.pem
```

2. **Configure your private key**

Set your private key as an environment variable. Make sure it is all in one line.

```bash
LIG_AGENT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

This key is used by the CLI to sign outgoing requests.

3. **Host your public key**

You must expose your **public key via an HTTP endpoint** that returns the PEM-encoded public key.

This endpoint must be publicly accessible (HTTPS) by the Identity Gateway service.

**DEV NOTE**: A local HTTP service can be used if running Identity Gateway locally.

Example:

```
GET https://your-domain.com/.well-known/agent-key
```

Response:

```
-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----
```

Here is a minimal example using Node.js:

```js
import express from "express";
import fs from "fs";

const app = express();
const publicKey = fs.readFileSync("./public.pem", "utf8");

app.get("/.well-known/agent-key", (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Cache-Control", "max-age=300");
  res.status(200).send(publicKey);
});

app.listen(3000);
```

4. **Set your key ID**

Set `LIG_AGENT_KEY_ID` to the **URL of your public key endpoint**:

```bash
LIG_AGENT_KEY_ID=https://your-domain.com/.well-known/agent-key
```

When your CLI makes a request:

1. It signs the request using `LIG_AGENT_PRIVATE_KEY`
2. Identity Gateway reads `LIG_AGENT_KEY_ID`
3. It fetches your public key from that URL
4. It verifies the signature

This ensures that **only your agent can create approval sessions.**

---

## Notifications (OpenClaw)

This CLI integrates with OpenClaw’s message API to send approval notifications.

Documentation:

- [https://docs.openclaw.ai/cli/message](https://docs.openclaw.ai/cli/message)
- [https://docs.openclaw.ai/channels](https://docs.openclaw.ai/channels)

### Important

- Notifications are best-effort
- If notification fails, the CLI falls back to opening the browser
- You must configure your OpenClaw channel correctly before notifications will work

### Format

```bash
--notify <provider:destination>
```

Examples:

```bash
telegram:@username
slack:channel:C123456
whatsapp:+123456789
```

---

## Commands

### create-session

Creates an approval session and returns a URL.

```bash
lig create-session "<toolCall>" "<displayString>"
```

Example:

```bash
lig create-session "rm -rf /" "Delete all files"
```

---

### wait-for-session

Waits for a session to complete. Optionally sends a notification.

```bash
lig wait-for-session <sessionId> [approvalUrl] --notify <provider:destination>
```

Example:

```bash
lig wait-for-session abc123 https://approval.url \
  --notify telegram:@mychat
```

---

### approval-flow

Runs the full flow:

1. Create session
2. Send notification (optional)
3. Wait for approval

```bash
lig approval-flow "<toolCall>" "<displayString>" --notify <provider:destination>
```

Example:

```bash
lig approval-flow \
  "terraform apply" \
  "Apply infrastructure changes" \
  --notify slack:channel:C123456
```

---

### test-notify

Sends a test message using OpenClaw.

```bash
lig test-notify "<message>" --notify <provider:destination>
```

Example:

```bash
lig test-notify "Hello from CLI" \
  --notify telegram:@mychat
```

If `--notify` is not provided, the CLI will use `LIG_NOTIFY`.

---

## How Notifications Work

The CLI invokes OpenClaw internally:

```bash
openclaw message send --channel <channel> --message <message> --target <target>
```

During approval:

- If `notify` is set, a notification is sent
- If notification fails, the CLI opens the approval URL in the browser
- It is recommended to verify your setup using `test-notify`

---

## How It Works

1. approvalInit
   Sends a GraphQL request to IDGW and returns `approvalUrl` and `sessionId`

2. approvalWait
   Optionally sends a notification, then waits for an SSE event (`session`)

3. approvalFlow
   Combines initialization and waiting into a single command

---

## Troubleshooting

### Notifications not working

- Ensure OpenClaw is installed:

  ```bash
  openclaw --version
  ```
- Verify your channel configuration:
  [https://docs.openclaw.ai/channels](https://docs.openclaw.ai/channels)
- Test manually:

  ```bash
  openclaw message send --channel telegram --message "test" --target=@MyBot
  ```
- Use:

  ```bash
  export LIG_NOTIFY="telegram:@MyBot"
  lig test-notify "test"
  ```

---

## License

Apache License 2.0 © LoginID Inc.
