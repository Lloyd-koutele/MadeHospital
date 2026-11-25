import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

// Frontières entre modules : un module n'importe un autre module que par son point d'entrée
// public (@/modules/<module>), jamais par ses fichiers internes.
const frontieresModules = {
  'no-restricted-imports': ['warn', {
    patterns: [{
      group: ['@/modules/*/*'],
      message: 'Importer un autre module via son index (@/modules/<module>), pas ses fichiers internes.',
    }],
  }],
};

export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...frontieresModules,
      // Migration TypeScript progressive : les "any" hérités de la version JavaScript sont signalés, pas bloquants
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
);
