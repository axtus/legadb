import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "../hooks/tnhooks/useAuth";
import { Button } from "./ds/button";

export function Layout({ children }: { children: React.ReactNode }) {
	const { logoutAsync: logout, isAdmin } = useAuth();
	const location = useLocation();

	const navItems = [
		{ label: "Dashboard", href: "/" },
		{ label: "Ledgers", href: "/ledgers" },
		{ label: "Currencies", href: "/currencies" },
		{ label: "Accounts", href: "/accounts" },
		{ label: "Transfers", href: "/transfers" },
	];

	const adminNavItems = [
		{ label: "Users", href: "/users" },
		{ label: "API Keys", href: "/api-keys" },
	];

	return (
		<div className="flex h-screen bg-background text-foreground font-sans">
			{/* Sidebar */}
			<aside className="w-64 border-r border-border bg-card flex flex-col">
				<div className="p-6 border-b border-border">
					<h1 className="text-xl font-bold text-primary">GLedger</h1>
				</div>

				<nav className="flex-1 p-4 space-y-2">
					{navItems.map((item) => {
						const isActive = location.pathname === item.href;
						return (
							<Link
								key={item.href}
								to={item.href}
								className={`block px-4 py-2 rounded-md transition-colors ${
									isActive
										? "bg-primary/10 text-primary font-medium"
										: "text-muted-foreground hover:bg-muted hover:text-foreground"
								}`}
							>
								{item.label}
							</Link>
						);
					})}

					{isAdmin && (
						<>
							<div className="pt-4 pb-2 border-b border-border">
								<span className="px-4 text-xs font-semibold uppercase tracking-wider text-black">
									Admin
								</span>
							</div>
							{adminNavItems.map((item) => {
								const isActive = location.pathname === item.href;
								return (
									<Link
										key={item.href}
										to={item.href}
										className={`block px-4 py-2 rounded-md transition-colors ${
											isActive
												? "bg-primary/10 text-primary font-medium"
												: "text-muted-foreground hover:bg-muted hover:text-foreground"
										}`}
									>
										{item.label}
									</Link>
								);
							})}
						</>
					)}
				</nav>

				<div className="p-4 border-t border-border">
					<Button
						variant="outline"
						className="w-full justify-start text-muted-foreground hover:text-destructive"
						onClick={async () => {
							await logout();
							window.location.href = "/login";
						}}
					>
						Log out
					</Button>
				</div>
			</aside>

			{/* Main Content */}
			<main className="flex-1 overflow-auto">
				<div className="container mx-auto p-8 max-w-5xl">
					{children}
				</div>
			</main>
		</div>
	);
}
