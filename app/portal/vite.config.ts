import { reactRouter } from "@react-router/dev/vite";
import deno from "@deno/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
// import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [ tailwindcss(),reactRouter(), deno(),],
  environments: {
    ssr: {
      build: {
        target: "ESNext",
      },
      resolve: {
        conditions: ["deno"],
        externalConditions: ["deno"],
      },
    },
  },
});
