import { toast } from "sonner";
import type { Currency } from "../hooks/tnhooks/useCurrencies";
import { Button } from "./ds/button";

interface CurrencyListProps {
	currencies: Currency[];
	isLoading: boolean;
	onDelete: (code: string) => Promise<unknown>;
	isDeleting: boolean;
}

function CurrencyList(props: CurrencyListProps) {
	const { currencies, isLoading, onDelete, isDeleting } = props;

	async function handleDelete(code: string) {
		try {
			await onDelete(code);
			toast.success(`Currency ${code} deleted`);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to delete currency",
			);
		}
	}

	if (isLoading) {
		return (
			<div className="border border-border rounded-lg overflow-hidden">
				<table className="w-full">
					<thead className="bg-muted/50">
						<tr>
							<th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
								Code
							</th>
							<th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
								Name
							</th>
							<th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
								Symbol
							</th>
							<th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
								Usage
							</th>
							<th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
								Actions
							</th>
						</tr>
					</thead>
					<tbody>
						{[...Array(3)].map((_, i) => (
							<tr key={i} className="border-t border-border">
								<td className="px-4 py-3">
									<div className="h-4 w-12 bg-muted animate-pulse rounded" />
								</td>
								<td className="px-4 py-3">
									<div className="h-4 w-32 bg-muted animate-pulse rounded" />
								</td>
								<td className="px-4 py-3">
									<div className="h-4 w-8 bg-muted animate-pulse rounded" />
								</td>
								<td className="px-4 py-3">
									<div className="h-4 w-20 bg-muted animate-pulse rounded" />
								</td>
								<td className="px-4 py-3">
									<div className="h-8 w-16 bg-muted animate-pulse rounded ml-auto" />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	}

	if (currencies.length === 0) {
		return (
			<div className="text-center py-12 border border-dashed border-border rounded-lg">
				<p className="text-muted-foreground">No currencies found.</p>
				<p className="text-sm text-muted-foreground mt-1">
					Create or import currencies to get started.
				</p>
			</div>
		);
	}

	return (
		<div className="border border-border rounded-lg overflow-hidden">
			<table className="w-full">
				<thead className="bg-muted/50">
					<tr>
						<th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
							Code
						</th>
						<th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
							Name
						</th>
						<th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
							Symbol
						</th>
						<th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
							Usage
						</th>
						<th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
							Actions
						</th>
					</tr>
				</thead>
				<tbody>
					{currencies.map((currency) => (
						<tr
							key={currency.code}
							className="border-t border-border hover:bg-muted/30 transition-colors"
						>
							<td className="px-4 py-3">
								<span className="font-mono text-sm font-medium">
									{currency.code}
								</span>
							</td>
							<td className="px-4 py-3">{currency.name}</td>
							<td className="px-4 py-3">
								<span className="text-lg">{currency.symbol}</span>
							</td>
							<td className="px-4 py-3">
								{currency.inUse
									? (
										<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
											{currency.accountCount}{" "}
											account{currency.accountCount !== 1 ? "s" : ""}
										</span>
									)
									: (
										<span className="text-muted-foreground text-sm">
											Not in use
										</span>
									)}
							</td>
							<td className="px-4 py-3 text-right">
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleDelete(currency.code)}
									disabled={currency.inUse || isDeleting}
									title={currency.inUse
										? "Cannot delete: currency is in use"
										: "Delete currency"}
								>
									Delete
								</Button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export { CurrencyList };
export type { CurrencyListProps };
