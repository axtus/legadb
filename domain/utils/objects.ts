type CamelToSnake<S extends string> = S extends `${infer T}${infer U}`
	? T extends Lowercase<T> ? `${T}${CamelToSnake<U>}`
	: `_${Lowercase<T>}${CamelToSnake<U>}`
	: S;

type KeysCamelToSnake<T> = {
	[K in keyof T as K extends string ? CamelToSnake<K> : K]: T[K];
};

export const Objects = {
	keysCamelToSnake<O extends Record<string, any>>(obj: O): KeysCamelToSnake<O> {
		const result: any = {};
		for (const key in obj) {
			const snakeKey = key.replace(
				/[A-Z]/g,
				(letter) => `_${letter.toLowerCase()}`,
			);
			result[snakeKey] = obj[key];
		}
		return result;
	},
};
