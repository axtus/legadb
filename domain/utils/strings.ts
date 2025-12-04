export function orPlural(n: number, singular: string, plural: string) {
	return n === 1 ? singular : plural;
}
