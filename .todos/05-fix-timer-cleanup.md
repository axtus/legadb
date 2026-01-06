---
id: fix-timer-cleanup
title: Fix Uncleared Timeout in React Component
severity: HIGH
priority: P1
category: Performance
status: pending
locations:
  - client/components/api-key-list.tsx:17-26
related_issues:
  - 3.1
cvss_score: 6.8
---

## Description

The `handleCopyKey` function creates a timeout without cleanup. If the component
unmounts before the timeout fires, React will warn about state update on
unmounted component.

```typescript
async function handleCopyKey(apiKey: ApiKey) {
	try {
		await navigator.clipboard.writeText(apiKey.key);
		setCopiedId(apiKey.id);
		toast.success("API key copied to clipboard");
		setTimeout(() => setCopiedId(null), 2000); // No cleanup!
	} catch {
		toast.error("Failed to copy API key");
	}
}
```

**Impact**:

- Memory leak on rapid component unmounts
- React warning spam in console
- Potential memory accumulation in long-running sessions

## Remediation

Use `useEffect` with cleanup to manage the timeout:

```typescript
// Option 1: useEffect with cleanup
useEffect(() => {
	if (!copiedId) return;
	const timeoutId = setTimeout(() => setCopiedId(null), 2000);
	return () => clearTimeout(timeoutId);
}, [copiedId]);

async function handleCopyKey(apiKey: ApiKey) {
	try {
		await navigator.clipboard.writeText(apiKey.key);
		setCopiedId(apiKey.id);
		toast.success("API key copied to clipboard");
	} catch {
		toast.error("Failed to copy API key");
	}
}
```

## Code References

See `client/components/api-key-list.tsx` lines 17-26 for the current
implementation.
