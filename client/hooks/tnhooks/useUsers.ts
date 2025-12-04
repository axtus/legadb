import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/client/utils/cbor";

export type SystemRole = "ADMIN" | "USER";

export interface User {
	id: string;
	username: string;
	systemRole: SystemRole;
	disabledAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CreateUserParams {
	username: string;
	password: string;
	systemRole?: SystemRole;
}

export interface UpdateUserParams {
	action: "disable" | "enable" | "updateRole";
	userId: string;
	systemRole?: SystemRole;
}

export interface ChangePasswordParams {
	userId: string;
	newPassword: string;
}

export function useUsers() {
	const queryClient = useQueryClient();

	const usersQuery = useQuery({
		queryKey: ["users"],
		queryFn: async () => {
			return await api.get<User[]>("/users");
		},
	});

	const createUserMutation = useMutation({
		mutationFn: async (data: CreateUserParams) => {
			return await api.post<User>("/users", data);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["users"] });
		},
	});

	const updateUserMutation = useMutation({
		mutationFn: async (data: UpdateUserParams) => {
			return await api.patch("/users", data);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["users"] });
		},
	});

	const changePasswordMutation = useMutation({
		mutationFn: async (data: ChangePasswordParams) => {
			return await api.post("/auth", {
				action: "admin.changePassword",
				payload: {
					targetIdentityId: data.userId,
					newPassword: data.newPassword,
				},
			});
		},
	});

	return {
		users: usersQuery.data ?? [],
		isLoading: usersQuery.isLoading,
		error: usersQuery.error,
		createUser: createUserMutation.mutate,
		createUserAsync: createUserMutation.mutateAsync,
		isCreating: createUserMutation.isPending,
		createError: createUserMutation.error,
		updateUser: updateUserMutation.mutate,
		updateUserAsync: updateUserMutation.mutateAsync,
		isUpdating: updateUserMutation.isPending,
		updateError: updateUserMutation.error,
		changePassword: changePasswordMutation.mutate,
		changePasswordAsync: changePasswordMutation.mutateAsync,
		isChangingPassword: changePasswordMutation.isPending,
		changePasswordError: changePasswordMutation.error,
	};
}
