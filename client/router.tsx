import {
	createRootRoute,
	createRoute,
	createRouter,
} from "@tanstack/react-router";
import { LoginRoute } from "./routes/login";
import { LogoutRoute } from "./routes/logout";
import { IndexRoute } from "./routes/index";

import { LedgersRoute } from "./routes/ledgers";
import { CurrenciesRoute } from "./routes/currencies";

import { AccountsRoute } from "./routes/accounts";
import { TransfersRoute } from "./routes/transfers";
import { UsersRoute } from "./routes/users";
import { ApiKeysRoute } from "./routes/api-keys";

const rootRoute = createRootRoute();

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: IndexRoute,
});

const ledgersRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/ledgers",
	component: LedgersRoute,
});

const currenciesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/currencies",
	component: CurrenciesRoute,
});

const accountsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/accounts",
	component: AccountsRoute,
});

const transfersRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/transfers",
	component: TransfersRoute,
});

const usersRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/users",
	component: UsersRoute,
});

const apiKeysRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/api-keys",
	component: ApiKeysRoute,
});

const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/login",
	component: LoginRoute,
});

const logoutRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/logout",
	component: LogoutRoute,
});

const routeTree = rootRoute.addChildren([
	indexRoute,
	ledgersRoute,
	currenciesRoute,
	accountsRoute,
	transfersRoute,
	usersRoute,
	apiKeysRoute,
	loginRoute,
	logoutRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
