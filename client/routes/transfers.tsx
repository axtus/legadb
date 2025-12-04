import { Layout } from "../components/layout";
import { TransferList } from "../components/transfer-list";
import { useTransfers } from "../hooks/tnhooks/useTransfers";

export function TransfersRoute() {
	const { transfers, isLoading } = useTransfers();

	return (
		<Layout>
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Transfers</h1>
					<p className="text-muted-foreground mt-1">
						View all financial transfers
					</p>
				</div>
			</div>

			<TransferList transfers={transfers} isLoading={isLoading} />
		</Layout>
	);
}
