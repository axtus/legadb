import { useState } from "react";
import { CreateCurrencyDialog } from "../components/create-currency-dialog";
import { CurrencyList } from "../components/currency-list";
import { Button } from "../components/ds/button";
import { ImportCurrenciesDialog } from "../components/import-currencies-dialog";
import { Layout } from "../components/layout";
import { useCurrencies } from "../hooks/tnhooks/useCurrencies";

export function CurrenciesRoute() {
	const { currencies, isLoading, deleteCurrencyAsync, isDeleting } =
		useCurrencies();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

	return (
		<Layout>
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Currencies</h1>
					<p className="text-muted-foreground mt-1">
						Manage currency definitions for accounts and transfers
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
						Import Currencies
					</Button>
					<Button onClick={() => setIsCreateDialogOpen(true)}>
						Create Currency
					</Button>
				</div>
			</div>

			<CurrencyList
				currencies={currencies}
				isLoading={isLoading}
				onDelete={deleteCurrencyAsync}
				isDeleting={isDeleting}
			/>

			<CreateCurrencyDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
			/>

			<ImportCurrenciesDialog
				open={isImportDialogOpen}
				onOpenChange={setIsImportDialogOpen}
			/>
		</Layout>
	);
}
