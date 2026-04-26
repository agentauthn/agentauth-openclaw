# agentauth-openclaw

A collection of extensions for OpenClaw, including skills, tools, and integrations with AgentAuth.

This repository is organized into modular components.

---

## Overview

This project serves as a central place for building and maintaining reusable OpenClaw capabilities.

Extensions in this repository may include:

- Skills
- API integrations
- Future extension types (plugins, agents, etc.)

---

## Repository Structure

```
.
├── skills/
│   ├── openclaw/     # ClawPass (Identity Gateway approval CLI)
│   └── ...
```

Each extension is self-contained and includes its own documentation.

---

## Available Extensions

### agentauth

Location: `./skills/openclaw`

An OpenClaw-based skill that utilizes a CLI script for interacting with the AgentAuth Gateway, enabling secure approval tool workflows.

Features include:

- Approval session management
- Signed API requests using HTTP Message Signatures
- Notifications via OpenClaw channels

See full documentation:
`./skills/openclaw/README.md`

---

## Getting Started

Clone the repository:

```bash
git clone <your-repo>
cd <your-repo>
```

Navigate to an skill or extension:

```bash
cd skills/openclaw
```

---

## Documentation

- https://docs.openclaw.ai/cli
- https://docs.openclaw.ai/channels

---

## License

Apache License 2.0
