import { useState } from "react";
import { toast } from "sonner";
import type { AvailableCurrency } from "../hooks/tnhooks/useCurrencies";
import { useCurrencies } from "../hooks/tnhooks/useCurrencies";
import { Button } from "./ds/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "./ds/dialog";
import { FormInput } from "./ds/form-input";

interface ImportCurrenciesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function ImportCurrenciesDialog(props: ImportCurrenciesDialogProps) {
	const { open, onOpenChange } = props;
	const {
		availableCurrencies,
		isLoadingAvailable,
		importCurrenciesAsync,
		isImporting,
	} = useCurrencies();
	const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
	const [searchQuery, setSearchQuery] = useState("");

	const filteredCurrencies = availableCurrencies.filter(
		(c) =>
			c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
			c.name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	function handleToggle(code: string) {
		const newSelected = new Set(selectedCodes);
		if (newSelected.has(code)) {
			newSelected.delete(code);
		} else {
			newSelected.add(code);
		}
		setSelectedCodes(newSelected);
	}

	function handleSelectAll() {
		if (selectedCodes.size === filteredCurrencies.length) {
			setSelectedCodes(new Set());
		} else {
			setSelectedCodes(new Set(filteredCurrencies.map((c) => c.code)));
		}
	}

	async function handleImport() {
		if (selectedCodes.size === 0) return;

		try {
			const result = await importCurrenciesAsync(Array.from(selectedCodes));
			toast.success(`Imported ${result.imported} currencies`);
			onOpenChange(false);
			setSelectedCodes(new Set());
			setSearchQuery("");
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to import currencies",
			);
		}
	}

	function handleClose() {
		onOpenChange(false);
		setSelectedCodes(new Set());
		setSearchQuery("");
	}

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogTitle showCloseButton>Import Currencies</DialogTitle>
			<DialogContent className="space-y-4">
				<p className="text-sm text-muted-foreground">
					Select currencies to import from the available list. Already imported
					currencies are not shown.
				</p>

				<FormInput
					label="Search"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Search by code or name..."
					disabled={isImporting}
				/>

				{isLoadingAvailable
					? (
						<div className="h-64 flex items-center justify-center">
							<p className="text-muted-foreground">Loading currencies...</p>
						</div>
					)
					: filteredCurrencies.length === 0
					? (
						<div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg">
							<p className="text-muted-foreground">
								{searchQuery
									? "No currencies match your search"
									: "All currencies have been imported"}
							</p>
						</div>
					)
					: (
						<>
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">
									{selectedCodes.size} of {filteredCurrencies.length} selected
								</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleSelectAll}
									disabled={isImporting}
								>
									{selectedCodes.size === filteredCurrencies.length
										? "Deselect All"
										: "Select All"}
								</Button>
							</div>

							<div className="border border-border rounded-lg max-h-64 overflow-y-auto">
								{filteredCurrencies.map((currency: AvailableCurrency) => (
									<label
										key={currency.code}
										className="flex items-center px-4 py-2 hover:bg-muted/30 cursor-pointer border-b border-border last:border-b-0"
									>
										<input
											type="checkbox"
											checked={selectedCodes.has(currency.code)}
											onChange={() => handleToggle(currency.code)}
											disabled={isImporting}
											className="mr-3 h-4 w-4 rounded border-border"
										/>
										<span className="font-mono text-sm font-medium w-14">
											{currency.code}
										</span>
										<span className="text-sm flex-1">{currency.name}</span>
										<span className="text-lg w-8 text-center">
											{currency.symbol}
										</span>
									</label>
								))}
							</div>
						</>
					)}
			</DialogContent>
			<DialogFooter>
				<Button
					type="button"
					variant="outline"
					onClick={handleClose}
					disabled={isImporting}
				>
					Cancel
				</Button>
				<Button
					type="button"
					onClick={handleImport}
					disabled={isImporting || selectedCodes.size === 0}
				>
					{isImporting
						? "Importing..."
						: `Import ${selectedCodes.size} Currenc${
							selectedCodes.size === 1 ? "y" : "ies"
						}`}
				</Button>
			</DialogFooter>
		</Dialog>
	);
}

export { ImportCurrenciesDialog };
export type { ImportCurrenciesDialogProps };
