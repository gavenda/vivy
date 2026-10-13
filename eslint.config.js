import EslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import TSESLint from 'typescript-eslint';

const CustomRules = {
  rules: {
    '@typescript-eslint/no-unsafe-argument': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-misused-promises': 'off',
    // Relative imports stay within a directory, anything else goes through the 'vivy/*' alias.
    // The package manifest sits outside of src, the alias can't reach it.
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            regex: '^\\.\\./(?!package\\.json$)',
            message: "Import across directories with the 'vivy/*' alias instead of a parent-relative path."
          }
        ]
      }
    ]
  }
};

const PerformanceParser = {
  languageOptions: {
    parserOptions: {
      project: true,
      tsconfigRootDir: import.meta.dirname
    }
  }
};

const NoTypeCheckOnJavascript = {
  files: ['**/*.js'],
  ...TSESLint.configs.disableTypeChecked
};

/** @type {import('@typescript-eslint/utils').TSESLint.FlatConfig.ConfigFile} */
export default [
  ...TSESLint.configs.recommendedTypeChecked,
  PerformanceParser,
  CustomRules,
  NoTypeCheckOnJavascript,
  EslintPluginPrettierRecommended
];
