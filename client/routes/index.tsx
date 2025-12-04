import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "../hooks/tnhooks/useAuth";

export function IndexRoute() {
	const navigate = useNavigate();
	const { isAuthenticated } = useAuth();

	useEffect(() => {
		if (isAuthenticated) {
			navigate({ to: "/ledgers" });
		} else {
			navigate({ to: "/login" });
		}
	}, [isAuthenticated, navigate]);

	return null;
}
