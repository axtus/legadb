---
id: add-usememo-filters
title: Add useMemo to Filter Operations
severity: LOW
priority: P3
category: Performance
status: pending
locations:
  - client/components/import-currencies-dialog.tsx:25-29
related_issues:
  - 3.4
cvss_score: 2.5
---

## Description

Filter is recalculated on every render. If `availableCurrencies` is large, this
becomes expensive.

```typescript
const filteredCurrencies = availableCurrencies.filter(
	(c) =>
		c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
		c.name.toLowerCase().includes(searchQuery.toLowerCase()),
);
```

**Impact**:

- Minor performance issue on large currency lists
- CPU waste during frequent re-renders

## Remediation

Use `useMemo` to memoize the filtered result:

```typescript
const filteredCurrencies = useMemo(() => {
	return availableCurrencies.filter(
		(c) =>
			c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
			c.name.toLowerCase().includes(searchQuery.toLowerCase()),
	);
}, [availableCurrencies, searchQuery]);
```

## Code References

See `client/components/import-currencies-dialog.tsx` lines 25-29 for the current
implementation.
