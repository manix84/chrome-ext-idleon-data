import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const extensionGlobals = {
  ...globals.browser,
  chrome: "readonly",
  templateData: "readonly",
  classNumberMap: "readonly",
  classIndexMap: "readonly",
  itemMap: "readonly",
  obolNameMap: "readonly",
  mobMap: "readonly",
  cardEquipMap: "readonly",
  talentMap: "readonly",
  cardLevelMap: "readonly",
  cardSetMap: "readonly",
  charClassMap: "readonly",
  charSubclassMap: "readonly",
  classTalentMap: "readonly",
  classTalentPageMap: "readonly",
  fishingBaitMap: "readonly",
  fishingLineMap: "readonly",
  largeBubbleMap: "readonly",
  skillIndexMap: "readonly",
  starSignMap: "readonly",
  mapLookup: "readonly",
  getStarLevelFromCard: "readonly",
  getAnyFieldValue: "readonly",
  condenseRawArray: "readonly",
  condenseTwoRawArrays: "readonly",
  formObolData: "readonly",
  findHighestOfEachClass: "readonly",
  findHighestInStorage: "readonly",
  parseIntMapFields: "readonly",
  createRefineryData: "readonly",
  fillCharacterData: "readonly",
  parseData: "readonly",
  getFamilyCsv: "readonly",
  getGuildCsv: "readonly",
  getCharacterCsv: "readonly",
  guildExportCsv: "readonly",
  parseAnyData: "readonly",
  v: "readonly",
  d: "readonly",
  l: "readonly",
  ae: "readonly",
};

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["tools/**/*.mjs", "scripts/**/*.mjs", "test/**/*.mjs", "eslint.config.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.node,
      sourceType: "module",
    },
  },
  {
    files: ["src/js/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: extensionGlobals,
      parser: tseslint.parser,
      sourceType: "script",
    },
    rules: {
      "no-var": "error",
      "no-redeclare": "off",
      "prefer-arrow-callback": "error",
      "prefer-const": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/triple-slash-reference": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
    },
  },
  {
    files: ["src/**/*.d.ts"],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      "no-var": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
];
