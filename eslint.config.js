export default [
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2021, sourceType: 'module' },
    linterOptions: { reportUnusedDisableDirectives: true },
    rules: {
      'no-console': 'off'
    }
  }
];
