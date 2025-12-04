import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/client/utils/cbor";

export interface Account {
	id: string;
	ledger_id: number;
	external_id: string | null;
	currency_code: string;
	balance_type: "DEBIT" | "CREDIT";
	minimum_balance: string;
	maximum_balance: string | null;
	created_at: string;
}

export interface CreateAccountParams {
	id: string;
	ledgerId: number;
	externalId?: string;
	currencyCode: string;
	balanceType: "DEBIT" | "CREDIT";
	minimumBalance?: string;
	maximumBalance?: string;
}

export function useAccounts() {
	const queryClient = useQueryClient();

	const accountsQuery = useQuery({
		queryKey: ["accounts"],
		queryFn: async () => {
			return await api.get<Account[]>("/accounts");
		},
	});

	const createAccountMutation = useMutation({
		mutationFn: async (data: CreateAccountParams) => {
			return await api.post<Account>("/accounts", data);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["accounts"] });
		},
	});

	return {
		accounts: accountsQuery.data ?? [],
		isLoading: accountsQuery.isLoading,
		error: accountsQuery.error,
		createAccount: createAccountMutation.mutate,
		createAccountAsync: createAccountMutation.mutateAsync,
		isCreating: createAccountMutation.isPending,
		createError: createAccountMutation.error,
	};
}
