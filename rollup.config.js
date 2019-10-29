import cleanup from "rollup-plugin-cleanup";
import commonjs from "rollup-plugin-commonjs";
import resolve from "rollup-plugin-node-resolve";

export default {
  input: "./lib/index.js",
  output: [
    {
      file: "./dist/redux-advanced.js",
      format: "cjs"
    },
    {
      file: "./dist/redux-advanced.esm.js",
      format: "esm"
    }
  ],
  plugins: [resolve(), commonjs(), cleanup({ comments: "none" })],
  external: ["redux", "redux-observable", "rxjs", "rxjs/operators", "immer"]
};
