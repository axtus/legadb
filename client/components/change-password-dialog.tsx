import { useState } from "react";
import { type User, useUsers } from "../hooks/tnhooks/useUsers";
import { Button } from "./ds/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "./ds/dialog";
import { FormInput } from "./ds/form-input";

interface ChangePasswordDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	user: User | null;
}

export function ChangePasswordDialog(props: ChangePasswordDialogProps) {
	const { open, onOpenChange, user } = props;
	const { changePasswordAsync, isChangingPassword } = useUsers();

	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		if (!user) {
			setError("No user selected");
			return;
		}

		if (newPassword !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		if (newPassword.length < 8) {
			setError("Password must be at least 8 characters");
			return;
		}

		try {
			await changePasswordAsync({
				userId: user.id,
				newPassword,
			});
			onOpenChange(false);
			// Reset form
			setNewPassword("");
			setConfirmPassword("");
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to change password",
			);
		}
	}

	function handleClose() {
		onOpenChange(false);
		setNewPassword("");
		setConfirmPassword("");
		setError(null);
	}

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogTitle showCloseButton>
				Change Password for {user?.username ?? "User"}
			</DialogTitle>
			<form onSubmit={handleSubmit}>
				<DialogContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Enter a new password for user <strong>{user?.username}</strong>.
					</p>

					<FormInput
						label="New Password"
						type="password"
						value={newPassword}
						onChange={(e) => setNewPassword(e.target.value)}
						placeholder="Enter new password"
						required
						disabled={isChangingPassword}
						helperText="Must be at least 8 characters"
					/>

					<FormInput
						label="Confirm Password"
						type="password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						placeholder="Confirm new password"
						required
						disabled={isChangingPassword}
					/>

					{error && <p className="text-sm text-destructive">{error}</p>}
				</DialogContent>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={handleClose}
						disabled={isChangingPassword}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={isChangingPassword}>
						{isChangingPassword ? "Changing..." : "Change Password"}
					</Button>
				</DialogFooter>
			</form>
		</Dialog>
	);
}
