import { useState } from "react";
import { AccountList } from "../components/account-list";
import { CreateAccountDialog } from "../components/create-account-dialog";
import { Button } from "../components/ds/button";
import { Layout } from "../components/layout";
import { useAccounts } from "../hooks/tnhooks/useAccounts";

export function AccountsRoute() {
	const { accounts, isLoading } = useAccounts();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	return (
		<Layout>
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
					<p className="text-muted-foreground mt-1">
						Manage accounts across all ledgers
					</p>
				</div>
				<Button onClick={() => setIsCreateDialogOpen(true)}>
					Create Account
				</Button>
			</div>

			<AccountList accounts={accounts} isLoading={isLoading} />

			<CreateAccountDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
			/>
		</Layout>
	);
}
