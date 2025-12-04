import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";

interface DialogContextValue {
	titleId: string;
	descriptionId: string;
	onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext() {
	const context = useContext(DialogContext);
	if (!context) {
		throw new Error("Dialog components must be used within a Dialog");
	}
	return context;
}

// Generate unique ID outside component to avoid impure function in render
let idCounter = 0;
function generateId(prefix: string): string {
	idCounter += 1;
	return `${prefix}-${idCounter}`;
}

interface DialogProps extends Omit<ComponentPropsWithoutRef<"dialog">, "open"> {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	children: ReactNode;
}

/**
 * Dialog component
 *
 * @example
 * <Dialog open={isOpen} onOpenChange={setIsOpen}>
 *   <DialogTitle showCloseButton>Dialog Title</DialogTitle>
 *   <DialogContent>
 *     <p>This is the content of the dialog.</p>
 *   </DialogContent>
 *   <DialogFooter>
 *     <button>Cancel</button>
 *     <button>Confirm</button>
 *   </DialogFooter>
 * </Dialog>
 */
function Dialog(props: DialogProps) {
	const { open = false, onOpenChange, children, className = "", ...rest } =
		props;
	const dialogRef = useRef<HTMLDialogElement>(null);
	const [titleId] = useState(() => generateId("dialog-title"));
	const [descriptionId] = useState(() => generateId("dialog-description"));

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		if (open) {
			if (!dialog.open) {
				dialog.showModal();
			}
		} else {
			if (dialog.open) {
				dialog.close();
			}
		}
	}, [open]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		function handleClose() {
			onOpenChange?.(false);
		}

		function handleCancel(event: Event) {
			event.preventDefault();
			onOpenChange?.(false);
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				event.preventDefault();
				onOpenChange?.(false);
			}
		}

		dialog.addEventListener("close", handleClose);
		dialog.addEventListener("cancel", handleCancel);
		dialog.addEventListener("keydown", handleKeyDown);

		return () => {
			dialog.removeEventListener("close", handleClose);
			dialog.removeEventListener("cancel", handleCancel);
			dialog.removeEventListener("keydown", handleKeyDown);
		};
	}, [onOpenChange]);

	function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
		const dialog = dialogRef.current;
		if (!dialog) return;

		const rect = dialog.getBoundingClientRect();
		const clickedInDialog = rect.top <= event.clientY &&
			event.clientY <= rect.top + rect.height &&
			rect.left <= event.clientX &&
			event.clientX <= rect.left + rect.width;

		if (!clickedInDialog) {
			onOpenChange?.(false);
		}
	}

	const contextValue: DialogContextValue = {
		titleId,
		descriptionId,
		onOpenChange: onOpenChange || (() => {}),
	};

	return (
		<DialogContext value={contextValue}>
			<dialog
				ref={dialogRef}
				aria-labelledby={titleId}
				aria-describedby={descriptionId}
				onClick={handleBackdropClick}
				className={`
					backdrop:bg-black/50
					bg-card
					text-foreground
					rounded-lg
					shadow-xl
					border border-border
					p-0
					max-w-lg
					w-full
					max-h-[85vh]
					overflow-hidden
					${className}
				`.trim()}
				{...rest}
			>
				<div className="flex flex-col max-h-[85vh]">{children}</div>
			</dialog>
		</DialogContext>
	);
}

interface DialogTitleProps extends ComponentPropsWithoutRef<"div"> {
	showCloseButton?: boolean;
	children: ReactNode;
}

/**
 * DialogTitle component - Header section with optional close button
 */
function DialogTitle(props: DialogTitleProps) {
	const { showCloseButton = false, children, className = "", ...rest } = props;
	const { titleId, onOpenChange } = useDialogContext();

	return (
		<div
			className={`
				flex items-center justify-between
				px-6 py-4
				border-b border-border
				${className}
			`.trim()}
			{...rest}
		>
			<h2
				id={titleId}
				className="text-lg font-semibold text-foreground m-0"
			>
				{children}
			</h2>
			{showCloseButton && (
				<button
					type="button"
					onClick={() => onOpenChange(false)}
					aria-label="Close dialog"
					className="
						ml-4
						p-1
						rounded-md
						hover:bg-muted
						focus:outline-none
						focus:ring-2
						focus:ring-ring
						focus:ring-offset-2
						transition-colors
					"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 15 15"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true"
					>
						<path
							d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
							fill="currentColor"
							fillRule="evenodd"
							clipRule="evenodd"
						/>
					</svg>
				</button>
			)}
		</div>
	);
}

interface DialogContentProps extends ComponentPropsWithoutRef<"div"> {
	children: ReactNode;
}

/**
 * DialogContent component - Main content area with scroll support
 */
function DialogContent(props: DialogContentProps) {
	const { children, className = "", ...rest } = props;
	const { descriptionId } = useDialogContext();

	return (
		<div
			id={descriptionId}
			className={`
				px-6 py-4
				overflow-y-auto
				flex-1
				${className}
			`.trim()}
			{...rest}
		>
			{children}
		</div>
	);
}

interface DialogFooterProps extends ComponentPropsWithoutRef<"div"> {
	children?: ReactNode;
}

/**
 * DialogFooter component - Footer section for actions
 */
function DialogFooter(props: DialogFooterProps) {
	const { children, className = "", ...rest } = props;

	if (!children) return null;

	return (
		<div
			className={`
				flex items-center justify-end gap-2
				px-6 py-4
				border-t border-border
				${className}
			`.trim()}
			{...rest}
		>
			{children}
		</div>
	);
}

export { Dialog, DialogContent, DialogFooter, DialogTitle };
export type {
	DialogContentProps,
	DialogFooterProps,
	DialogProps,
	DialogTitleProps,
};
