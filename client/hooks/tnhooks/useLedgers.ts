import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/client/utils/cbor";

export interface Ledger {
	id: number;
	name: string;
	created_at: string;
}

export function useLedgers() {
	const queryClient = useQueryClient();

	const ledgersQuery = useQuery({
		queryKey: ["ledgers"],
		queryFn: async () => {
			return await api.get<Ledger[]>("/ledgers");
		},
	});

	const createLedgerMutation = useMutation({
		mutationFn: async (data: { id: number; name: string }) => {
			return await api.post<Ledger>("/ledgers", data);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["ledgers"] });
		},
	});

	return {
		ledgers: ledgersQuery.data ?? [],
		isLoading: ledgersQuery.isLoading,
		error: ledgersQuery.error,
		createLedger: createLedgerMutation.mutate,
		createLedgerAsync: createLedgerMutation.mutateAsync,
		isCreating: createLedgerMutation.isPending,
		createError: createLedgerMutation.error,
	};
}
