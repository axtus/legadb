---
id: replace-prisma-reads-auth
title: Replace Prisma Reads in auth.ts with getPG() Queries
severity: MEDIUM
priority: P2
category: Best Practices
status: pending
locations:
  - server/routes/auth.ts:233-241
related_issues:
  - 5.1
cvss_score: 4.0
---

## Description

AGENTS.md explicitly states:

> No Prisma read operations (findUnique, findMany, etc.) in codebase

However, `server/routes/auth.ts` uses `prisma.authSession.findUnique()`:

```typescript
const session = await prisma.authSession.findUnique({
	where: { token },
	select: {
		token: true,
		identityId: true,
		expiresAt: true,
		createdAt: true,
	},
});
```

**Impact**:

- Inconsistency with project standards
- Should use raw `pg` queries like other read operations

## Remediation

Convert to `getPG()` with tagged template:

```typescript
import { getPG } from "@/domain/db/postgres";

const pg = getPG();
const [session] = await pg<AuthSession[]>`
	SELECT token, identity_id, expires_at, created_at
	FROM auth_sessions
	WHERE token = ${token}
`;

if (!session) {
	return CBORErrorResponse("Invalid session", { status: 401 });
}
```

## Code References

See `server/routes/auth.ts` lines 233-241 for the current Prisma implementation.
