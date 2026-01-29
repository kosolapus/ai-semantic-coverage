// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import markdown from '@eslint/markdown';

const config = [
  eslint.configs.recommended,
  eslintPluginPrettierRecommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },

      sourceType: 'module',
      parserOptions: {
        allowDefaultProject: ['*.mjs, *.ts'],
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  markdown.configs.recommended,

  {
    rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-floating-promises': 'warn',
        '@typescript-eslint/no-unsafe-argument': 'warn'
    },
  },
];

console.log(config);
export default tseslint.config(...config);
