export default [
  {
    files: ['**/*.jsx', '**/*.js'],
    languageOptions: { ecmaVersion: 2021, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
    settings: { react: { version: '18.0' } },
    rules: {}
  }
];
