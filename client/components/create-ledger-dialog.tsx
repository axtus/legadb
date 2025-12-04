import { useState } from "react";
import { useLedgers } from "../hooks/tnhooks/useLedgers";
import { Button } from "./ds/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "./ds/dialog";
import { FormInput } from "./ds/form-input";

interface CreateLedgerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateLedgerDialog(
	{ open, onOpenChange }: CreateLedgerDialogProps,
) {
	const { createLedgerAsync, isCreating } = useLedgers();
	const [id, setId] = useState("");
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		try {
			await createLedgerAsync({ id: Number(id), name });
			onOpenChange(false);
			setId("");
			setName("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create ledger");
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTitle showCloseButton>Create New Ledger</DialogTitle>
			<form onSubmit={handleSubmit}>
				<DialogContent className="space-y-4">
					<FormInput
						label="Ledger ID"
						type="number"
						value={id}
						onChange={(e) => setId(e.target.value)}
						placeholder="e.g. 1001"
						required
						disabled={isCreating}
					/>
					<FormInput
						label="Ledger Name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="e.g. General Ledger"
						required
						disabled={isCreating}
					/>
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
						{isCreating ? "Creating..." : "Create Ledger"}
					</Button>
				</DialogFooter>
			</form>
		</Dialog>
	);
}
