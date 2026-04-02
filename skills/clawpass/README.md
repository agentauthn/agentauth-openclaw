# ClawPass (Approval Flow for OpenClaw)

This skill adds **human approval + identity verification** before OpenClaw performs dangerous actions.

OpenClaw will automatically use this when it detects a **high-risk action**, such as:

- Deleting files or data
- Sending emails or external writes
- Database changes
- Deployments or production changes
- Security or permission updates

---

## Command Used by OpenClaw

```bash
node ./scripts/cli.js approval-flow "<toolCall>" "<displayString>" [--notify <channel:target>]
```

---

## What Happens

1. **When OpenClaw detects a dangerous action that it needs to use**

2. It runs:

   ```bash
   node ./scripts/cli.js approval-flow ...
   ```

3. The script:

   - Creates an approval session with LoginID Identity Gateway
   - Generates an approval URL

4. The user is notified:

   - If `--notify` or `LIG_NOTIFY` is set → message is sent (Telegram, Slack, etc.)
   - If notification fails → browser opens automatically

5. The user:

   - Opens the approval link
   - Sees the required action
   - Approves or denies using a **passkey**

6. OpenClaw **waits** until one of these happens:

   - Approved
   - Denied
   - Timeout

7. OpenClaw continues based on the result:

   - **Approved** → action is executed
   - **Denied** → action is ignored 
   - **Timeout** → action is ignored

---

## Environment Variables

The script relies on the following environment variables:

| Variable            | Required | Description                                                                                 |
| ------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `LIG_AGENT_PRIVATE_KEY` | Yes      | PEM-encoded **RSA private key (RSA-PSS SHA-512)** used to sign requests to Identity Gateway |
| `LIG_AGENT_KEY_ID`      | Yes      | Public HTTPS URL where your **corresponding public key is hosted** (used for verification)  |
| `LIG_NOTIFY`        | No       | Default notification target in format `provider:destination` (used if `--notify` not set)   |

### Example `.env`

```env
LIG_AGENT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
LIG_AGENT_KEY_ID=https://my-domain/.well-known/agent/public-key
LIG_NOTIFY=telegram:@mychat
```

---

## Notifications (OpenClaw)

Optional:

```bash
--notify <channel:target>
```

Attempts to use [OpenClaw's message API](https://docs.openclaw.ai/cli/message) to notify the user to open the approval URL.

Examples:

- `telegram:@user`
- `slack:channel:C123`
- `whatsapp:+123456789`

If not set or fails → browser opens automatically.

> OpenClaw may not send the `--notify` flag. To ensure that notification is always sent set the `LIG_NOTIFY` environment variable.

---

## Test Notifications

Manually test to see if notifications is working by using:

```bash
node ./scripts/cli.js test-notify "Hello" --notify telegram:@user
```

Or:

```bash
export LIG_NOTIFY=telegram:@user
node ./scripts/cli.js test-notify "Hello"
```

---

## Authentication (HTTP Message Signatures)

This script authenticates with Identity Gateway using [HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421.pdf).

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

This key is used by the script to sign and create a identity session.

3. **Host your public key**

You must expose your **public key via an HTTP endpoint** that returns the PEM-encoded public key.

This endpoint must be publicly accessible (HTTPS) by the Identity Gateway service.

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

When the script makes a request:

1. It signs the request using `LIG_AGENT_PRIVATE_KEY`
2. Identity Gateway reads `LIG_AGENT_KEY_ID`
3. It fetches your public key from that URL
4. It verifies the signature

This ensures that **only your agent can create approval sessions.**

---

## Troubleshooting

### Notifications not working

Make sure that your channel is configured and working correctly.

Then you can test the integration with:

```bash
node ./scripts/cli.js test-notify "test" --notify telegram:@user
```

https://docs.openclaw.ai/channels

## License

Apache License 2.0 © LoginID Inc.
