import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/client/utils/cbor";

export interface Currency {
	code: string;
	name: string;
	symbol: string;
	minorUnits: number;
	inUse: boolean;
	accountCount: number;
}

export interface AvailableCurrency {
	code: string;
	name: string;
	symbol: string;
}

export function useCurrencies() {
	const queryClient = useQueryClient();

	const currenciesQuery = useQuery({
		queryKey: ["currencies"],
		queryFn: async () => {
			return await api.get<Currency[]>("/currencies");
		},
	});

	const availableCurrenciesQuery = useQuery({
		queryKey: ["currencies", "available"],
		queryFn: async () => {
			return await api.get<AvailableCurrency[]>("/currencies?available=true");
		},
	});

	const createCurrencyMutation = useMutation({
		mutationFn: async (
			data: { code: string; name: string; symbol: string; minorUnits: number },
		) => {
			return await api.post<Currency>("/currencies", data);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["currencies"] });
		},
	});

	const deleteCurrencyMutation = useMutation({
		mutationFn: async (code: string) => {
			return await api.delete(`/currencies?code=${code}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["currencies"] });
		},
	});

	const importCurrenciesMutation = useMutation({
		mutationFn: async (codes: string[]) => {
			return await api.post<{ imported: number }>("/currencies?action=import", {
				codes,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["currencies"] });
		},
	});

	return {
		currencies: currenciesQuery.data ?? [],
		isLoading: currenciesQuery.isLoading,
		error: currenciesQuery.error,
		availableCurrencies: availableCurrenciesQuery.data ?? [],
		isLoadingAvailable: availableCurrenciesQuery.isLoading,
		createCurrency: createCurrencyMutation.mutate,
		createCurrencyAsync: createCurrencyMutation.mutateAsync,
		isCreating: createCurrencyMutation.isPending,
		createError: createCurrencyMutation.error,
		deleteCurrency: deleteCurrencyMutation.mutate,
		deleteCurrencyAsync: deleteCurrencyMutation.mutateAsync,
		isDeleting: deleteCurrencyMutation.isPending,
		deleteError: deleteCurrencyMutation.error,
		importCurrencies: importCurrenciesMutation.mutate,
		importCurrenciesAsync: importCurrenciesMutation.mutateAsync,
		isImporting: importCurrenciesMutation.isPending,
		importError: importCurrenciesMutation.error,
	};
}
