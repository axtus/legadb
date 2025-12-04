import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/client/utils/cbor";

const SESSION_TOKEN_KEY = "gledger_session_token";
const IDENTITY_ID_KEY = "gledger_identity_id";
const SYSTEM_ROLE_KEY = "gledger_system_role";

export type SystemRole = "ADMIN" | "USER";

/**
 * Get session token from localStorage
 */
export function getSessionToken(): string | null {
	if (typeof window === "undefined") return null;
	return localStorage.getItem(SESSION_TOKEN_KEY);
}

/**
 * Set session token in localStorage
 */
export function setSessionToken(
	token: string,
	identityId: string,
	systemRole: SystemRole = "USER",
): void {
	if (typeof window === "undefined") return;
	localStorage.setItem(SESSION_TOKEN_KEY, token);
	localStorage.setItem(IDENTITY_ID_KEY, identityId);
	localStorage.setItem(SYSTEM_ROLE_KEY, systemRole);
}

/**
 * Clear session token from localStorage
 */
export function clearSessionToken(): void {
	if (typeof window === "undefined") return;
	localStorage.removeItem(SESSION_TOKEN_KEY);
	localStorage.removeItem(IDENTITY_ID_KEY);
	localStorage.removeItem(SYSTEM_ROLE_KEY);
}

/**
 * Get identity ID from localStorage
 */
export function getIdentityId(): string | null {
	if (typeof window === "undefined") return null;
	return localStorage.getItem(IDENTITY_ID_KEY);
}

/**
 * Get system role from localStorage
 */
export function getSystemRole(): SystemRole | null {
	if (typeof window === "undefined") return null;
	const role = localStorage.getItem(SYSTEM_ROLE_KEY);
	if (role === "ADMIN" || role === "USER") return role;
	return null;
}

/**
 * Hook for authentication state and operations
 */
export function useAuth() {
	const queryClient = useQueryClient();
	const token = getSessionToken();
	const identityId = getIdentityId();
	const systemRole = getSystemRole();

	const isAuthenticated = Boolean(token && identityId);
	const isAdmin = systemRole === "ADMIN";

	const loginMutation = useMutation({
		mutationFn: async (data: { username: string; password: string }) => {
			return await api.post<{
				token: string;
				identityId: string;
				systemRole: SystemRole;
			}>("/auth", {
				action: "login",
				payload: data,
			});
		},
		onSuccess: (data) => {
			setSessionToken(data.token, data.identityId, data.systemRole || "USER");
			queryClient.setQueryData(["auth"], {
				token: data.token,
				identityId: data.identityId,
				systemRole: data.systemRole || "USER",
			});
		},
	});

	const logoutMutation = useMutation({
		mutationFn: async () => {
			const token = getSessionToken();
			if (!token) return;

			return await api.post<{ success: boolean }>("/auth", {
				action: "logout",
				payload: { sessionToken: token },
			});
		},
		onSuccess: () => {
			clearSessionToken();
			queryClient.setQueryData(["auth"], null);
		},
	});

	const authQuery = useQuery({
		queryKey: ["auth"],
		queryFn: () => {
			const token = getSessionToken();
			const identityId = getIdentityId();
			const systemRole = getSystemRole();
			if (!token || !identityId) return null;
			return { token, identityId, systemRole };
		},
		initialData: () => {
			const t = getSessionToken();
			const id = getIdentityId();
			const role = getSystemRole();
			return t && id ? { token: t, identityId: id, systemRole: role } : null;
		},
		staleTime: Infinity,
	});

	return {
		isAuthenticated,
		isAdmin,
		token: authQuery.data?.token ?? null,
		identityId: authQuery.data?.identityId ?? null,
		systemRole: authQuery.data?.systemRole ?? null,
		login: loginMutation.mutate,
		loginAsync: loginMutation.mutateAsync,
		logout: logoutMutation.mutate,
		logoutAsync: logoutMutation.mutateAsync,
		isLoggingIn: loginMutation.isPending,
		isLoggingOut: logoutMutation.isPending,
		loginError: loginMutation.error,
		logoutError: logoutMutation.error,
	};
}
