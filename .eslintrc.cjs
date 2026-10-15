module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: ["eslint:recommended"],
  plugins: ["react"],
  parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
  rules: {
    "react/jsx-uses-react": "error",
    "react/jsx-uses-vars": "error",
    "react/jsx-no-undef": "error",
    "no-unused-vars": ["warn", { args: "none", caughtErrors: "none", varsIgnorePattern: "^_" }],
    "no-empty": ["error", { allowEmptyCatch: true }],
  },
  ignorePatterns: ["dist/", "android/", "backend-patient-mobile-patch/", "QELCare-APK/"],
};
