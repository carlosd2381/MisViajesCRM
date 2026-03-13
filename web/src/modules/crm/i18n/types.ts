export type DictionaryValue = string | string[] | { [key: string]: DictionaryValue };
export type Dictionary = Record<string, DictionaryValue>;
