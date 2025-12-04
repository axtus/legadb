import { useState } from "react";
import type { ApiKey } from "../hooks/tnhooks/useApiKeys";
import { Button } from "./ds/button";
import { toast } from "sonner";

interface ApiKeyListProps {
	apiKeys: ApiKey[];
	isLoading: boolean;
	onRevoke: (keyId: string) => void;
	isRevoking: boolean;
}

export function ApiKeyList(props: ApiKeyListProps) {
	const { apiKeys, isLoading, onRevoke, isRevoking } = props;
	const [copiedId, setCopiedId] = useState<string | null>(null);

	async function handleCopyKey(apiKey: ApiKey) {
		try {
			await navigator.clipboard.writeText(apiKey.key);
			setCopiedId(apiKey.id);
			toast.success("API key copied to clipboard");
			setTimeout(() => setCopiedId(null), 2000);
		} catch {
			toast.error("Failed to copy API key");
		}
	}

	if (isLoading) {
		return (
			<div className="space-y-4">
				{[...Array(3)].map((_, i) => (
					<div
						key={i}
						className="h-20 rounded-lg border border-border bg-card animate-pulse"
					/>
				))}
			</div>
		);
	}

	if (apiKeys.length === 0) {
		return (
			<div className="text-center py-12 border border-dashed border-border rounded-lg">
				<p className="text-muted-foreground">No API keys found.</p>
				<p className="text-sm text-muted-foreground mt-1">
					Create your first API key to get started.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-md border border-border overflow-hidden">
			<table className="w-full text-sm text-left">
				<thead className="bg-muted text-muted-foreground font-medium">
					<tr>
						<th className="px-4 py-3">Name</th>
						<th className="px-4 py-3">Key</th>
						<th className="px-4 py-3">Ledger</th>
						<th className="px-4 py-3">Status</th>
						<th className="px-4 py-3">Expires</th>
						<th className="px-4 py-3">Last Used</th>
						<th className="px-4 py-3 text-right">Actions</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border bg-card">
					{apiKeys.map((apiKey) => {
						const isRevoked = apiKey.deactivatedAt !== null;
						const isExpired = apiKey.expiresAt &&
							new Date(apiKey.expiresAt) < new Date();
						const status = isRevoked
							? "Revoked"
							: isExpired
							? "Expired"
							: "Active";
						const statusColor = isRevoked || isExpired
							? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
							: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";

						return (
							<tr
								key={apiKey.id}
								className="hover:bg-muted/50 transition-colors"
							>
								<td className="px-4 py-3">
									<div>
										<div className="font-medium">{apiKey.name}</div>
										{apiKey.description && (
											<div className="text-xs text-muted-foreground truncate max-w-xs">
												{apiKey.description}
											</div>
										)}
									</div>
								</td>
								<td className="px-4 py-3">
									<div className="flex items-center gap-2">
										<code className="text-xs bg-muted px-2 py-1 rounded font-mono max-w-[200px] truncate">
											{apiKey.key}
										</code>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleCopyKey(apiKey)}
											className="h-7 px-2"
										>
											{copiedId === apiKey.id
												? (
													<svg
														className="w-4 h-4 text-green-600"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M5 13l4 4L19 7"
														/>
													</svg>
												)
												: (
													<svg
														className="w-4 h-4"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
														/>
													</svg>
												)}
										</Button>
									</div>
								</td>
								<td className="px-4 py-3">
									{apiKey.ledgerId !== null
										? (
											<span className="text-muted-foreground">
												{apiKey.ledgerId}
											</span>
										)
										: <span className="text-muted-foreground italic">All</span>}
								</td>
								<td className="px-4 py-3">
									<span
										className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}
									>
										{status}
									</span>
								</td>
								<td className="px-4 py-3 text-muted-foreground">
									{apiKey.expiresAt
										? new Date(apiKey.expiresAt).toLocaleDateString()
										: "Never"}
								</td>
								<td className="px-4 py-3 text-muted-foreground">
									{apiKey.lastUsedAt
										? new Date(apiKey.lastUsedAt).toLocaleDateString()
										: "Never"}
								</td>
								<td className="px-4 py-3 text-right">
									{!isRevoked && (
										<Button
											variant="destructive"
											size="sm"
											onClick={() => onRevoke(apiKey.id)}
											disabled={isRevoking}
										>
											Revoke
										</Button>
									)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
