import type { Transfer } from "../hooks/tnhooks/useTransfers";

interface TransferListProps {
	transfers: Transfer[];
	isLoading: boolean;
}

export function TransferList(props: TransferListProps) {
	const { transfers, isLoading } = props;
	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-muted-foreground">Loading transfers...</div>
			</div>
		);
	}

	if (transfers.length === 0) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-muted-foreground">No transfers found</div>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-border overflow-hidden">
			<table className="w-full">
				<thead className="bg-muted/50">
					<tr>
						<th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
							Date
						</th>
						<th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
							Amount
						</th>

						<th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
							Debit Account
						</th>
						<th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
							Credit Account
						</th>
						<th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
							Status
						</th>
						<th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
							Reference
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{transfers.map((transfer) => (
						<tr
							key={transfer.id}
							className="hover:bg-muted/30 transition-colors"
						>
							<td className="px-4 py-3 text-sm">
								{new Date(transfer.created_at).toLocaleDateString()}
							</td>
							<td className="px-4 py-3 text-sm font-medium">
								{parseFloat(transfer.amount).toLocaleString(undefined, {
									minimumFractionDigits: 0,
									maximumFractionDigits: 9,
								})} {transfer.currency_code}
							</td>
							<td className="px-4 py-3 font-mono text-xs">
								{transfer.debit_account_id}
							</td>
							<td className="px-4 py-3 font-mono text-xs">
								{transfer.credit_account_id}
							</td>
							<td className="px-4 py-3 text-sm">
								<span
									className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
										transfer.state === "POSTED"
											? "bg-green-500/10 text-green-700 dark:text-green-400"
											: transfer.state === "PENDING"
											? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
											: "bg-red-500/10 text-red-700 dark:text-red-400"
									}`}
								>
									{transfer.state}
								</span>
							</td>
							<td className="px-4 py-3 text-sm text-muted-foreground">
								{transfer.reference || "—"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
