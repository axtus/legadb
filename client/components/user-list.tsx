import type { User } from "../hooks/tnhooks/useUsers";
import { Button } from "./ds/button";

interface UserListProps {
	users: User[];
	isLoading: boolean;
	onDisable: (userId: string) => void;
	onEnable: (userId: string) => void;
	onChangePassword: (user: User) => void;
	isUpdating: boolean;
}

export function UserList(props: UserListProps) {
	const {
		users,
		isLoading,
		onDisable,
		onEnable,
		onChangePassword,
		isUpdating,
	} = props;

	if (isLoading) {
		return (
			<div className="space-y-4">
				{[...Array(3)].map((_, i) => (
					<div
						key={i}
						className="h-16 rounded-lg border border-border bg-card animate-pulse"
					/>
				))}
			</div>
		);
	}

	if (users.length === 0) {
		return (
			<div className="text-center py-12 border border-dashed border-border rounded-lg">
				<p className="text-muted-foreground">No users found.</p>
				<p className="text-sm text-muted-foreground mt-1">
					Create your first user to get started.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-md border border-border overflow-hidden">
			<table className="w-full text-sm text-left">
				<thead className="bg-muted text-muted-foreground font-medium">
					<tr>
						<th className="px-4 py-3">Username</th>
						<th className="px-4 py-3">Role</th>
						<th className="px-4 py-3">Status</th>
						<th className="px-4 py-3">Created</th>
						<th className="px-4 py-3 text-right">Actions</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border bg-card">
					{users.map((user) => {
						const isDisabled = user.disabledAt !== null;
						return (
							<tr
								key={user.id}
								className="hover:bg-muted/50 transition-colors"
							>
								<td className="px-4 py-3 font-medium">{user.username}</td>
								<td className="px-4 py-3">
									<span
										className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
											user.systemRole === "ADMIN"
												? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
												: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
										}`}
									>
										{user.systemRole}
									</span>
								</td>
								<td className="px-4 py-3">
									<span
										className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
											isDisabled
												? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
												: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
										}`}
									>
										{isDisabled ? "Disabled" : "Active"}
									</span>
								</td>
								<td className="px-4 py-3 text-muted-foreground">
									{new Date(user.createdAt).toLocaleDateString()}
								</td>
								<td className="px-4 py-3 text-right">
									<div className="flex items-center justify-end gap-2">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => onChangePassword(user)}
											disabled={isUpdating}
										>
											Change Password
										</Button>
										{isDisabled
											? (
												<Button
													variant="outline"
													size="sm"
													onClick={() => onEnable(user.id)}
													disabled={isUpdating}
												>
													Enable
												</Button>
											)
											: (
												<Button
													variant="destructive"
													size="sm"
													onClick={() => onDisable(user.id)}
													disabled={isUpdating}
												>
													Disable
												</Button>
											)}
									</div>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
