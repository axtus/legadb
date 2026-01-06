---
id: fix-fire-and-forget-promise
title: Add Error Handling to Fire-and-Forget Promise
severity: HIGH
priority: P2
category: Logic
status: pending
locations:
  - utilities/auth-middleware.ts:79-80
related_issues:
  - 2.1
cvss_score: 6.5
---

## Description

The `updateApiKeyLastUsed()` function is called without `await` and without
error handling. If it fails, the error is silently swallowed.

```typescript
// Try API key auth (Authorization header)
const apiKey = getApiKeyFromHeader(req);
if (apiKey) {
	const apiKeyContext = await validateApiKey(apiKey);
	if (apiKeyContext) {
		// Fire and forget - no error handling!
		updateApiKeyLastUsed(apiKeyContext.id);
```

**Impact**:

- Silent failures in audit trails
- API key usage tracking becomes unreliable
- Makes debugging production issues harder

## Remediation

Add error handling with logging:

```typescript
if (apiKeyContext) {
	updateApiKeyLastUsed(apiKeyContext.id).catch((err) => {
		logger.warn("Failed to update API key last used timestamp", {
			apiKeyId: apiKeyContext.id,
			error: err instanceof Error ? err.message : String(err),
		});
	});
	// ... continue with auth context
}
```

Alternatively, if the update is critical, await it:

```typescript
try {
	await updateApiKeyLastUsed(apiKeyContext.id);
} catch (err) {
	logger.warn("Failed to update API key last used timestamp", {
		apiKeyId: apiKeyContext.id,
		error: err instanceof Error ? err.message : String(err),
	});
}
```

## Code References

See `utilities/auth-middleware.ts` lines 79-80 for the current implementation.
