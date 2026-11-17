import globals from 'globals';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import unusedImports from 'eslint-plugin-unused-imports';

const SOURCE = [
	'app/**/*.{ts,tsx}',
	'components/**/*.{ts,tsx}',
	'hooks/**/*.{ts,tsx}',
	'screens/**/*.{ts,tsx}',
	'utils/**/*.{ts,tsx}',
	'index.ts'
];

export default tseslint.config(
	{
		ignores: [
			'**/node_modules/**',
			'app/(tabs)/*/(shared)/**',
			'utils/gen_changelog.ts',
			'lib-origin/**',
			'.expo/**',
			'android/**',
			'ios/**',
			'assets/**',
			'builds/**',
			'c_sources/**',
			'nodejs-assets/**',
			'patches/**',
			'public/**',
			'scripts/**',
			'stubs/**'
		]
	},
	{
		files: SOURCE,
		extends: [
			js.configs.recommended,
			...tseslint.configs.strictTypeChecked,
			...tseslint.configs.stylisticTypeChecked,
			stylistic.configs.customize({
				indent: 'tab',
				quotes: 'single',
				semi: true,
				jsx: true,
				arrowParens: false,
				braceStyle: '1tbs',
				blockSpacing: true,
				commaDangle: 'never'
			})
		],
		languageOptions: {
			globals: globals.node,
			parserOptions: {
				projectService: true,
				jsxPragma: null,
				tsconfigRootDir: import.meta.dirname
			}
		},
		plugins: {
			'unused-imports': unusedImports
		},
		rules: {
			'@stylistic/no-extra-semi': 'error',
			'@stylistic/max-statements-per-line': 'off',
			'@stylistic/multiline-ternary': ['error', 'always-multiline', { ignoreJSX: true }],
			'@typescript-eslint/only-throw-error': 'error',
			'@typescript-eslint/restrict-template-expressions': 'off',
			'@typescript-eslint/restrict-plus-operands': 'off',
			'@typescript-eslint/no-unnecessary-type-parameters': 'off',
			'@typescript-eslint/return-await': 'off',
			'@typescript-eslint/consistent-type-imports': 'error',
			'@typescript-eslint/switch-exhaustiveness-check': [
				'error',
				{ considerDefaultExhaustiveForUnions: true }
			],
			'eqeqeq': ['error', 'always', { null: 'ignore' }],
			'@typescript-eslint/no-unused-vars': 'off',
			'unused-imports/no-unused-imports': 'error',
			'unused-imports/no-unused-vars': [
				'warn',
				{
					vars: 'all',
					varsIgnorePattern: '^_',
					args: 'after-used',
					argsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
				}
			],
			'@typescript-eslint/no-namespace': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-expressions': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',
			'@typescript-eslint/no-unsafe-type-assertion': 'off',
			'@typescript-eslint/no-unnecessary-condition': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-misused-promises': 'off',
			'@typescript-eslint/no-confusing-void-expression': 'off',
			'@typescript-eslint/no-dynamic-delete': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/prefer-nullish-coalescing': 'off',
			'@typescript-eslint/non-nullable-type-assertion-style': 'off',
			'@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
			'no-empty': 'off',
			'no-empty-function': 'off',
			'no-prototype-builtins': 'off',
			'no-setter-return': 'off',
			'no-misleading-character-class': 'off'
		}
	}
);
