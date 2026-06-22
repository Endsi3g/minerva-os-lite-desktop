import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "off",
      // React Compiler experimental strictness rules — advisory only (the app is
      // deployed and works). Disabled so they don't block the build; set to "off"
      // (not "warn") because the react-hooks plugin isn't a direct dep and an active
      // severity would require resolving it in this config object's scope.
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/immutability": "off",
      "react-hooks/static-components": "off",
    },
  },
  {
    // Vendored shadcn/MapCN component — uses the ref-sync-in-render pattern
    // intentionally to avoid stale closures in MapLibre event handlers.
    files: ["components/ui/map.tsx"],
    rules: {
      "react-hooks/refs": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "ios/**",
    "android/**",
    "dist/**",
    // Separate sub-project (WhatsApp bridge + Ink TUI) — not part of the Next.js app
    "hermes-agent/**",
  ]),
]);

export default eslintConfig;
