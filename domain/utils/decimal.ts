import { Prisma } from "@/prisma/generated/client";
import { KnownError } from "./errors";

/**
 * Validates that a string is a valid decimal format.
 * Allows integers and decimals with optional leading/trailing zeros.
 */
export function isValidDecimalString(value: string): boolean {
	if (typeof value !== "string" || value.trim() === "") {
		return false;
	}

	// Match valid decimal: optional sign, digits, optional decimal point with digits
	// Examples: "123", "123.45", "0.5", "-100.99"
	const decimalRegex = /^-?\d+(\.\d+)?$/;
	return decimalRegex.test(value.trim());
}

/**
 * Parses a string to Prisma Decimal, validating the format.
 * @throws KnownError if the string is not a valid decimal
 */
export function parseDecimal(value: string): Prisma.Decimal {
	if (!isValidDecimalString(value)) {
		throw new KnownError(`Invalid decimal format: ${value}`);
	}

	try {
		return new Prisma.Decimal(value.trim());
	} catch {
		throw new KnownError(`Failed to parse decimal: ${value}`);
	}
}

/**
 * Validates that a Decimal value has the correct number of decimal places
 * based on the currency's minorUnits.
 * @param value - The Decimal value to validate
 * @param minorUnits - The number of decimal places allowed (from currency.minorUnits)
 * @returns true if valid, false otherwise
 */
export function validateDecimalPlaces(
	value: Prisma.Decimal,
	minorUnits: number,
): boolean {
	if (minorUnits < 0) {
		return false;
	}

	const decimalPlaces = value.decimalPlaces();
	return decimalPlaces <= minorUnits;
}

/**
 * Converts a Prisma Decimal to a string for API responses.
 * This ensures consistent serialization.
 */
export function decimalToString(value: Prisma.Decimal): string {
	return value.toString();
}

/**
 * Validates that a decimal string is positive (greater than zero).
 */
export function isPositiveDecimal(value: string): boolean {
	try {
		const decimal = parseDecimal(value);
		return decimal.gt(0);
	} catch {
		return false;
	}
}
