import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";

interface FormInputProps extends ComponentPropsWithoutRef<"input"> {
	label?: string;
	error?: string;
	helperText?: string;
	ref?: Ref<HTMLInputElement>;
	leftIcon?: ReactNode;
	rightIcon?: ReactNode;
}

/**
 * FormInput provides a styled input field with label, error, and helper text support.
 *
 * @example
 * <FormInput
 *   label="Email"
 *   type="email"
 *   error="Invalid email address"
 *   helperText="We'll never share your email"
 * />
 */
function FormInput(props: FormInputProps) {
	const {
		label,
		error,
		helperText,
		ref,
		leftIcon,
		rightIcon,
		className = "",
		id,
		disabled,
		required,
		...inputProps
	} = props;

	const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, "-")}`;
	const hasError = Boolean(error);

	const baseInputClasses =
		"w-full px-3 placeholder-neutral-400 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2";
	const normalClasses =
		"border-input bg-background text-foreground focus:border-ring focus:ring-ring/20";
	const errorClasses =
		"border-destructive focus:border-destructive focus:ring-destructive/20";
	const disabledClasses = "bg-muted cursor-not-allowed opacity-60";
	const iconPaddingLeft = leftIcon ? "pl-10" : "";
	const iconPaddingRight = rightIcon ? "pr-10" : "";

	const inputClasses = `
    ${baseInputClasses}
    ${hasError ? errorClasses : normalClasses}
    ${disabled ? disabledClasses : ""}
    ${iconPaddingLeft}
    ${iconPaddingRight}
    ${className}
  `.trim().replace(/\s+/g, " ");

	return (
		<div className="w-full">
			{label && (
				<label
					htmlFor={inputId}
					className="block text-sm font-medium text-foreground mb-1"
				>
					{label}
					{required && <span className="text-destructive ml-1">*</span>}
				</label>
			)}

			<div className="relative">
				{leftIcon && (
					<div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
						{leftIcon}
					</div>
				)}

				<input
					ref={ref}
					id={inputId}
					disabled={disabled}
					required={required}
					className={inputClasses}
					aria-invalid={hasError}
					aria-describedby={error
						? `${inputId}-error`
						: helperText
						? `${inputId}-helper`
						: undefined}
					{...inputProps}
				/>

				{rightIcon && (
					<div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
						{rightIcon}
					</div>
				)}
			</div>

			{error && (
				<p
					id={`${inputId}-error`}
					className="mt-1 text-sm text-destructive"
					role="alert"
				>
					{error}
				</p>
			)}

			{helperText && !error && (
				<p
					id={`${inputId}-helper`}
					className="mt-1 text-sm text-muted-foreground"
				>
					{helperText}
				</p>
			)}
		</div>
	);
}

export { FormInput };
export type { FormInputProps };
