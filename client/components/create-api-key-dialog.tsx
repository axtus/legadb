import { useState } from "react";
import { useApiKeys } from "../hooks/tnhooks/useApiKeys";
import { useLedgers } from "../hooks/tnhooks/useLedgers";
import { Button } from "./ds/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "./ds/dialog";
import { FormInput } from "./ds/form-input";

interface CreateApiKeyDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateApiKeyDialog(props: CreateApiKeyDialogProps) {
	const { open, onOpenChange } = props;
	const { createApiKeyAsync, isCreating } = useApiKeys();
	const { ledgers } = useLedgers();

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [ledgerId, setLedgerId] = useState("");
	const [expiresInDays, setExpiresInDays] = useState("");
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		if (!name.trim()) {
			setError("Name is required");
			return;
		}

		try {
			await createApiKeyAsync({
				name: name.trim(),
				description: description.trim() || null,
				ledgerId: ledgerId ? Number(ledgerId) : null,
				expiresInDays: expiresInDays ? Number(expiresInDays) : null,
			});
			onOpenChange(false);
			// Reset form
			setName("");
			setDescription("");
			setLedgerId("");
			setExpiresInDays("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create API key");
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTitle showCloseButton>Create New API Key</DialogTitle>
			<form onSubmit={handleSubmit}>
				<DialogContent className="space-y-4">
					<FormInput
						label="Name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="e.g. Production API Key"
						required
						disabled={isCreating}
					/>

					<FormInput
						label="Description (Optional)"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="e.g. Used for production integrations"
						disabled={isCreating}
					/>

					<div className="space-y-1">
						<label className="text-sm font-medium">
							Ledger Access (Optional)
						</label>
						<select
							className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring/20"
							value={ledgerId}
							onChange={(e) => setLedgerId(e.target.value)}
							disabled={isCreating}
						>
							<option value="">All Ledgers</option>
							{ledgers.map((ledger) => (
								<option key={ledger.id} value={ledger.id}>
									{ledger.name} ({ledger.id})
								</option>
							))}
						</select>
						<p className="text-xs text-muted-foreground">
							Leave empty for access to all ledgers
						</p>
					</div>

					<FormInput
						label="Expires In (Days)"
						type="number"
						value={expiresInDays}
						onChange={(e) => setExpiresInDays(e.target.value)}
						placeholder="e.g. 365"
						min="1"
						disabled={isCreating}
						helperText="Leave empty for no expiration"
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
						{isCreating ? "Creating..." : "Create API Key"}
					</Button>
				</DialogFooter>
			</form>
		</Dialog>
	);
}
