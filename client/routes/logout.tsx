import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../hooks/tnhooks/useAuth";
import { clog } from "@/domain/utils/clog";

export function LogoutRoute() {
	const navigate = useNavigate();
	const { logoutAsync, isLoggingOut } = useAuth();

	useEffect(() => {
		async function performLogout() {
			try {
				await logoutAsync();
				navigate({ to: "/login" });
			} catch (err) {
				clog(err);
				// Even if logout fails, clear local state and redirect
				navigate({ to: "/login" });
			}
		}

		performLogout();
	}, [logoutAsync, navigate]);

	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<div className="text-center">
				<p>{isLoggingOut ? "Logging out..." : "Logged out"}</p>
			</div>
		</div>
	);
}
