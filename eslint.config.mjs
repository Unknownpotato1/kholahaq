/**
 * ESLint config for Gomen.
 *
 * - scripts/ are CommonJS-style quick utilities that legitimately use
 *   require(); they're excluded from the no-require-imports rule.
 * - examples/ and pre-existing shadcn ui components are not linted by us.
 * - The "react-hooks/set-state-in-effect" warning fires on the well-known
 *   mounted-flag pattern used by next-themes; we keep that pattern by design.
 */
import next from "eslint-config-next";

const config = [
  ...next,
  {
    ignores: [
      "scripts/**",
      "examples/**",
      ".next/**",
      "node_modules/**",
      "src/components/ui/**",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
