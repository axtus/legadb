import { useState } from "react";
import { type SystemRole, useUsers } from "../hooks/tnhooks/useUsers";
import { Button } from "./ds/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "./ds/dialog";
import { FormInput } from "./ds/form-input";

interface CreateUserDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog(props: CreateUserDialogProps) {
	const { open, onOpenChange } = props;
	const { createUserAsync, isCreating } = useUsers();

	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [systemRole, setSystemRole] = useState<SystemRole>("USER");
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		if (password.length < 8) {
			setError("Password must be at least 8 characters");
			return;
		}

		try {
			await createUserAsync({
				username,
				password,
				systemRole,
			});
			onOpenChange(false);
			// Reset form
			setUsername("");
			setPassword("");
			setConfirmPassword("");
			setSystemRole("USER");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create user");
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTitle showCloseButton>Create New User</DialogTitle>
			<form onSubmit={handleSubmit}>
				<DialogContent className="space-y-4">
					<FormInput
						label="Username"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						placeholder="e.g. johndoe"
						required
						disabled={isCreating}
						helperText="Must be at least 6 alphabetic characters"
					/>

					<FormInput
						label="Password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="Enter password"
						required
						disabled={isCreating}
						helperText="Must be at least 8 characters"
					/>

					<FormInput
						label="Confirm Password"
						type="password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						placeholder="Confirm password"
						required
						disabled={isCreating}
					/>

					<div className="space-y-1">
						<label className="text-sm font-medium">Role</label>
						<select
							className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring/20"
							value={systemRole}
							onChange={(e) => setSystemRole(e.target.value as SystemRole)}
							required
							disabled={isCreating}
						>
							<option value="USER">User</option>
							<option value="ADMIN">Admin</option>
						</select>
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
						{isCreating ? "Creating..." : "Create User"}
					</Button>
				</DialogFooter>
			</form>
		</Dialog>
	);
}
