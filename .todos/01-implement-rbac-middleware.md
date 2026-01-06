---
id: rbac-middleware
title: Implement Role-Based Access Control Middleware
severity: CRITICAL
priority: P0
category: Security
status: pending
locations:
  - server/routes/users.ts:169-171
  - server/routes/api-keys.ts:111-113
  - domain/fns/biz-logic/auth.ts:156-209
related_issues:
  - 1.1
cvss_score: 9.1
---

## Description

All admin operations use `requireSessionAuth()` middleware which validates
session existence but does **not** verify the user's `systemRole`. This allows
any authenticated user to:

- Create new admin/user accounts via `POST /api/users`
- List all users in the system via `GET /api/users`
- Manage API keys via `/api/api-keys` endpoints
- Change any user's password via `admin.changePassword` action

**Impact**: Complete privilege escalation - non-admin users can perform
administrative actions.

## Remediation

1. Create `requireAdminAuth()` middleware that validates
   `systemRole === "ADMIN"`
2. Extract `systemRole` in `extractAuthContext()` function
3. Apply to all administrative routes:
   - POST/GET/PATCH `/api/users`
   - POST/GET/DELETE `/api/api-keys`
   - POST `/auth` (admin.changePassword action)

## Code References

### Vulnerable Code Example

```typescript
// server/routes/users.ts
export const POST = requireSessionAuth(handlePost); // No role check!
export const GET = requireSessionAuth(handleGet); // No role check!
```

### Implementation Pattern

```typescript
// utilities/auth-middleware.ts
export function requireAdminAuth(handler: Handler) {
	return requireSessionAuth(async (req, ctx) => {
		if (ctx.systemRole !== "ADMIN") {
			return CBORErrorResponse("Admin privilege required", { status: 403 });
		}
		return handler(req, ctx);
	});
}
```
