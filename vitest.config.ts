import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    // Node test environment (server-side auth/database logic).
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    server: {
      deps: {
        // Process `next-auth` through Vite so the `next/server` alias above
        // applies to its internal imports (node_modules are externalized by
        // default, which bypasses the alias).
        inline: [/next-auth/, /@auth\//],
      },
    },
  },
  resolve: {
    alias: {
      // Match the `@/*` -> `./src/*` alias declared in tsconfig.json.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // next-auth imports the bare specifier `next/server`, which Vitest's
      // resolver does not map to the package's `./server` export in a Node
      // (non-Next) environment. Point it at the real file so importing the
      // Auth.js config module works under Vitest.
      "next/server": fileURLToPath(
        new URL("./node_modules/next/server.js", import.meta.url),
      ),
    },
  },
});
