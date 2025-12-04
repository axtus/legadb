import type { ComponentPropsWithoutRef, ReactNode } from "react";

type ButtonVariant =
	| "default"
	| "secondary"
	| "destructive"
	| "outline"
	| "ghost"
	| "link";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	asChild?: boolean;
	children?: ReactNode;
}

const buttonVariants: Record<ButtonVariant, string> = {
	default:
		"bg-primary text-primary-foreground hover:bg-primary-600 active:bg-primary-700",
	secondary:
		"bg-secondary text-secondary-foreground hover:bg-secondary-600 active:bg-secondary-700",
	destructive:
		"bg-destructive text-destructive-foreground hover:bg-destructive-600 active:bg-destructive-700",
	outline:
		"border-2 border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
	ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
	link: "text-primary underline-offset-4 hover:underline",
};

const buttonSizes: Record<ButtonSize, string> = {
	sm: "h-8 px-3 text-sm rounded-md",
	md: "h-10 px-4 text-base rounded-lg",
	lg: "h-12 px-6 text-lg rounded-xl",
	icon: "h-10 w-10 rounded-lg",
};

const baseStyles =
	"inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

export function Button(
	{
		className = "",
		variant = "default",
		size = "md",
		type = "button",
		...props
	}: ButtonProps,
) {
	const variantClass = buttonVariants[variant];
	const sizeClass = buttonSizes[size];

	return (
		<button
			type={type}
			className={`${baseStyles} ${variantClass} ${sizeClass} ${className}`
				.trim()}
			{...props}
		/>
	);
}
