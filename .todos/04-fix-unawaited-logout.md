---
id: fix-unawaited-logout
title: Fix Unawaited Promise in logout() Function
severity: HIGH
priority: P1
category: Logic
status: pending
locations:
  - domain/fns/biz-logic/auth.ts:84-94
related_issues:
  - 2.2
cvss_score: 6.5
---

## Description

The `logout()` function returns before the database update completes. The
function uses `.then()` instead of `await`, which means if the app crashes
before the `.then()` executes, the session is never invalidated.

```typescript
export async function logout(sessionToken: string): Promise<void | Error> {
	const logger = await getLogContext({ sessionToken, method: "logout" });
	if (!sessionToken) {
		return new Error401("Session token is required");
	}
	prisma.authSession.update({ // Missing await!
		where: {
			token: sessionToken,
		},
		data: {
			expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
		},
	}).then(() => {
		logger.info("Session logged out successfully");
	});
	return undefined;
}
```

**Impact**:

- Session tokens may remain valid after logout
- User can continue accessing system with "logged out" token
- Race condition: immediate repeated logout may not work

## Remediation

Add `await` to the Prisma update operation:

```typescript
export async function logout(sessionToken: string): Promise<void | Error> {
	const logger = await getLogContext({ sessionToken, method: "logout" });
	if (!sessionToken) {
		return new Error401("Session token is required");
	}

	await prisma.authSession.update({ // Add await
		where: { token: sessionToken },
		data: {
			expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
		},
	});

	logger.info("Session logged out successfully");
	return undefined;
}
```

## Code References

See `domain/fns/biz-logic/auth.ts` lines 84-94 for the current implementation.
