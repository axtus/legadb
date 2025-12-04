import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/tnhooks/useAuth";
import { Button } from "../components/ds/button";
import { FormInput } from "../components/ds/form-input";

export function LoginRoute() {
	const navigate = useNavigate();
	const { loginAsync, isLoggingIn, loginError, isAuthenticated } = useAuth();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);

	// Redirect if already authenticated
	useEffect(() => {
		if (isAuthenticated) {
			navigate({ to: "/" });
		}
	}, [isAuthenticated, navigate]);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);

		if (!username || !password) {
			setError("Username and password are required");
			return;
		}

		try {
			await loginAsync({ username, password });
			navigate({ to: "/" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Login failed");
		}
	}

	if (isAuthenticated) {
		return null;
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<div className="w-full max-w-md p-8">
				<h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<FormInput
						label="Username"
						type="text"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						required
						autoComplete="username"
					/>
					<FormInput
						label="Password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						autoComplete="current-password"
					/>
					{(error || loginError) && (
						<p className="text-sm text-destructive">
							{error || (loginError instanceof Error
								? loginError.message
								: "Login failed")}
						</p>
					)}
					<Button type="submit" disabled={isLoggingIn}>
						{isLoggingIn ? "Logging in..." : "Login"}
					</Button>
				</form>
			</div>
		</div>
	);
}
