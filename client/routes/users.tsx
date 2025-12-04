import { useState } from "react";
import { toast } from "sonner";
import { UserList } from "../components/user-list";
import { CreateUserDialog } from "../components/create-user-dialog";
import { ChangePasswordDialog } from "../components/change-password-dialog";
import { Button } from "../components/ds/button";
import { Layout } from "../components/layout";
import { type User, useUsers } from "../hooks/tnhooks/useUsers";

export function UsersRoute() {
	const { users, isLoading, updateUser, isUpdating } = useUsers();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [passwordDialogUser, setPasswordDialogUser] = useState<User | null>(
		null,
	);

	function handleDisable(userId: string) {
		updateUser(
			{ action: "disable", userId },
			{
				onSuccess: () => toast.success("User disabled"),
				onError: (err) => toast.error(err.message),
			},
		);
	}

	function handleEnable(userId: string) {
		updateUser(
			{ action: "enable", userId },
			{
				onSuccess: () => toast.success("User enabled"),
				onError: (err) => toast.error(err.message),
			},
		);
	}

	return (
		<Layout>
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Users</h1>
					<p className="text-muted-foreground mt-1">
						Manage user accounts and permissions
					</p>
				</div>
				<Button onClick={() => setIsCreateDialogOpen(true)}>
					Create User
				</Button>
			</div>

			<UserList
				users={users}
				isLoading={isLoading}
				onDisable={handleDisable}
				onEnable={handleEnable}
				onChangePassword={setPasswordDialogUser}
				isUpdating={isUpdating}
			/>

			<CreateUserDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
			/>

			<ChangePasswordDialog
				open={passwordDialogUser !== null}
				onOpenChange={(open) => !open && setPasswordDialogUser(null)}
				user={passwordDialogUser}
			/>
		</Layout>
	);
}
