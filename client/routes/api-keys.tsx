import { useState } from "react";
import { toast } from "sonner";
import { ApiKeyList } from "../components/api-key-list";
import { CreateApiKeyDialog } from "../components/create-api-key-dialog";
import { Button } from "../components/ds/button";
import { Layout } from "../components/layout";
import { useApiKeys } from "../hooks/tnhooks/useApiKeys";

export function ApiKeysRoute() {
	const { apiKeys, isLoading, revokeApiKey, isRevoking } = useApiKeys();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	function handleRevoke(keyId: string) {
		revokeApiKey(keyId, {
			onSuccess: () => toast.success("API key revoked"),
			onError: (err) => toast.error(err.message),
		});
	}

	return (
		<Layout>
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
					<p className="text-muted-foreground mt-1">
						Manage API keys for programmatic access
					</p>
				</div>
				<Button onClick={() => setIsCreateDialogOpen(true)}>
					Create API Key
				</Button>
			</div>

			<ApiKeyList
				apiKeys={apiKeys}
				isLoading={isLoading}
				onRevoke={handleRevoke}
				isRevoking={isRevoking}
			/>

			<CreateApiKeyDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
			/>
		</Layout>
	);
}
