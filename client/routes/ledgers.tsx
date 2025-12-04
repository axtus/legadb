import { useState } from "react";
import { CreateLedgerDialog } from "../components/create-ledger-dialog";
import { Button } from "../components/ds/button";
import { Layout } from "../components/layout";
import { LedgerList } from "../components/ledger-list";
import { useLedgers } from "../hooks/tnhooks/useLedgers";

export function LedgersRoute() {
	const { ledgers, isLoading } = useLedgers();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	return (
		<Layout>
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Ledgers</h1>
					<p className="text-muted-foreground mt-1">
						Manage your financial ledgers
					</p>
				</div>
				<Button onClick={() => setIsCreateDialogOpen(true)}>
					Create Ledger
				</Button>
			</div>

			<LedgerList ledgers={ledgers} isLoading={isLoading} />

			<CreateLedgerDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
			/>
		</Layout>
	);
}
