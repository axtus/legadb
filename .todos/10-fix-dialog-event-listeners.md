---
id: fix-dialog-event-listeners
title: Fix Missing Memoization in Dialog Event Handlers
severity: MEDIUM
priority: P3
category: Performance
status: pending
locations:
  - client/components/ds/dialog.tsx:70-99
related_issues:
  - 3.3
cvss_score: 4.5
---

## Description

The dialog component's `useEffect` depends on `onOpenChange`, so if a parent
component is not memoizing the callback, the effect re-runs on every parent
render, causing event listeners to be re-attached repeatedly.

```typescript
useEffect(() => {
	const dialog = dialogRef.current;
	if (!dialog) return;

	function handleClose() {
		onOpenChange?.(false);
	}
	// ... more handlers defined here

	dialog.addEventListener("close", handleClose);
	dialog.addEventListener("cancel", handleCancel);
	dialog.addEventListener("keydown", handleKeyDown);

	return () => {
		dialog.removeEventListener("close", handleClose);
		// ...
	};
}, [onOpenChange]); // Re-runs whenever onOpenChange changes
```

**Impact**:

- Performance degradation in dialogs
- Potential memory leak if dialog remains mounted while parent repeatedly
  updates

## Remediation

### Option 1: Memoize in Parent Component

```typescript
// In parent component
const handleOpenChange = useCallback((open: boolean) => {
	setIsOpen(open);
}, []);

<Dialog open={isOpen} onOpenChange={handleOpenChange} />;
```

### Option 2: Memoize in Dialog Component

```typescript
// client/components/ds/dialog.tsx
const memoizedOnOpenChange = useCallback(
	onOpenChange || (() => {}),
	[onOpenChange],
);

useEffect(() => {
	const dialog = dialogRef.current;
	if (!dialog) return;

	function handleClose() {
		memoizedOnOpenChange(false);
	}
	// ... other handlers

	dialog.addEventListener("close", handleClose);
	// ...

	return () => {
		dialog.removeEventListener("close", handleClose);
		// ...
	};
}, [memoizedOnOpenChange]);
```

## Code References

See `client/components/ds/dialog.tsx` lines 70-99 for the current
implementation.
