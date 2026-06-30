/// <reference path="../globals.d.ts" />

const characterFieldPattern = /^(.*)_(\d+)$/;

interface NormalizedCharacterRawData {
    index: number;
    name: string;
    fields: Record<string, DynamicValue>;
}

/** Groups Idleon raw save fields that end in _N into a per-character structure. */
const normalizeCharacterRawData = (fields: IdleonFields, charNames: string[]): NormalizedCharacterRawData[] => {
    const normalizedCharacters = charNames.map((name, index) => ({
        index,
        name,
        fields: {} as Record<string, DynamicValue>
    }));
    const fieldNames = Object.keys(fields);

    for (const fieldName of fieldNames) {
        const characterFieldMatch = characterFieldPattern.exec(fieldName);
        if (characterFieldMatch == null) {
            continue;
        }

        const baseFieldName = characterFieldMatch[1];
        const characterIndex = Number.parseInt(characterFieldMatch[2], 10);
        const characterData = normalizedCharacters[characterIndex];
        if (characterData == null) {
            continue;
        }

        characterData.fields[baseFieldName] = fields[fieldName];
    }

    return normalizedCharacters;
};

/** Reads an account-level raw field while keeping the parser call sites typed. */
const getRawField = (fields: IdleonFields, fieldName: string): DynamicValue => {
    return fields[fieldName];
};

/** Reads a character-level raw field from normalized character data. */
const getCharacterRawField = (characterData: NormalizedCharacterRawData, fieldName: string): DynamicValue => {
    return characterData.fields[fieldName];
};

/** Parses a JSON-encoded Idleon field and returns the requested type. */
const parseJsonField = <T>(value: unknown): T => {
    if (typeof value !== "string") {
        if (value === null || value === undefined) {
            throw new Error("Expected a JSON string or parsed JSON value.");
        }

        return value as T;
    }

    return JSON.parse(value) as T;
};

export {
    getCharacterRawField,
    getRawField,
    normalizeCharacterRawData,
    parseJsonField
};
export type { NormalizedCharacterRawData };
