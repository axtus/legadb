import { useState } from "react";
import { useCurrencies } from "../hooks/tnhooks/useCurrencies";
import { Button } from "./ds/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "./ds/dialog";
import { FormInput } from "./ds/form-input";

interface CreateCurrencyDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function CreateCurrencyDialog(props: CreateCurrencyDialogProps) {
	const { open, onOpenChange } = props;
	const { createCurrencyAsync, isCreating } = useCurrencies();
	const [code, setCode] = useState("");
	const [name, setName] = useState("");
	const [symbol, setSymbol] = useState("");
	const [minorUnits, setMinorUnits] = useState<string>("");
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		try {
			await createCurrencyAsync({
				code: code.toUpperCase(),
				name,
				symbol,
				minorUnits: Number(minorUnits),
			});
			onOpenChange(false);
			setCode("");
			setName("");
			setSymbol("");
			setMinorUnits("");
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to create currency",
			);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTitle showCloseButton>Create New Currency</DialogTitle>
			<form onSubmit={handleSubmit}>
				<DialogContent className="space-y-4">
					<FormInput
						label="Currency Code"
						value={code}
						onChange={(e) => setCode(e.target.value.toUpperCase())}
						placeholder="e.g. USD"
						maxLength={5}
						required
						disabled={isCreating}
					/>
					<FormInput
						label="Currency Name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="e.g. US Dollar"
						required
						disabled={isCreating}
					/>
					<FormInput
						label="Symbol"
						value={symbol}
						onChange={(e) => setSymbol(e.target.value)}
						placeholder="e.g. $"
						maxLength={3}
						required
						disabled={isCreating}
					/>
					<FormInput
						label="Minor Units"
						type="number"
						value={minorUnits}
						onChange={(e) => setMinorUnits(e.target.value)}
						placeholder="e.g. 2"
						min={0}
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
						{isCreating ? "Creating..." : "Create Currency"}
					</Button>
				</DialogFooter>
			</form>
		</Dialog>
	);
}

export { CreateCurrencyDialog };
export type { CreateCurrencyDialogProps };
