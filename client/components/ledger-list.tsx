import { Ledger } from "../hooks/tnhooks/useLedgers";

interface LedgerListProps {
	ledgers: Ledger[];
	isLoading: boolean;
}

export function LedgerList({ ledgers, isLoading }: LedgerListProps) {
	if (isLoading) {
		return (
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{[...Array(3)].map((_, i) => (
					<div
						key={i}
						className="h-32 rounded-lg border border-border bg-card animate-pulse"
					/>
				))}
			</div>
		);
	}

	if (ledgers.length === 0) {
		return (
			<div className="text-center py-12 border border-dashed border-border rounded-lg">
				<p className="text-muted-foreground">No ledgers found.</p>
				<p className="text-sm text-muted-foreground mt-1">
					Create your first ledger to get started.
				</p>
			</div>
		);
	}

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{ledgers.map((ledger) => (
				<div
					key={ledger.id}
					className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors"
				>
					<div className="flex items-start justify-between mb-4">
						<div className="bg-primary/10 text-primary text-xs font-mono px-2 py-1 rounded">
							ID: {ledger.id}
						</div>
					</div>
					<h3 className="text-lg font-semibold mb-2">{ledger.name}</h3>
					<p className="text-xs text-muted-foreground">
						Created: {new Date(ledger.created_at).toLocaleDateString()}
					</p>
				</div>
			))}
		</div>
	);
}
