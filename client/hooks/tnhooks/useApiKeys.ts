import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/client/utils/cbor";

export interface ApiKey {
	id: string;
	key: string;
	name: string;
	ledgerId: number | null;
	description: string | null;
	permissions: object;
	deactivatedAt: string | null;
	expiresAt: string | null;
	lastUsedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CreateApiKeyParams {
	name: string;
	ledgerId?: number | null;
	description?: string | null;
	permissions?: object;
	expiresInDays?: number | null;
}

export function useApiKeys() {
	const queryClient = useQueryClient();

	const apiKeysQuery = useQuery({
		queryKey: ["apiKeys"],
		queryFn: async () => {
			return await api.get<ApiKey[]>("/api-keys");
		},
	});

	const createApiKeyMutation = useMutation({
		mutationFn: async (data: CreateApiKeyParams) => {
			return await api.post<ApiKey>("/api-keys", data);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
		},
	});

	const revokeApiKeyMutation = useMutation({
		mutationFn: async (keyId: string) => {
			return await api.delete(`/api-keys?id=${keyId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
		},
	});

	return {
		apiKeys: apiKeysQuery.data ?? [],
		isLoading: apiKeysQuery.isLoading,
		error: apiKeysQuery.error,
		createApiKey: createApiKeyMutation.mutate,
		createApiKeyAsync: createApiKeyMutation.mutateAsync,
		isCreating: createApiKeyMutation.isPending,
		createError: createApiKeyMutation.error,
		revokeApiKey: revokeApiKeyMutation.mutate,
		revokeApiKeyAsync: revokeApiKeyMutation.mutateAsync,
		isRevoking: revokeApiKeyMutation.isPending,
		revokeError: revokeApiKeyMutation.error,
	};
}
