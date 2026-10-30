// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "dist-web/*", "docs/*", "scripts/.paces.bundle.js"],
  },
  {
    files: ["scripts/**/*.js", "*.config.js"],
    languageOptions: { globals: { __dirname: "readonly", require: "readonly", module: "readonly", process: "readonly" } },
  },
]);
