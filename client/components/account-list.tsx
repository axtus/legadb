import { Account } from "../hooks/tnhooks/useAccounts";

interface AccountListProps {
	accounts: Account[];
	isLoading: boolean;
}

export function AccountList({ accounts, isLoading }: AccountListProps) {
	if (isLoading) {
		return (
			<div className="space-y-4">
				{[...Array(3)].map((_, i) => (
					<div
						key={i}
						className="h-24 rounded-lg border border-border bg-card animate-pulse"
					/>
				))}
			</div>
		);
	}

	if (accounts.length === 0) {
		return (
			<div className="text-center py-12 border border-dashed border-border rounded-lg">
				<p className="text-muted-foreground">No accounts found.</p>
				<p className="text-sm text-muted-foreground mt-1">
					Create your first account to get started.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-md border border-border overflow-hidden">
			<table className="w-full text-sm text-left">
				<thead className="bg-muted text-muted-foreground font-medium">
					<tr>
						<th className="px-4 py-3">ID</th>
						<th className="px-4 py-3">External ID</th>
						<th className="px-4 py-3">Ledger ID</th>
						<th className="px-4 py-3">Currency</th>
						<th className="px-4 py-3">Balance Type</th>
						<th className="px-4 py-3 text-right">Created</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border bg-card">
					{accounts.map((account) => (
						<tr
							key={account.id}
							className="hover:bg-muted/50 transition-colors"
						>
							<td className="px-4 py-3 font-mono">{account.id}</td>
							<td className="px-4 py-3">
								{account.external_id || (
									<span className="text-muted-foreground italic">None</span>
								)}
							</td>
							<td className="px-4 py-3">{account.ledger_id}</td>
							<td className="px-4 py-3">{account.currency_code}</td>
							<td className="px-4 py-3">
								<span
									className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-neutral-400`}
								>
									{account.balance_type}
								</span>
							</td>
							<td className="px-4 py-3 text-right text-muted-foreground">
								{new Date(account.created_at).toLocaleDateString()}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
