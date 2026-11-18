import { transformAsync } from "@babel/core";
import type { Plugin } from "vite";

/**
 * Runs the React Compiler's Babel plugin on the client modules `include`
 * matches, so their tests see the memoization the app gets from
 * `reactCompiler: true` (the app builds with the compiler's native port).
 * Without it, a component that misses a state change only under the compiler
 * still passes its tests. Any compiler bailout fails the transform.
 */
export function reactCompilerInTests(include: RegExp): Plugin {
  return {
    name: "hub:react-compiler-in-tests",
    enforce: "pre",
    async transform(code, id) {
      const file = id.split("?")[0];
      // Tests call server components as plain async functions, outside React.
      const isClientModule = /^\s*["']use client["']/.test(code);
      if (
        file.includes("/node_modules/") ||
        !include.test(file) ||
        !isClientModule
      ) {
        return null;
      }

      const result = await transformAsync(code, {
        filename: file,
        babelrc: false,
        configFile: false,
        parserOpts: { plugins: ["typescript", "jsx"] },
        plugins: [
          ["babel-plugin-react-compiler", { panicThreshold: "all_errors" }],
        ],
        sourceMaps: true,
      });
      if (!result?.code) {
        throw new Error(`React Compiler returned no code for ${file}`);
      }
      return { code: result.code, map: result.map };
    },
  };
}
