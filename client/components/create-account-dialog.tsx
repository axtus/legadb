import { useState } from "react";
import { useAccounts } from "../hooks/tnhooks/useAccounts";
import { useLedgers } from "../hooks/tnhooks/useLedgers";
import { Button } from "./ds/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "./ds/dialog";
import { FormInput } from "./ds/form-input";

interface CreateAccountDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateAccountDialog(
	{ open, onOpenChange }: CreateAccountDialogProps,
) {
	const { createAccountAsync, isCreating } = useAccounts();
	const { ledgers } = useLedgers();

	const [id, setId] = useState("");
	const [ledgerId, setLedgerId] = useState("");
	const [externalId, setExternalId] = useState("");
	const [currencyCode, setCurrencyCode] = useState("USD");
	const [balanceType, setBalanceType] = useState<"DEBIT" | "CREDIT">("DEBIT");
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		if (!ledgerId) {
			setError("Please select a ledger");
			return;
		}

		try {
			await createAccountAsync({
				id,
				ledgerId: Number(ledgerId),
				externalId: externalId || undefined,
				currencyCode,
				balanceType,
				minimumBalance: "0", // Default to 0 for now
			});
			onOpenChange(false);
			// Reset form
			setId("");
			setLedgerId("");
			setExternalId("");
			setCurrencyCode("USD");
			setBalanceType("DEBIT");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create account");
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTitle showCloseButton>Create New Account</DialogTitle>
			<form onSubmit={handleSubmit}>
				<DialogContent className="space-y-4">
					<FormInput
						label="Account ID"
						type="number"
						value={id}
						onChange={(e) => setId(e.target.value)}
						placeholder="e.g. 2001"
						required
						disabled={isCreating}
					/>

					<div className="space-y-1">
						<label className="text-sm font-medium">Ledger</label>
						<select
							className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring/20"
							value={ledgerId}
							onChange={(e) => setLedgerId(e.target.value)}
							required
							disabled={isCreating}
						>
							<option value="">Select a ledger</option>
							{ledgers.map((ledger) => (
								<option key={ledger.id} value={ledger.id}>
									{ledger.name} ({ledger.id})
								</option>
							))}
						</select>
					</div>

					<FormInput
						label="External ID (Optional)"
						value={externalId}
						onChange={(e) => setExternalId(e.target.value)}
						placeholder="e.g. user-123"
						disabled={isCreating}
					/>

					<div className="grid grid-cols-2 gap-4">
						<FormInput
							label="Currency"
							value={currencyCode}
							onChange={(e) => setCurrencyCode(e.target.value)}
							placeholder="e.g. USD"
							required
							disabled={isCreating}
						/>

						<div className="space-y-1">
							<label className="text-sm font-medium">Balance Type</label>
							<select
								className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring/20"
								value={balanceType}
								onChange={(e) =>
									setBalanceType(e.target.value as "DEBIT" | "CREDIT")}
								required
								disabled={isCreating}
							>
								<option value="DEBIT">DEBIT</option>
								<option value="CREDIT">CREDIT</option>
							</select>
						</div>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}
				</DialogContent>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isCreating}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={isCreating}>
						{isCreating ? "Creating..." : "Create Account"}
					</Button>
				</DialogFooter>
			</form>
		</Dialog>
	);
}
