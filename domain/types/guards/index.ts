import { type } from "arktype";

export const PermissionSetGuard = type.Record("string", {
	read: "boolean",
	write: "boolean",
	admin: "boolean",
});

export type PermissionSet = type.infer<typeof PermissionSetGuard>;
