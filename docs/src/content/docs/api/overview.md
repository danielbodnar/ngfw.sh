---
title: API Overview
description: NGFW.sh REST API reference
---

The NGFW.sh API provides programmatic access to all firewall configuration and monitoring features.

## Base URL

```
https://api.ngfw.sh
```

## Authentication

All API requests require a Bearer token in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://api.ngfw.sh/api/system/status
```

Tokens are JWTs issued by Clerk.com with the following claims:

- `sub` - User ID (Clerk user_id)
- `azp` - Authorized party (client application)
- `exp` - Expiration timestamp
- `iat` - Issued at timestamp
- `iss` - Issuer (Clerk instance URL)

## OpenAPI Specification

The complete OpenAPI 3.1 specification is available at:

- **JSON format**: [api.ngfw.sh/openapi.json](https://api.ngfw.sh/openapi.json)

## Rate Limits

| Endpoint Pattern | Limit |
|------------------|-------|
| `/api/auth/*` | 10/min |
| `/api/traffic/logs` | 60/min |
| `/api/*/stream` | 5 concurrent |
| All other endpoints | 120/min |

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "INVALID_CONFIG",
    "message": "Invalid subnet mask",
    "field": "subnet_mask",
    "details": {}
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or expired token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `INVALID_CONFIG` | 400 | Configuration validation failed |
| `DEVICE_OFFLINE` | 503 | Router agent not connected |
| `PLAN_LIMIT` | 403 | Plan limit exceeded |
| `RATE_LIMIT` | 429 | Too many requests |

## Quick Examples

### Get System Status

```bash
curl https://api.ngfw.sh/api/system/status \
  -H "Authorization: Bearer $TOKEN"
```

### List Firewall Rules

```bash
curl https://api.ngfw.sh/api/firewall/rules \
  -H "Authorization: Bearer $TOKEN"
```

### Create a Firewall Rule

```bash
curl -X POST https://api.ngfw.sh/api/firewall/rules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Block Telnet",
    "zone_from": "WAN",
    "zone_to": "LAN",
    "protocol": "tcp",
    "port": "23",
    "action": "drop"
  }'
```

## SDKs

Official SDKs are coming soon for:

- TypeScript/JavaScript
- Python
- Go

In the meantime, you can generate clients from the OpenAPI spec using tools like [openapi-generator](https://openapi-generator.tech/).
