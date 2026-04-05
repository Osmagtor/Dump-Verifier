import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import jsdoc from 'eslint-plugin-jsdoc';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
	globalIgnores([
		'node_modules/**',
		'vendor/**',
		'public/js/**',
		'cypress.config.cjs',
	]),
	{
		files: ['**/*.ts'],
		plugins: { js },
		extends: ['js/recommended'],
		languageOptions: {
			globals: globals.node,
			parser: tseslint.parser,
			parserOptions: {
				project: ['./tsconfig.json'],
			},
		},
		rules: {
			'@typescript-eslint/typedef': [
				'error',
				{
					parameter: true,
					propertyDeclaration: true,
					variableDeclaration: true,
					arrowParameter: true,
					arrayDestructuring: true,
					memberVariableDeclaration: true,
					objectDestructuring: true,
				},
			],
			'require-await': 'off',
			'@typescript-eslint/require-await': 'error',
			'@typescript-eslint/prefer-find': 'error',
			'@typescript-eslint/no-empty-object-type': 'error',
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-for-in-array': 'error',
			'@typescript-eslint/array-type': 'error',
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/method-signature-style': 'error',
			'@typescript-eslint/no-confusing-void-expression': 'error',
			'@typescript-eslint/prefer-for-of': 'error',
			'@typescript-eslint/prefer-includes': 'error',
			'@typescript-eslint/prefer-optional-chain': 'error',
			'@typescript-eslint/prefer-readonly': 'error',
			'@typescript-eslint/prefer-string-starts-ends-with': 'error',
			'@typescript-eslint/promise-function-async': 'error',
			'@typescript-eslint/related-getter-setter-pairs': 'error',
			'@typescript-eslint/restrict-plus-operands': 'error',
			'@typescript-eslint/switch-exhaustiveness-check': 'error',
			'@typescript-eslint/prefer-nullish-coalescing': 'error',
			'@typescript-eslint/explicit-function-return-type': [
				'error',
				{
					allowExpressions: false,
					allowTypedFunctionExpressions: false,
					allowHigherOrderFunctions: false,
					allowDirectConstAssertionInArrowFunctions: false,
				},
			],
		},
	},
	tseslint.configs.recommended,
	{
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/naming-convention': 'off',
			'@typescript-eslint/no-unused-expressions': 'off',
		},
	},
	{
		plugins: { jsdoc },
		rules: {
			'jsdoc/require-jsdoc': [
				'error',
				{
					require: {
						FunctionDeclaration: true,
						MethodDefinition: true,
						ClassDeclaration: false,
						ArrowFunctionExpression: true,
						FunctionExpression: true,
					},
				},
			],
		},
	},
]);
