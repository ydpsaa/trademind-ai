import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".claude/**",
    "out/**",
    "build/**",
    ".quant-build/**",
    "preview/quant-lab.bundle.js",
    "next-env.d.ts",
  ]),
  {
    files: ["scripts/build-preview.cjs", "tests/*.test.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);

export default eslintConfig;
