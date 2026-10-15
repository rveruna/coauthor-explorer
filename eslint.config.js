import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['coverage', 'dist', 'node_modules', 'perf/results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-console': 'error',
      // A scrollable region must be focusable so keyboard users can scroll it
      'jsx-a11y/no-noninteractive-tabindex': ['error', { roles: ['tabpanel', 'region', 'application'] }],
    },
  },
  {
    files: ['perf/**/*.mjs', 'scripts/**/*.mjs', '*.config.{js,ts}'],
    languageOptions: { globals: { ...globals.node, fetch: 'readonly', URL: 'readonly' } },
    rules: { 'no-console': 'off' },
  },
  prettier,
);
