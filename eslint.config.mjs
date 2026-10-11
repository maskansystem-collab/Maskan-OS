/**
 * eslint-config-next 16 ships real flat configs, so they are imported
 * directly. Routing them through FlatCompat (the eslint 8 shim) makes
 * ESLint crash with "Converting circular structure to JSON" before it
 * lints a single file — which silently meant `npm run lint` had been
 * reporting nothing at all.
 */
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
  ...nextCoreWebVitals,
  ...nextTypescript,
  { ignores: ["demo/**", ".next/**", "node_modules/**"] },
];
