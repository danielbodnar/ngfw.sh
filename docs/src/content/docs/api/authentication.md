---
title: Authentication
description: How to authenticate with the NGFW.sh API
---

NGFW.sh uses Clerk.com for authentication, providing secure authentication with multiple methods including email/password, phone, OAuth, MFA, and passkeys.

## Supported Authentication Methods

- Email/Password
- Phone Number (SMS)
- OAuth (Google, GitHub)
- Multi-factor Authentication (MFA)
- Passkeys (WebAuthn)

## Obtaining a Token

### Via the Web Portal

1. Sign in at [ngfw.sh](https://ngfw.sh)
2. Navigate to **Profile** → **API Tokens**
3. Click **Generate Token**
4. Copy the token (it won't be shown again)

### Via OAuth Flow

For applications that need to authenticate users:

```javascript
// Using Clerk's JavaScript SDK
import Clerk from '@clerk/clerk-js';

const clerk = new Clerk('pk_test_dG91Z2gtdW5pY29ybi0yNS5jbGVyay5hY2NvdW50cy5kZXYk');
await clerk.load();

// Sign in with redirect
await clerk.client.signIn.create({
  identifier: 'user@example.com',
  password: 'password'
});
```

## Using the Token

Include the token in the `Authorization` header:

```bash
curl https://api.ngfw.sh/api/system/status \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIs..."
```

## Token Claims

JWT tokens include the following claims:

| Claim | Description |
|-------|-------------|
| `sub` | User ID |
| `org_id` | Organization ID (business plans) |
| `plan` | Subscription plan (`free`, `home`, `homeplus`, `pro`, `business`) |
| `exp` | Expiration timestamp |

## Token Expiration

- Access tokens expire after 1 hour
- Use refresh tokens to obtain new access tokens
- API tokens (generated from dashboard) expire after 1 year

## Router Agent Authentication

Router agents use a separate authentication mechanism with device-specific API keys:

1. Register a device in the dashboard
2. Copy the generated API key
3. Configure the agent with the key

```bash
ngfw-agent configure --api-key ngfw_dev_abc123...
```

Agent API keys are stored in Cloudflare KV and can be revoked from the dashboard at any time.

## Security Best Practices

1. **Never expose tokens in client-side code** - Use server-side API calls
2. **Rotate tokens regularly** - Especially for automated systems
3. **Use environment variables** - Don't hardcode tokens
4. **Limit token scope** - Request only necessary permissions
5. **Monitor API usage** - Check for unusual patterns in the dashboard
