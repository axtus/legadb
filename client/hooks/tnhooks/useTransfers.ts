import { useQuery } from "@tanstack/react-query";
import { api } from "@/client/utils/cbor";

export interface Transfer {
	id: string;
	external_id: string | null;
	currency_code: string;
	debit_account_id: string;
	credit_account_id: string;
	amount: string;
	reference: string | null;
	created_at: string;
	state: "PENDING" | "POSTED" | "VOIDED";
}

export function useTransfers() {
	const transfersQuery = useQuery({
		queryKey: ["transfers"],
		queryFn: async () => {
			return await api.get<Transfer[]>("/transfers");
		},
	});

	return {
		transfers: transfersQuery.data ?? [],
		isLoading: transfersQuery.isLoading,
		error: transfersQuery.error,
	};
}
