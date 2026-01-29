import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
	{ files: ["**/*.{ts}"] },
	{ languageOptions: { globals: globals.node } },
	{ ignores: ["babel.config.js", "eslint.config.mjs", "jest.config.js", "./origin/src/youtube_dl/PATCH/sax/sax.js", "./origin/src/manga_reader/deob.js", "./origin/src/manga_reader/deob2.js", ".expo", "node_modules", "lib-origin", "scripts", "public", "patches", "ios", "c_sources", "assets", ".vscode"] },
	pluginJs.configs.recommended,
	...tseslint.configs.all,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			}
		}
	},
	{
		rules: {
			"@typescript-eslint/no-redundant-type-constituents": "off",
			"@typescript-eslint/no-empty-function": "off",
			"@typescript-eslint/strict-void-return": "off",
			"@typescript-eslint/no-var-requires": "off",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/only-throw-error": "error",
			"@typescript-eslint/no-namespace": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-expressions": "off",
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/no-require-imports": "off",
			"no-useless-escape": "off",
			"no-empty": "off",
			"no-prototype-builtins": "off",
			"no-setter-return": "off",
			"@typescript-eslint/no-this-alias": "off",
			"no-misleading-character-class": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-argument": "off", // TURN THIS ON
			"@typescript-eslint/require-await": "off",
			"@typescript-eslint/restrict-template-expressions": "off",
			"@typescript-eslint/no-magic-numbers": "off",
			"@typescript-eslint/explicit-module-boundary-types": "off",
			"@typescript-eslint/naming-convention": [
				"off",
				{
					selector: "default",
					format: ["snake_case"]
				},
				{
					selector: ["variable", "classProperty"],
					format: ["snake_case", "UPPER_CASE"],
					leadingUnderscore: "allow"
				},
				{
					selector: "function",
					format: ["snake_case"],
					leadingUnderscore: "allow"
				},
				{
					selector: "typeLike",
					format: ["PascalCase"],
					leadingUnderscore: "allow"
				},
				{
					selector: "enumMember",
					format: ["UPPER_CASE"]
				}
			],
			"@typescript-eslint/explicit-function-return-type": "off",
			"@typescript-eslint/prefer-readonly-parameter-types": "off", // I should maybe enable this
			"@typescript-eslint/no-non-null-assertion": "off",
			"@typescript-eslint/no-unsafe-type-assertion": "off",
			"@typescript-eslint/no-unnecessary-condition": "warn",
			"@typescript-eslint/prefer-destructuring": "off",
			"@typescript-eslint/consistent-return": "off",
			"@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
			"@typescript-eslint/strict-boolean-expressions": "off",
			"@typescript-eslint/max-params": "off",
			"@typescript-eslint/init-declarations": "off",
			"@typescript-eslint/non-nullable-type-assertion-style": "off",
			"@typescript-eslint/return-await": "off",
			"@typescript-eslint/consistent-type-imports": "error",
			"@typescript-eslint/no-unnecessary-condition": "off",
			"@typescript-eslint/prefer-nullish-coalescing": "off",
			"@typescript-eslint/explicit-member-accessibility": "off",
			"@typescript-eslint/no-unnecessary-type-parameters": "off",
			"@typescript-eslint/no-use-before-define": "off",
			"@typescript-eslint/no-loop-func": "off", // CHECK THIS
			"@typescript-eslint/no-confusing-void-expression": "off",
			"@typescript-eslint/no-dynamic-delete": "off",
			"@typescript-eslint/require-array-sort-compare": "off",
			"@typescript-eslint/class-methods-use-this": "off",
			"@typescript-eslint/no-misused-promises": "off",
			"@typescript-eslint/ban-types": "off"
		}
	}
];
